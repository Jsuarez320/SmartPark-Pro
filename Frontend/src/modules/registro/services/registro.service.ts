import { api } from "@/shared/api/api";
import type { RegistroFormState, PrecioResponse, RegistroResponse } from "../registro.types";

export async function calcularPrecio(data: Partial<RegistroFormState>): Promise<PrecioResponse> {
  const { data: res } = await api.post<PrecioResponse>("/vehiculos/calcular-precio", data);
  return res;
}

export async function registrarEntrada(data: RegistroFormState): Promise<RegistroResponse> {
  const { data: res } = await api.post<RegistroResponse>("/vehiculos/entrada", data);
  return res;
}
