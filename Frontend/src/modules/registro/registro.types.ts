export type TipoVehiculoRegistro = "carro" | "moto";

export interface RegistroFormState {
  placa: string;
  tipo: TipoVehiculoRegistro;
  marca: string;
  mensualidad: boolean;
  pagoDiario: boolean;
  diaEspecial: boolean;
}

export interface PrecioResponse {
  monto: number;
  concepto: string;
}
