/**
 * Tipos del subsistema de impresión (proceso main).
 *
 * Fuente de verdad. El renderer tiene un espejo en src/shared/printing/types.ts
 * (los dos tsconfig son proyectos separados); si cambias uno, cambia el otro.
 */

export type TipoVehiculo = "carro" | "moto";
export type ModoImpresion = "usb" | "dump";

/** Datos de una factura/tiquete listos para imprimir. Fechas en ISO 8601. */
export interface FacturaImpresion {
  numero: string;
  fechaEmision: string;
  placa: string;
  tipoVehiculo: TipoVehiculo;
  horaEntrada: string;
  horaSalida: string;
  /** Ya formateado por quien llama, ej. "2 h 15 min". */
  tiempoTotal: string;
  /** Ej. "Bloque 15 min" o "Día completo". */
  tarifaAplicada: string;
  /** Opcional, ej. "6 × $1.000". */
  detalleCobro?: string;
  /** Opcional: tarjeta/ficha asignada al vehículo. */
  tarjeta?: string;
  /** Pesos COP enteros, >= 0. */
  total: number;
  metodoPago: string;
}

export interface EncabezadoParqueadero {
  nombre: string;
  nit: string;
  direccion: string;
  telefono: string;
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
