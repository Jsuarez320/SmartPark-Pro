import type { MedioPago } from "@/shared/types/recibo";

export type PeriodoFiltro = "Día" | "Semana" | "Mes" | "Año";

export interface MovimientoCaja {
  id: string;
  fecha: string;
  operacion: "horas" | "mensualidad";
  concepto: string;
  placa: string | null;
  medio: MedioPago;
  monto: number;
}

/** Resumen de un turno de caja, abierto (en vivo) o cerrado. Pesos COP. */
export interface ResumenTurno {
  turnoId: string;
  estado: "abierta" | "cerrada";
  abiertoPor: string;
  cerradoPor: string | null;
  fechaApertura: string;
  fechaCierre: string | null;
  horasTurno: number;

  baseEfectivo: number;
  baseTransferencia: number;

  /** Cobrado en el turno, separado por medio de pago. */
  efectivo: number;
  transferencia: number;
  totalRecaudado: number;
  movimientosEfectivo: number;
  movimientosTransferencia: number;
  totalTransacciones: number;

  /** Lo que debería haber: base + cobrado, por medio. */
  esperadoEfectivo: number;
  esperadoTransferencia: number;

  /** Solo en turnos cerrados. */
  efectivoContado: number | null;
  /** contado − esperado (negativo = faltante). */
  diferenciaEfectivo: number | null;
  notas: string | null;
  reciboId: string | null;
  reciboNumero: number | null;

  /** Detalle: viene en el turno actual, en el detalle de un turno y en el cierre; no en el historial. */
  movimientos: MovimientoCaja[] | null;
}

export interface AbrirCajaDatos {
  baseEfectivo: number;
  baseTransferencia: number;
}

export interface CerrarCajaDatos {
  efectivoContado: number;
  notas?: string;
}

/** Reportes por periodo (solo administrador). */
export interface DesgloseIngresos {
  total: number;
  porCarros: number;
  porMotos: number;
  /** Cobros por horas y mensualidades. */
  porConcepto: {
    tiempo: number;
    membresia: number;
  };
  transacciones: number;
}

export interface Transaccion {
  id: string;
  placa: string;
  tipo: string;
  concepto: string;
  monto: number;
  metodoPago: string;
  fecha: string;
}
