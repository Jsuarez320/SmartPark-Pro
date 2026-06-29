export type MetodoPago = "efectivo" | "tarjeta" | "nequi";

export interface DatosPago {
  ticket: string;
  placa: string;
  tipo: string;
  horaIngreso: string;
  horaSalida: string;
  tiempoTranscurrido: string;
  tarifa: number;
  total: number;
  metodoPago: MetodoPago;
  fecha: string;
}

export interface PagoFormState {
  placa: string;
  tipo: string;
  metodoPago: MetodoPago;
  montoPagado: number;
  cambio: number;
}
