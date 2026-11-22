import { app, ipcMain } from "electron";
import { listarImpresoras } from "./impresoras.js";
import { crearPrinterService } from "./printerService.js";
import type { PrinterConfig } from "./types.js";
import { validarRecibo } from "./validarRecibo.js";

/** Nombres de canal. El preload (.cts, sin imports locales) repite estos literales. */
export const CANALES = {
  imprimirRecibo: "printer:imprimir-recibo",
  imprimirPrueba: "printer:imprimir-prueba",
  getConfig: "printer:get-config",
  setConfig: "printer:set-config",
  listar: "printer:listar",
} as const;

type Respuesta<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

// ------------------------------------------------------------------ handlers

function mensaje(e: unknown): string {
  return e instanceof Error ? e.message : "Error desconocido al imprimir.";
}

/** Convierte cualquier excepción en { ok:false }: al renderer nunca le llega un throw. */
async function seguro<T extends object = object>(tarea: () => Promise<T | void> | T | void): Promise<Respuesta<T>> {
  try {
    const extra = await tarea();
    return { ok: true, ...(extra ?? {}) } as Respuesta<T>;
  } catch (e) {
    console.error("[printing]", e);
    return { ok: false, error: mensaje(e) };
  }
}

export function registerPrinterIpc(): void {
  // app.getPath('userData') solo es fiable una vez creada la app; los handlers se
  // ejecutan después, así que se resuelve de forma perezosa.
  const servicio = crearPrinterService(app.getPath("userData"));

  // Se imprime el recibo GUARDADO por el backend (ingreso, pago, mensualidad o cierre de caja).
  ipcMain.handle(CANALES.imprimirRecibo, (_e, payload: unknown) =>
    seguro(() => servicio.imprimirRecibo(validarRecibo(payload))),
  );
  ipcMain.handle(CANALES.imprimirPrueba, () => seguro(() => servicio.imprimirPrueba()));
  ipcMain.handle(CANALES.listar, () =>
    seguro<{ impresoras: string[] }>(async () => ({ impresoras: await listarImpresoras() })),
  );
  ipcMain.handle(CANALES.getConfig, () =>
    seguro<{ config: PrinterConfig }>(() => ({ config: servicio.getConfig() })),
  );
  ipcMain.handle(CANALES.setConfig, (_e, payload: unknown) =>
    seguro<{ config: PrinterConfig }>(() => ({ config: servicio.setConfig(payload) })),
  );
}
