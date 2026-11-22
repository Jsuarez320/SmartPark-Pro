import { api } from "@/shared/api/api";
import type {
  CrearMensualidadDatos,
  EditarMensualidadDatos,
  EstadoMensualidad,
  Mensualidad,
  MensualidadDetalle,
  PreciosMensualidad,
  RenovarMensualidadDatos,
  RespuestaMensualidad,
  ResumenMensualidades,
} from "../mensualidades.types";

export async function listarMensualidades(estado?: EstadoMensualidad, q?: string): Promise<Mensualidad[]> {
  const { data } = await api.get<Mensualidad[]>("/mensualidades", { params: { estado, q: q || undefined } });
  return data;
}

export async function obtenerResumen(): Promise<ResumenMensualidades> {
  const { data } = await api.get<ResumenMensualidades>("/mensualidades/resumen");
  return data;
}

export async function obtenerDetalle(id: string): Promise<MensualidadDetalle> {
  const { data } = await api.get<MensualidadDetalle>(`/mensualidades/${id}`);
  return data;
}

/** Registra la mensualidad y cobra el primer periodo (exige caja abierta y medio de pago). */
export async function crearMensualidad(datos: CrearMensualidadDatos): Promise<RespuestaMensualidad> {
  const { data } = await api.post<RespuestaMensualidad>("/mensualidades", datos);
  return data;
}

export async function editarMensualidad(id: string, cambios: EditarMensualidadDatos): Promise<Mensualidad> {
  const { data } = await api.put<Mensualidad>(`/mensualidades/${id}`, cambios);
  return data;
}

/** Registra un pago nuevo y extiende la vigencia (exige caja abierta y medio de pago). */
export async function renovarMensualidad(id: string, datos: RenovarMensualidadDatos): Promise<RespuestaMensualidad> {
  const { data } = await api.post<RespuestaMensualidad>(`/mensualidades/${id}/renovar`, datos);
  return data;
}

interface TarifaApi {
  tipo: "carro" | "moto";
  mensualidad1Dia: number;
  mensualidad15Dias: number;
  mensualidad1Mes: number;
}

/** Precios de mensualidad vigentes (lectura permitida a cualquier usuario autenticado). */
export async function obtenerPrecios(): Promise<PreciosMensualidad> {
  const { data } = await api.get<TarifaApi[]>("/tarifas/vigentes");
  const precios = {} as PreciosMensualidad;
  for (const t of data) {
    precios[t.tipo] = { "1_dia": t.mensualidad1Dia, "15_dias": t.mensualidad15Dias, "1_mes": t.mensualidad1Mes };
  }
  return precios;
}
