import { api } from "@/shared/api/api";
import type { DatosPago, MetodoPago, SalidaResponse, VehiculoPatio } from "../receipt.types";

export async function obtenerPatio(q?: string): Promise<VehiculoPatio[]> {
  const { data } = await api.get<VehiculoPatio[]>("/vehiculos/patio", {
    params: q ? { q } : undefined,
  });
  return data;
}

export async function obtenerVehiculoPatio(ingresoId: string): Promise<VehiculoPatio> {
  const { data } = await api.get<VehiculoPatio>(`/vehiculos/patio/${ingresoId}`);
  return data;
}

export async function procesarPago(data: {
  ingresoId: string;
  metodoPago?: MetodoPago;
}): Promise<SalidaResponse> {
  const { data: res } = await api.post<SalidaResponse>("/vehiculos/salida", data);
  return res;
}
