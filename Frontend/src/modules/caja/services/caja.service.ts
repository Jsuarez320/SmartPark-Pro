import { api } from "@/shared/api/api";
import type { ResumenCaja, DesgloseIngresos, Transaccion, Retiro, PeriodoFiltro } from "../caja.types";

export async function obtenerResumen(): Promise<ResumenCaja> {
  const { data } = await api.get<ResumenCaja>("/caja/resumen");
  return data;
}

export async function obtenerIngresos(periodo: PeriodoFiltro): Promise<DesgloseIngresos> {
  const { data } = await api.get<DesgloseIngresos>("/caja/ingresos", { params: { periodo } });
  return data;
}

export async function obtenerTransacciones(periodo: PeriodoFiltro): Promise<Transaccion[]> {
  const { data } = await api.get<Transaccion[]>("/caja/transacciones", { params: { periodo } });
  return data;
}

export async function obtenerRetiros(): Promise<Retiro[]> {
  const { data } = await api.get<Retiro[]>("/caja/retiros");
  return data;
}

export async function entregarDinero(monto: number): Promise<void> {
  await api.post("/caja/entregar", { monto });
}
