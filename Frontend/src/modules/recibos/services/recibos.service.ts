import { api } from "@/shared/api/api";
import type { FiltrosRecibos, ReciboApi, ReciboResumen, Reimpresion } from "../recibos.types";

/** Recibos anteriores, los más recientes primero. */
export async function buscarRecibos(f: FiltrosRecibos): Promise<ReciboResumen[]> {
  const { data } = await api.get<ReciboResumen[]>("/recibos", {
    params: { numero: f.numero, placa: f.placa, tipo: f.tipo, desde: f.desde, hasta: f.hasta, limit: f.limit },
  });
  return data;
}

/** El recibo con su contenido guardado (lo que se imprime). */
export async function obtenerRecibo(id: string): Promise<ReciboApi> {
  const { data } = await api.get<ReciboApi>(`/recibos/${id}`);
  return data;
}

/**
 * Registra la reimpresión y devuelve el contenido GUARDADO, idéntico al original, con `reimpresiones`
 * incrementado: el ticket debe imprimirse como COPIA. No recalcula nada ni crea un recibo nuevo.
 */
export async function reimprimirRecibo(id: string): Promise<ReciboApi> {
  const { data } = await api.post<ReciboApi>(`/recibos/${id}/reimprimir`);
  return data;
}

/** Quién reimprimió un recibo y cuándo (solo administrador). */
export async function obtenerReimpresiones(id: string): Promise<Reimpresion[]> {
  const { data } = await api.get<Reimpresion[]>(`/recibos/${id}/reimpresiones`);
  return data;
}
