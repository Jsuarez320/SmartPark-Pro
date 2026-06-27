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
  vencimiento: string;
  estado: "vencido" | "por_vencer" | "alerta" | "activo";
}

export interface EstadisticasVehiculos {
  totalPlacas: number;
  totalMensuales: number;
}
