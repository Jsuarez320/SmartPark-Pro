import { api } from "@/shared/api/api";
import type { Vehiculo, Mensual, EstadisticasVehiculos } from "../vehiculos.types";

export async function obtenerVehiculos(): Promise<Vehiculo[]> {
  const { data } = await api.get<Vehiculo[]>("/vehiculos");
  return data;
}

export async function buscarVehiculos(placa: string): Promise<Vehiculo[]> {
  const { data } = await api.get<Vehiculo[]>("/vehiculos", { params: { placa } });
  return data;
}

export async function obtenerMensuales(): Promise<Mensual[]> {
  const { data } = await api.get<Mensual[]>("/vehiculos/mensuales");
  return data;
}

export async function obtenerEstadisticas(): Promise<EstadisticasVehiculos> {
  const { data } = await api.get<EstadisticasVehiculos>("/vehiculos/stats");
  return data;
}
