import { api } from "@/shared/api/api";
import type { DesgloseIngresos, PeriodoFiltro, Transaccion, TurnoActual, TurnoHistorial } from "../caja.types";

export async function obtenerTurno(): Promise<TurnoActual | null> {
  const { data } = await api.get<TurnoActual | null>("/caja/turno");
  return data;
}

export async function abrirTurno(montoInicial: number): Promise<TurnoActual> {
  const { data } = await api.post<TurnoActual>("/caja/turno/abrir", { montoInicial });
  return data;
}

export async function cerrarTurno(montoContado: number, notas?: string): Promise<TurnoHistorial> {
  const { data } = await api.post<TurnoHistorial>("/caja/turno/cerrar", {
    montoContado,
    notas: notas?.trim() || null,
  });
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

export async function obtenerHistorialTurnos(): Promise<TurnoHistorial[]> {
  const { data } = await api.get<TurnoHistorial[]>("/caja/turnos");
  return data;
}
