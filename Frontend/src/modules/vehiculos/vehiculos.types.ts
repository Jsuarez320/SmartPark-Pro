import type { TipoVehiculo } from "@/shared/utils/vehiculo.utils";

export interface VehiculoActivo {
  id: number;
  placa: string;
  tipo: TipoVehiculo;
  espacio: string;
  horaEntrada: string;
  tiempoTranscurrido: string;
  montoEstimado: number;
}

export interface RegistroEntradaDTO {
  placa: string;
  tipo: TipoVehiculo;
  espacioId?: number;
}

export interface RegistroSalidaDTO {
  vehiculoId: number;
  metodoPago: "efectivo" | "tarjeta" | "nequi";
}
