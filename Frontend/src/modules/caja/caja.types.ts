export type PeriodoFiltro = "Día" | "Semana" | "Mes" | "Año";

export interface ResumenCaja {
  dineroEnCaja: number;
  ingresosDelDia: number;
  entregadoHoy: number;
}

export interface DesgloseIngresos {
  total: number;
  porCarros: number;
  porMotos: number;
  porTipoPago: {
    mensual: number;
    diario: number;
    porTiempo: number;
    evento: number;
  };
  transacciones: number;
}

export interface Transaccion {
  id: string;
  placa: string;
  tipo: string;
  monto: number;
  metodoPago: string;
  fecha: string;
}

export interface Retiro {
  id: string;
  monto: number;
  fecha: string;
  motivo: string;
}
