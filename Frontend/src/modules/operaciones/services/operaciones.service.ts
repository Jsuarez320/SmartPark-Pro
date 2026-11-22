import { api } from "@/shared/api/api";
import type { ItemPatio, RegistrarOperacionDatos, RespuestaOperacion } from "../operaciones.types";

/** POST /operaciones/registrar: el backend decide entrada o salida; el empleado nunca lo elige. */
export async function registrarOperacion(datos: RegistrarOperacionDatos): Promise<RespuestaOperacion> {
  const { data } = await api.post<RespuestaOperacion>("/operaciones/registrar", datos);
  return data;
}

/** Vehículos dentro del parqueadero, con lo que se cobraría si salieran ahora. */
export async function obtenerPatio(q?: string): Promise<ItemPatio[]> {
  const { data } = await api.get<ItemPatio[]>("/operaciones/patio", { params: q ? { q } : undefined });
  return data;
}

/**
 * ¿Hay una caja abierta? Solo para avisar al empleado antes de intentar un cobro: la regla real
 * (no se cobra sin caja abierta) la aplica el backend.
 */
export async function hayCajaAbierta(): Promise<boolean> {
  const { data } = await api.get<{ turnoId: string } | null>("/caja/turno");
  return data !== null;
}
