import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as servicio from "../services/tarifas.service";
import type { ConfiguracionCobro, Festivo, SimulacionRequest, TarifaInput, TipoVehiculo } from "../tarifas.types";

// Claves de caché con prefijo "tarifas". Los demás módulos leen lo que necesitan por su cuenta
// (nunca importan este módulo): se comunican solo a través de la API y de estas claves de texto.
const K = {
  vigentes: ["tarifas", "vigentes"] as const,
  historial: (tipo: TipoVehiculo) => ["tarifas", "historial", tipo] as const,
  configuracion: ["tarifas", "configuracion"] as const,
  festivos: (anio: number) => ["tarifas", "festivos", anio] as const,
};

export function useTarifasVigentes() {
  return useQuery({ queryKey: K.vigentes, queryFn: servicio.obtenerVigentes });
}

export function useGuardarTarifa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tipo, tarifa }: { tipo: TipoVehiculo; tarifa: TarifaInput }) => servicio.guardarTarifa(tipo, tarifa),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas"] }),
  });
}

export function useHistorialTarifa(tipo: TipoVehiculo) {
  return useQuery({ queryKey: K.historial(tipo), queryFn: () => servicio.obtenerHistorial(tipo) });
}

export function useConfiguracionCobro() {
  return useQuery({ queryKey: K.configuracion, queryFn: servicio.obtenerConfiguracion });
}

export function useGuardarConfiguracion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cambios: Partial<ConfiguracionCobro>) => servicio.guardarConfiguracion(cambios),
    onSuccess: (nueva) => qc.setQueryData(K.configuracion, nueva),
  });
}

export function useFestivos(anio: number) {
  return useQuery({ queryKey: K.festivos(anio), queryFn: () => servicio.obtenerFestivos(anio) });
}

export function useAgregarFestivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (festivo: Festivo) => servicio.agregarFestivo(festivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas", "festivos"] }),
  });
}

export function useEliminarFestivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fecha: string) => servicio.eliminarFestivo(fecha),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas", "festivos"] }),
  });
}

export function usePrecargarFestivos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (anio: number) => servicio.precargarFestivos(anio),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas", "festivos"] }),
  });
}

export function useSimularCobro() {
  return useMutation({ mutationFn: (datos: SimulacionRequest) => servicio.simularCobro(datos) });
}
