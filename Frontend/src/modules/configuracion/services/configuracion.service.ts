import { api } from "@/shared/api/api";
import type { Tarifas, ConfiguracionEstado } from "../configuracion.types";

export async function obtenerConfiguracion(): Promise<ConfiguracionEstado> {
  const { data } = await api.get<ConfiguracionEstado>("/configuracion");
  return data;
}

export async function actualizarTarifas(tarifas: Tarifas): Promise<void> {
  await api.put("/configuracion/tarifas", tarifas);
}

export async function toggleEvento(activo: boolean): Promise<void> {
  await api.patch("/configuracion/evento", { activo });
}
