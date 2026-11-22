import type { Jornada, MedioPago, PeriodoMensualidad, ReciboApi, TipoVehiculo } from "@/shared/types/recibo";

export type { Jornada, MedioPago, PeriodoMensualidad, TipoVehiculo };

export type EstadoMensualidad = "vigente" | "por_vencer" | "vencida";

/** Mensualidad con su periodo actual y su estado. Pesos COP, fechas "YYYY-MM-DD". */
export interface Mensualidad {
  /** Id del periodo actual. Sirve en detalle, edición y renovación mientras no se renueve. */
  id: string;
  cliente: string;
  celular: string | null;
  placa: string;
  placaAlterna: string | null;
  tipoVehiculo: TipoVehiculo;
  tarjeta: string | null;
  periodo: PeriodoMensualidad;
  jornada: Jornada;
  fechaInicio: string;
  fechaFin: string;
  /** Días que faltan para el vencimiento (negativo si ya venció). */
  diasRestantes: number;
  estado: EstadoMensualidad;
  valorPagado: number;
}

export interface PeriodoPagado {
  id: string;
  periodo: PeriodoMensualidad;
  jornada: Jornada;
  fechaInicio: string;
  fechaFin: string;
  valorPagado: number;
  medioPago: MedioPago | null;
  reciboNumero: number | null;
}

export interface MensualidadDetalle extends Mensualidad {
  periodos: PeriodoPagado[];
}

export interface ResumenMensualidades {
  vigentes: number;
  porVencer: number;
  vencidas: number;
  umbralDias: number;
}

export interface CrearMensualidadDatos {
  nombre: string;
  celular?: string;
  placa: string;
  placaAlterna?: string;
  tipoVehiculo: TipoVehiculo;
  tarjeta?: string;
  periodo: PeriodoMensualidad;
  jornada: Jornada;
  medioPago: MedioPago;
  referencia?: string;
}

/** Edición parcial: solo se envían los campos que cambian; `null` borra placa alterna, tarjeta o celular. */
export interface EditarMensualidadDatos {
  nombre?: string;
  celular?: string | null;
  placa?: string;
  placaAlterna?: string | null;
  tarjeta?: string | null;
  jornada?: Jornada;
}

export interface RenovarMensualidadDatos {
  periodo?: PeriodoMensualidad;
  jornada?: Jornada;
  medioPago: MedioPago;
  referencia?: string;
}

/** Respuesta de registrar y renovar: la mensualidad actualizada y el recibo del pago. */
export interface RespuestaMensualidad {
  mensaje: string;
  mensualidad: Mensualidad;
  recibo: ReciboApi;
}

/** Precios de mensualidad vigentes por tipo de vehículo (para mostrar el total antes de cobrar). */
export type PreciosMensualidad = Record<TipoVehiculo, Record<PeriodoMensualidad, number>>;

export const NOMBRE_PERIODO: Record<PeriodoMensualidad, string> = {
  "1_dia": "1 día",
  "15_dias": "15 días",
  "1_mes": "1 mes",
};

export const NOMBRE_JORNADA: Record<Jornada, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  completa: "Completa",
};
