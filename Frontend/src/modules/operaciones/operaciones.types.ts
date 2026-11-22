import type { MedioPago, ReciboApi, TipoVehiculo } from "@/shared/types/recibo";

export type { MedioPago, TipoVehiculo };

/** Una sola operación para entrada y salida: el sistema decide cuál según la placa. */
export interface RegistrarOperacionDatos {
  placa: string;
  /** Obligatorio solo si la placa es nueva. Si ya existe y se envía, debe coincidir con el registrado. */
  tipoVehiculo?: TipoVehiculo;
  /** Solo en una salida con valor a cobrar. Sin él, la salida queda pendiente de pago (no se guarda nada). */
  medioPago?: MedioPago;
  referencia?: string;
  /** Total que vio el empleado al confirmar; si el valor cambió (pasó a otra hora) el backend lo rechaza. */
  totalConfirmado?: number;
}

export interface TramoCobro {
  tipo: "normal" | "nocturna" | "festivo";
  horas: number;
  valorHora: number;
  subtotal: number;
}

export interface PeriodoCobro {
  inicio: string;
  fin: string;
  tramos: TramoCobro[];
  subtotal: number;
  tope: number;
  total: number;
  topeAplicado: boolean;
}

/** Desglose del cobro por horas. */
export interface CobroOperacion {
  tarifaId: number;
  minutosTotales: number;
  minutosCobrados: number;
  horasCobradas: number;
  total: number;
  topeAplicado: boolean;
  periodos: PeriodoCobro[];
}

export interface RespuestaOperacion {
  tipo: "entrada" | "salida";
  /** False solo en una salida con valor a cobrar a la que aún le falta el medio de pago. */
  registrado: boolean;
  requierePago: boolean;
  mensaje: string;
  aviso: string | null;
  placa: string;
  tipoVehiculo: TipoVehiculo;
  esMensualidad: boolean;
  ingresoId: string;
  salidaId: string | null;
  horaEntrada: string;
  horaSalida: string | null;
  cobro: CobroOperacion | null;
  medioPago: MedioPago | null;
  recibo: ReciboApi | null;
}

/** Salida con valor pendiente de medio de pago (vista previa). */
export type SalidaPendiente = RespuestaOperacion & { cobro: CobroOperacion };

export interface ItemPatio {
  ingresoId: string;
  placa: string;
  tipoVehiculo: TipoVehiculo;
  horaEntrada: string;
  minutos: number;
  esMensualidad: boolean;
  /** Número del recibo de ingreso (el tiquete entregado al cliente). */
  tiquete: number | null;
  cliente: string | null;
  /** Lo que se cobraría si saliera ahora (0 para mensualidades; null si no hay tarifa configurada). */
  valorEstimado: number | null;
}
