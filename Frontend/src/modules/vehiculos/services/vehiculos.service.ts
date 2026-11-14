import { api } from "@/shared/api/api";
import type {
  EstadisticasVehiculos,
  MembresiaCreada,
  Mensual,
  NuevaMembresia,
  PlanMembresia,
  Vehiculo,
} from "../vehiculos.types";

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

export async function obtenerPrecioMembresia(
  tipo: "carro" | "moto",
  plan: PlanMembresia,
): Promise<number> {
  const { data } = await api.post<{ monto: number }>("/vehiculos/calcular-precio", { tipo, plan });
  return data.monto;
}

export async function contratarMembresia(data: NuevaMembresia): Promise<MembresiaCreada> {
  const { data: res } = await api.post<MembresiaCreada>("/membresias", {
    ...data,
    telefono: data.telefono?.trim() || null,
    marca: data.marca?.trim() || null,
  });
  return res;
}
