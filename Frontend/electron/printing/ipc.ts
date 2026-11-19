import { app, ipcMain } from "electron";
import { crearPrinterService } from "./printerService.js";
import type { FacturaImpresion, PrinterConfig } from "./types.js";

/** Nombres de canal. El preload (.cts, sin imports locales) repite estos literales. */
export const CANALES = {
  imprimirFactura: "printer:imprimir-factura",
  imprimirPrueba: "printer:imprimir-prueba",
  getConfig: "printer:get-config",
  setConfig: "printer:set-config",
} as const;

type Respuesta<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

// ---------------------------------------------------------------- validación
// Nunca se confía en el renderer: todo lo que llega por IPC se revalida aquí.

const MAX_TEXTO = 100;

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function cadena(obj: Record<string, unknown>, campo: string, max = MAX_TEXTO): string {
  const v = obj[campo];
  if (typeof v !== "string") throw new Error(`"${campo}" debe ser texto.`);
  if (v.trim() === "") throw new Error(`"${campo}" no puede estar vacío.`);
  if (v.length > max) throw new Error(`"${campo}" supera ${max} caracteres.`);
  return v;
}

function fechaIso(obj: Record<string, unknown>, campo: string): string {
  const v = cadena(obj, campo, 40);
  if (Number.isNaN(new Date(v).getTime())) throw new Error(`"${campo}" no es una fecha válida.`);
  return v;
}

export function validarFactura(raw: unknown): FacturaImpresion {
  if (!esObjeto(raw)) throw new Error("La factura debe ser un objeto.");
  const { tipoVehiculo, total } = raw;
  if (tipoVehiculo !== "carro" && tipoVehiculo !== "moto") {
    throw new Error('"tipoVehiculo" debe ser "carro" o "moto".');
  }
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0 || total > 1_000_000_000) {
    throw new Error('"total" debe ser un número entre 0 y 1.000.000.000.');
  }
  return {
    numero: cadena(raw, "numero", 32),
    fechaEmision: fechaIso(raw, "fechaEmision"),
    placa: cadena(raw, "placa", 12),
    tipoVehiculo,
    horaEntrada: fechaIso(raw, "horaEntrada"),
    horaSalida: fechaIso(raw, "horaSalida"),
    tiempoTotal: cadena(raw, "tiempoTotal", 32),
    tarifaAplicada: cadena(raw, "tarifaAplicada", 48),
    total,
    metodoPago: cadena(raw, "metodoPago", 32),
  };
}

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

  ipcMain.handle(CANALES.imprimirFactura, (_e, payload: unknown) =>
    seguro(() => servicio.imprimirFactura(validarFactura(payload))),
  );
  ipcMain.handle(CANALES.imprimirPrueba, () => seguro(() => servicio.imprimirPrueba()));
  ipcMain.handle(CANALES.getConfig, () =>
    seguro<{ config: PrinterConfig }>(() => ({ config: servicio.getConfig() })),
  );
  ipcMain.handle(CANALES.setConfig, (_e, payload: unknown) =>
    seguro<{ config: PrinterConfig }>(() => ({ config: servicio.setConfig(payload) })),
  );
}
