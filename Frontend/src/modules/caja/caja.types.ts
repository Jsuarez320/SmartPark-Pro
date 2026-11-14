export type PeriodoFiltro = "Día" | "Semana" | "Mes" | "Año";

export interface TurnoActual {
  turnoId: string;
  abiertoPor: string;
  fechaApertura: string;
  montoInicial: number;
  totalTransacciones: number;
  totalRecaudado: number;
  efectivo: number;
  otrosMetodos: number;
  /** Monto inicial + efectivo cobrado: lo que debería haber en la caja. */
  totalEsperadoCaja: number;
}

export interface TurnoHistorial {
  turnoId: string;
  abiertoPor: string;
  cerradoPor: string;
  fechaApertura: string;
  fechaCierre: string;
  horasTurno: number;
  montoInicial: number;
  totalRecaudado: number;
  efectivo: number;
  otrosMetodos: number;
  montoContado: number;
  diferenciaCaja: number;
  notas?: string | null;
}

export interface DesgloseIngresos {
  total: number;
  porCarros: number;
  porMotos: number;
  porConcepto: {
    tiempo: number;
    medioDia: number;
    diaCompleto: number;
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
