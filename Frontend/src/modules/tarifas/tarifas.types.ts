export type TipoVehiculo = "carro" | "moto";

/** Precios vigentes (o históricos) de un tipo de vehículo. Pesos COP. */
export interface Tarifa {
  id: number;
  tipo: TipoVehiculo;
  valorHora: number;
  valorDia: number;
  valorHoraFestivo: number;
  valorDiaFestivo: number;
  mensualidad1Dia: number;
  mensualidad15Dias: number;
  mensualidad1Mes: number;
  nocturnaActiva: boolean;
  valorHoraNocturna: number | null;
  vigenteDesde: string;
  vigenteHasta: string | null;
}

/** Lo que se envía al guardar: crea una NUEVA versión (la anterior no se modifica). */
export type TarifaInput = Omit<Tarifa, "id" | "tipo" | "vigenteDesde" | "vigenteHasta">;

export interface ConfiguracionCobro {
  graciaMinutos: number;
  umbralVencimientoDias: number;
  nocturnaInicio: string;
  nocturnaFin: string;
  jornadaMananaInicio: string;
  jornadaMananaFin: string;
  jornadaTardeInicio: string;
  jornadaTardeFin: string;
}

export interface Festivo {
  fecha: string;
  nombre: string;
}

export interface PrecargaFestivos {
  anio: number;
  agregados: number;
  existentes: number;
}

export interface SimulacionRequest {
  tipo: TipoVehiculo;
  /** ISO 8601 con zona horaria. */
  entrada: string;
  /** Si se omite, el servidor usa su hora actual. */
  salida?: string;
}

export interface TramoSimulado {
  tipo: "normal" | "nocturna" | "festivo";
  horas: number;
  valorHora: number;
  subtotal: number;
}

export interface PeriodoSimulado {
  inicio: string;
  fin: string;
  tramos: TramoSimulado[];
  subtotal: number;
  tope: number;
  total: number;
  topeAplicado: boolean;
}

export interface Simulacion {
  tarifaId: number;
  minutosTotales: number;
  minutosCobrados: number;
  horasCobradas: number;
  total: number;
  topeAplicado: boolean;
  periodos: PeriodoSimulado[];
}
