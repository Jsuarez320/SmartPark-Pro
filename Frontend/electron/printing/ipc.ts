import { app, ipcMain } from "electron";
import { listarImpresoras } from "./impresoras.js";
import { crearPrinterService } from "./printerService.js";
import type { ItemRecibo, PrinterConfig, ReciboData } from "./types.js";

/** Nombres de canal. El preload (.cts, sin imports locales) repite estos literales. */
export const CANALES = {
  imprimirFactura: "printer:imprimir-factura",
  imprimirPrueba: "printer:imprimir-prueba",
  getConfig: "printer:get-config",
  setConfig: "printer:set-config",
  listar: "printer:listar",
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

function opcional(obj: Record<string, unknown>, campo: string, max: number): string | undefined {
  return obj[campo] == null || obj[campo] === "" ? undefined : cadena(obj, campo, max);
}

function fechaIso(obj: Record<string, unknown>, campo: string): string {
  const v = cadena(obj, campo, 40);
  if (Number.isNaN(new Date(v).getTime())) throw new Error(`"${campo}" no es una fecha válida.`);
  return v;
}

function dinero(obj: Record<string, unknown>, campo: string): number {
  const v = obj[campo];
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1_000_000_000) {
    throw new Error(`"${campo}" debe ser un número entre 0 y 1.000.000.000.`);
  }
  return Math.round(v);
}

const MAX_ITEMS = 30;

function validarItem(raw: unknown, n: number): ItemRecibo {
  if (!esObjeto(raw)) throw new Error(`El ítem ${n + 1} debe ser un objeto.`);
  const cantidad = raw.cantidad;
  if (typeof cantidad !== "number" || !Number.isInteger(cantidad) || cantidad < 0 || cantidad > 99_999) {
    throw new Error(`"cantidad" del ítem ${n + 1} debe ser un entero entre 0 y 99.999.`);
  }
  return {
    descripcion: cadena(raw, "descripcion", 96),
    cantidad,
    valorUnitario: dinero(raw, "valorUnitario"),
    iva: dinero(raw, "iva"),
    total: dinero(raw, "total"),
  };
}

export function validarFactura(raw: unknown): ReciboData {
  if (!esObjeto(raw)) throw new Error("El recibo debe ser un objeto.");
  const { tipoVehiculo, items } = raw;
  if (tipoVehiculo !== "carro" && tipoVehiculo !== "moto") {
    throw new Error('"tipoVehiculo" debe ser "carro" o "moto".');
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    throw new Error(`"items" debe tener entre 1 y ${MAX_ITEMS} conceptos.`);
  }
  return {
    numero: cadena(raw, "numero", 32),
    fechaEmision: fechaIso(raw, "fechaEmision"),
    cajero: opcional(raw, "cajero", 40),
    tiquete: opcional(raw, "tiquete", 40),
    horaEntrada: fechaIso(raw, "horaEntrada"),
    horaSalida: fechaIso(raw, "horaSalida"),
    cedula: opcional(raw, "cedula", 20),
    nombre: opcional(raw, "nombre", 60),
    tipoVehiculo,
    placa: cadena(raw, "placa", 12),
    marca: opcional(raw, "marca", 30),
    items: items.map(validarItem),
    subtotal: dinero(raw, "subtotal"),
    descuento: dinero(raw, "descuento"),
    total: dinero(raw, "total"),
    metodoPago: opcional(raw, "metodoPago", 32),
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
