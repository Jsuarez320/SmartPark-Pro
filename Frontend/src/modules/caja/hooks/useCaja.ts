import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as servicio from "../services/caja.service";
import type { AbrirCajaDatos, CerrarCajaDatos, PeriodoFiltro } from "../caja.types";

// Claves con prefijo "caja". Otros módulos (operaciones, mensualidades) las invalidan por su nombre de texto
// cuando un cobro cambia la caja; aquí se invalida lo que dependa de abrir o cerrar.
const K = {
  turno: ["caja", "turno"] as const,
  historial: ["caja", "historial"] as const,
  detalle: (id: string | null) => ["caja", "detalle", id] as const,
  ingresos: (p: PeriodoFiltro) => ["caja", "ingresos", p] as const,
  transacciones: (p: PeriodoFiltro) => ["caja", "transacciones", p] as const,
};

const REFRESCO_MS = 30_000;

/** Caja abierta (o null). Se refresca sola: otros puestos también cobran. */
export function useTurnoActual() {
  return useQuery({ queryKey: K.turno, queryFn: servicio.obtenerTurnoActual, refetchInterval: REFRESCO_MS });
}

export function useAbrirCaja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: AbrirCajaDatos) => servicio.abrirTurno(datos),
    onSuccess: (turno) => {
      qc.setQueryData(K.turno, turno);
      void qc.invalidateQueries({ queryKey: ["caja"] });
    },
  });
}

export function useCerrarCaja() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: CerrarCajaDatos) => servicio.cerrarTurno(datos),
    onSuccess: () => {
      qc.setQueryData(K.turno, null);
      void qc.invalidateQueries({ queryKey: ["caja"] });
      void qc.invalidateQueries({ queryKey: ["recibos"] });
    },
  });
}

export function useDetalleTurno(turnoId: string | null) {
  return useQuery({
    queryKey: K.detalle(turnoId),
    queryFn: () => servicio.obtenerDetalleTurno(turnoId as string),
    enabled: turnoId !== null,
  });
}

/** Historial de turnos: solo administrador (`habilitado`). */
export function useHistorialTurnos(habilitado: boolean) {
  return useQuery({ queryKey: K.historial, queryFn: () => servicio.obtenerHistorial(20), enabled: habilitado });
}

export function useIngresosPeriodo(periodo: PeriodoFiltro, habilitado: boolean) {
  return useQuery({ queryKey: K.ingresos(periodo), queryFn: () => servicio.obtenerIngresos(periodo), enabled: habilitado });
}

export function useTransaccionesPeriodo(periodo: PeriodoFiltro, habilitado: boolean) {
  return useQuery({
    queryKey: K.transacciones(periodo),
    queryFn: () => servicio.obtenerTransacciones(periodo),
    enabled: habilitado,
  });
}
