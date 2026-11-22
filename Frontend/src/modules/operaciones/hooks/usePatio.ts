import { useQuery } from "@tanstack/react-query";
import { hayCajaAbierta, obtenerPatio } from "../services/operaciones.service";

const REFRESCO_MS = 30_000;

/** Vehículos dentro del parqueadero. Se refresca solo para mantener el valor estimado al día. */
export function usePatio(q: string) {
  return useQuery({
    queryKey: ["operaciones", "patio", q],
    queryFn: () => obtenerPatio(q || undefined),
    refetchInterval: REFRESCO_MS,
  });
}

/**
 * ¿Hay caja abierta? La clave empieza con "caja": al abrir o cerrar la caja (módulo caja) se invalida sola.
 * Es solo un aviso; la regla (sin caja abierta no se cobra) la aplica el backend.
 */
export function useCajaAbierta() {
  return useQuery({ queryKey: ["caja", "abierta"], queryFn: hayCajaAbierta, refetchInterval: REFRESCO_MS });
}
