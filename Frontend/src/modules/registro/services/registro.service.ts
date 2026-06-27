import { api } from "@/shared/api/api";
import type { RegistroFormState, PrecioResponse } from "../registro.types";

export async function calcularPrecio(data: Partial<RegistroFormState>): Promise<PrecioResponse> {
  const { data: res } = await api.post<PrecioResponse>("/vehiculos/calcular-precio", data);
  return res;
}

export async function registrarEntrada(data: RegistroFormState): Promise<void> {
  await api.post("/vehiculos/entrada", data);
}
