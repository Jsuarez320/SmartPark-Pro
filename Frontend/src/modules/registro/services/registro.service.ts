import { api } from "@/shared/api/api";
import type {
  ConsultaPlaca,
  PlanIngreso,
  PrecioResponse,
  RegistroFormState,
  RegistroResponse,
  TipoVehiculoRegistro,
} from "../types";

export async function calcularPrecio(data: {
  tipo: TipoVehiculoRegistro;
  plan: PlanIngreso;
}): Promise<PrecioResponse> {
  const { data: res } = await api.post<PrecioResponse>("/vehiculos/calcular-precio", data);
  return res;
}

export async function consultarPlaca(placa: string): Promise<ConsultaPlaca> {
  const { data } = await api.get<ConsultaPlaca>(`/vehiculos/consulta/${encodeURIComponent(placa)}`);
  return data;
}

export async function registrarEntrada(data: RegistroFormState): Promise<RegistroResponse> {
  const { data: res } = await api.post<RegistroResponse>("/vehiculos/entrada", {
    ...data,
    tarjeta: data.tarjeta.trim() || null,
    marca: data.marca.trim() || null,
  });
  return res;
}
