/**
 * Espejo de electron/printing/types.ts (fuente de verdad) para la configuración de la impresora.
 * Los recibos viven en shared/types/recibo.ts. Son dos proyectos TypeScript separados
 * (src vs electron), así que se duplican a propósito; si cambias uno, cambia el otro.
 */

export type TipoVehiculo = "carro" | "moto";
export type ModoImpresion = "usb" | "dump";

export interface EncabezadoParqueadero {
  nombre: string;
  nit: string;
  /** Varias líneas (una por renglón), ej. "LUNES A VIERNES 6 AM A 8 PM". */
  horario: string;
  direccion: string;
  telefono: string;
  /** Resolución de numeración DIAN (opcional, varias líneas). */
  resolucionDian: string;
}

export interface PrinterConfig {
  modo: ModoImpresion;
  /** Nombre de la impresora instalada en Windows. */
  impresora: string;
  characterSet: string;
  abrirCajon: boolean;
  encabezado: EncabezadoParqueadero;
  piePagina: string;
}

export type ResultadoImpresion = { ok: true } | { ok: false; error: string };
export type ResultadoImpresoras = { ok: true; impresoras: string[] } | { ok: false; error: string };
export type ResultadoConfig = { ok: true; config: PrinterConfig } | { ok: false; error: string };

/** Juegos de caracteres para español, para el selector. PC858_EURO es el primero a probar. */
export const CHARACTER_SETS_SUGERIDOS: { valor: string; etiqueta: string }[] = [
  { valor: "PC858_EURO", etiqueta: "PC858 (Latín 1 + €)" },
  { valor: "PC850_MULTILINGUAL", etiqueta: "PC850 (Multilingüe)" },
  { valor: "WPC1252", etiqueta: "WPC1252 (Windows Latín 1)" },
  { valor: "PC437_USA", etiqueta: "PC437 (USA)" },
  { valor: "PC852_LATIN2", etiqueta: "PC852 (Latín 2)" },
];
