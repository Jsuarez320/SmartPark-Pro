/**
 * Espejo de electron/printing/types.ts (fuente de verdad).
 * Son dos proyectos TypeScript separados (src vs electron), así que se duplican
 * a propósito; si cambias uno, cambia el otro.
 */

export type TipoVehiculo = "carro" | "moto";
export type ModoImpresion = "usb" | "dump";

/** Una fila de la tabla de conceptos cobrados. Dinero en pesos COP enteros. */
export interface ItemRecibo {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  /** Valor del IVA de la fila (no porcentaje). 0 si no aplica. */
  iva: number;
  total: number;
}

/** Datos del recibo ya listos para imprimir (sin lógica de negocio). Fechas en ISO 8601. */
export interface ReciboData {
  /** Número de factura, ej. "SP-000123". */
  numero: string;
  fechaEmision: string;
  /** Opcional: "01 CAJERO 01". Si falta, la línea no se imprime. */
  cajero?: string;
  /** Tiquete / tarjeta del ingreso. */
  tiquete?: string;
  horaEntrada: string;
  horaSalida: string;
  /** Si no hay cliente se imprime 222222222222 / CONSUMIDOR FINAL. */
  cedula?: string;
  nombre?: string;
  tipoVehiculo: TipoVehiculo;
  placa: string;
  marca?: string;
  /** Una fila por concepto cobrado (servicio, recargo, mensualidad...). */
  items: ItemRecibo[];
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago?: string;
}

/** Alias histórico. */
export type FacturaImpresion = ReciboData;

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
