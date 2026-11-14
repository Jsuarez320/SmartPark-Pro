import { useCallback, useEffect, useState } from "react";
import { api } from "@/shared/api/api";
import { getApiError } from "@/shared/utils/formatters";
import type { Dashboard } from "../dashboard.types";

const REFRESCO_MS = 60_000;

export function useDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await api.get<Dashboard>("/dashboard");
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(getApiError(err, "No se pudo cargar el panel"));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const i = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(i);
  }, [cargar]);

  return { data, cargando, error };
}
