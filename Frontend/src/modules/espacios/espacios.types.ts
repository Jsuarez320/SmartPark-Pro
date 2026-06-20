import type { TipoVehiculo } from "@/shared/utils/vehiculo.utils";

export interface ConteoEspacioPorTipo {
  tipo: TipoVehiculo;
  total: number;
  libres: number;
  ocupados: number;
}

export interface ResumenEspacios {
  total: number;
  libres: number;
  ocupados: number;
  porcentaje: number;
  porTipo: Record<TipoVehiculo, ConteoEspacioPorTipo>;
}
