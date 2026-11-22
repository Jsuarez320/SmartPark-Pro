import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as servicio from "../services/recibos.service";
import type { FiltrosRecibos } from "../recibos.types";

export function useBuscarRecibos(filtros: FiltrosRecibos) {
  return useQuery({
    queryKey: ["recibos", "busqueda", filtros],
    queryFn: () => servicio.buscarRecibos(filtros),
    // Mientras se escribe, se muestran los resultados anteriores en vez de parpadear.
    placeholderData: keepPreviousData,
  });
}

export function useRecibo(id: string | null) {
  return useQuery({ queryKey: ["recibos", "detalle", id], queryFn: () => servicio.obtenerRecibo(id as string), enabled: id !== null });
}

/** Reimprimir: cuenta la copia y devuelve el contenido guardado para imprimirlo. */
export function useReimprimirRecibo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => servicio.reimprimirRecibo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recibos"] }),
  });
}

/** Historial de reimpresiones: solo administrador (`habilitado`). */
export function useReimpresiones(id: string | null, habilitado: boolean) {
  return useQuery({
    queryKey: ["recibos", "reimpresiones", id],
    queryFn: () => servicio.obtenerReimpresiones(id as string),
    enabled: id !== null && habilitado,
  });
}
