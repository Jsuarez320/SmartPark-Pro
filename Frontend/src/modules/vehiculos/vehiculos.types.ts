export interface Vehiculo {
  placa: string;
  propietario: string;
  tipo: "carro" | "moto";
  marca: string;
  mensualidad: boolean;
  fechaRegistro: string;
}

export interface Mensual {
  placa: string;
  propietario: string;
  plan: string;
  vencimiento: string;
  estado: "vencido" | "por_vencer" | "alerta" | "activo";
}

export interface EstadisticasVehiculos {
  totalPlacas: number;
  totalMensuales: number;
}

export type PlanMembresia = "mensual" | "medio_tiempo";
export type MetodoPagoMembresia = "efectivo" | "tarjeta" | "nequi";

export interface NuevaMembresia {
  nombres: string;
  apellidos: string;
  documento: string;
  tipoDocumento: "CC" | "CE" | "NIT" | "PAS" | "TI";
  telefono?: string;
  placa: string;
  tipo: "carro" | "moto";
  marca?: string;
  plan: PlanMembresia;
  metodoPago: MetodoPagoMembresia;
}

export interface MembresiaCreada {
  id: string;
  placa: string;
  plan: string;
  fechaInicio: string;
  fechaFin: string;
  valor: number;
  factura: string;
}
