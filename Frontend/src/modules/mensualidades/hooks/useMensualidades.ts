import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as servicio from "../services/mensualidades.service";
import type {
  CrearMensualidadDatos,
  EditarMensualidadDatos,
  EstadoMensualidad,
  RenovarMensualidadDatos,
} from "../mensualidades.types";

const REFRESCO_MS = 60_000;

export function useMensualidades(estado: EstadoMensualidad | undefined, q: string) {
  return useQuery({
    queryKey: ["mensualidades", "lista", estado ?? "todas", q],
    queryFn: () => servicio.listarMensualidades(estado, q),
    refetchInterval: REFRESCO_MS,
  });
}

/** Contadores para la alerta de vencimientos. */
export function useResumenMensualidades() {
  return useQuery({ queryKey: ["mensualidades", "resumen"], queryFn: servicio.obtenerResumen, refetchInterval: REFRESCO_MS });
}

export function useDetalleMensualidad(id: string | null) {
  return useQuery({
    queryKey: ["mensualidades", "detalle", id],
    queryFn: () => servicio.obtenerDetalle(id as string),
    enabled: id !== null,
  });
}

/** Precios de mensualidad por tipo y periodo, para mostrar el total antes de cobrar. */
export function usePreciosMensualidad() {
  return useQuery({ queryKey: ["mensualidades", "precios"], queryFn: servicio.obtenerPrecios });
}

/** Registrar y renovar cobran: cambian la caja y generan un recibo. */
function usarInvalidacionDeCobro() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["mensualidades"] });
    void qc.invalidateQueries({ queryKey: ["caja"] });
    void qc.invalidateQueries({ queryKey: ["recibos"] });
  };
}

export function useCrearMensualidad() {
  const invalidar = usarInvalidacionDeCobro();
  return useMutation({ mutationFn: (datos: CrearMensualidadDatos) => servicio.crearMensualidad(datos), onSuccess: invalidar });
}

export function useRenovarMensualidad() {
  const invalidar = usarInvalidacionDeCobro();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: RenovarMensualidadDatos }) => servicio.renovarMensualidad(id, datos),
    onSuccess: invalidar,
  });
}

export function useEditarMensualidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: EditarMensualidadDatos }) => servicio.editarMensualidad(id, cambios),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mensualidades"] }),
  });
}
