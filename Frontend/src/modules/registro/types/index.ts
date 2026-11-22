export type TipoVehiculoRegistro = "carro" | "moto";
export type PlanIngreso = "bloque_15min" | "medio_dia" | "dia_completo";

export interface RegistroFormState {
  /** Tarjeta del parqueadero: solo clientes mensuales. Vacía para diarios (se genera un tiquete). */
  tarjeta: string;
  placa: string;
  tipo: TipoVehiculoRegistro;
  marca: string;
  plan: PlanIngreso;
}

export interface PrecioResponse {
  monto: number;
  concepto: string;
}

export interface ConsultaPlaca {
  placa: string;
  registrado: boolean;
  tipo?: TipoVehiculoRegistro | null;
  membresia?: { plan: string; fechaFin: string } | null;
}

export interface RegistroResponse {
  id: string;
  estado: string;
  tarjeta: string;
  placa: string;
  tipo: TipoVehiculoRegistro;
  plan: string;
  membresia: boolean;
  tarifa: number;
  marca?: string | null;
  horaIngreso: string;
  mensaje: string;
}

export interface RespuestaRegistro {
  mensaje: string;
  id: string;
  estado: string;
  tarjeta: string;
  placa: string;
  tipo: string;
  plan?: string;
  horaIngreso: string;
  /** true = mensual (tarjeta); false = diario (recibo impreso). */
  mensual?: boolean;
  /** Resultado de imprimir el recibo de entrada (solo diarios). */
  impresion?: { ok: boolean };
}
