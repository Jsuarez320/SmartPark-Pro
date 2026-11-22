import type { FacturaImpresion } from "@/shared/printing/types";

export type MetodoPago = "efectivo" | "tarjeta" | "nequi";

/** Vehículo dentro del parqueadero con su cobro estimado al momento actual. */
export interface VehiculoPatio {
  ingresoId: string;
  tarjeta: string;
  placa: string;
  tipo: "carro" | "moto";
  plan: string;
  membresia: boolean;
  cliente?: string | null;
  fechaIngreso: string;
  minutos: number;
  bloques: number;
  valor: number;
}

export interface SalidaResponse {
  ticket: string;
  placa: string;
  tarjeta: string;
  tipo: "carro" | "moto";
  plan: string;
  horaIngreso: string;
  horaSalida: string;
  minutos: number;
  bloques: number;
  valorBloque: number;
  topeAplicado: boolean;
  total: number;
  metodoPago?: string | null;
}

/** Datos ya formateados para mostrar / imprimir el recibo. */
export interface DatosPago {
  ticket: string;
  placa: string;
  tarjeta: string;
  /** true = mensual (tarjeta); false = diario (número de tiquete). */
  mensual: boolean;
  tipo: string;
  plan: string;
  horaIngreso: string;
  horaSalida: string;
  tiempoTranscurrido: string;
  bloques: number;
  valorBloque: number;
  topeAplicado: boolean;
  total: number;
  metodoPago: string;
  fecha: string;
  /** Mismos datos en el formato que consume la impresora (fechas ISO). */
  factura: FacturaImpresion;
}
