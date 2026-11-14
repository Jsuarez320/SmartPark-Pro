import { api } from "@/shared/api/api";
import type { ConfiguracionData, Tarifa } from "../configuracion.types";

export async function obtenerConfiguracion(): Promise<ConfiguracionData> {
  const { data } = await api.get<ConfiguracionData>("/configuracion");
  return data;
}

export async function actualizarTarifas(tarifas: Pick<Tarifa, "id" | "value">[]): Promise<ConfiguracionData> {
  const { data } = await api.put<ConfiguracionData>("/configuracion/tarifas", { tarifas });
  return data;
}
