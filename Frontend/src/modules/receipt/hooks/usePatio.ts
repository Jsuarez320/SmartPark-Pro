import { useCallback, useEffect, useState } from "react";
import { getApiError } from "@/shared/utils/formatters";
import type { VehiculoPatio } from "../receipt.types";
import { obtenerPatio } from "../services/receipt.service";

const REFRESCO_MS = 30_000;

/** Vehículos dentro del parqueadero (por placa o tarjeta), refrescados cada 30 s. */
export function usePatio(busqueda: string) {
  const [vehiculos, setVehiculos] = useState<VehiculoPatio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setVehiculos(await obtenerPatio(busqueda.trim() || undefined));
      setError(null);
    } catch (err) {
      setError(getApiError(err, "No se pudo cargar el patio"));
    } finally {
      setCargando(false);
    }
  }, [busqueda]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    const i = setInterval(cargar, REFRESCO_MS);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [cargar]);

  return { vehiculos, cargando, error, recargar: cargar };
}
