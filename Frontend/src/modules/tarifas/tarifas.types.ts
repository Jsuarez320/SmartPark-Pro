import type { TipoVehiculo } from "@/shared/utils/vehiculo.utils";

export interface Tarifa {
  id: number;
  tipo: TipoVehiculo;
  valorHora: number;
  vigente: boolean;
}

export interface ActualizarTarifaDTO {
  valorHora: number;
}
