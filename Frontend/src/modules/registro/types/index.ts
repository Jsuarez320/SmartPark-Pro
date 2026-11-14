export type TipoVehiculoRegistro = "carro" | "moto";
export type PlanIngreso = "bloque_15min" | "medio_dia" | "dia_completo";

export interface RegistroFormState {
  /** Código de la tarjeta del parqueadero entregada al vehículo */
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
}
