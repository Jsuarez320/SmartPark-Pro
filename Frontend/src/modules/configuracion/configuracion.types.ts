export interface Tarifa {
  id: number;
  /** Nombre del plan (Bloque 15 min, Medio día, Día completo, Medio tiempo, Mensual) */
  label: string;
  value: number;
}

export interface Tarifas {
  carro: Tarifa[];
  moto: Tarifa[];
}

export interface ConfiguracionData {
  tarifas: Tarifas;
}
