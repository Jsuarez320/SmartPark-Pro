/**
 * Tipos del subsistema de impresión (proceso main).
 *
 * Fuente de verdad. El renderer tiene un espejo en src/shared/printing/types.ts
 * (los dos tsconfig son proyectos separados); si cambias uno, cambia el otro.
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

/**
 * Recibo de ENTRADA para clientes diarios (sin tarjeta). Fechas en ISO 8601.
 * Los mensuales usan tarjeta física y no imprimen este recibo.
 */
export interface IngresoData {
  /** Número del tiquete, ej. "D-000123". */
  tiquete: string;
  horaEntrada: string;
  tipoVehiculo: TipoVehiculo;
  placa: string;
  marca?: string;
  /** Nombre del plan elegido, ej. "Bloque 15 min". */
  plan: string;
  /** Valor de la tarifa del plan (pesos COP enteros). */
  tarifa: number;
  /** Opcional: "01 CAJERO 01". */
  cajero?: string;
}

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
  /** Nombre de la impresora instalada en Windows (cola de impresión), ej. "STAR-TP80NC-M". */
  impresora: string;
  /** Clave de CharacterSet de node-thermal-printer, ej. "PC858_EURO". */
  characterSet: string;
  abrirCajon: boolean;
  encabezado: EncabezadoParqueadero;
  piePagina: string;
}

/**
 * Destino físico (o simulado) de un buffer ESC/POS.
 * El ticketBuilder no sabe nada de esto: un futuro EscPosRedProvider (TCP 9100)
 * solo necesita implementar esta interfaz.
 */
export interface PrinterProvider {
  imprimir(buffer: Buffer): Promise<void>;
}

export type Resultado = { ok: true } | { ok: false; error: string };
