import { useCallback, useEffect, useState } from "react";
import { getApiError } from "@/shared/utils/formatters";
import type { Vehiculo, Mensual, EstadisticasVehiculos } from "../vehiculos.types";
import { obtenerVehiculos, obtenerMensuales, obtenerEstadisticas } from "../services/vehiculos.service";

export function useVehiculos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [mensuales, setMensuales] = useState<Mensual[]>([]);
  const [stats, setStats] = useState<EstadisticasVehiculos>({ totalPlacas: 0, totalMensuales: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [v, m, s] = await Promise.all([
        obtenerVehiculos(),
        obtenerMensuales(),
        obtenerEstadisticas(),
      ]);
      setVehiculos(v);
      setMensuales(m);
      setStats(s);
      setError(null);
    } catch (err) {
      setError(getApiError(err, "No se pudieron cargar los vehículos"));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const vehiculosFiltrados = searchQuery
    ? vehiculos.filter((v) => v.placa.includes(searchQuery.toUpperCase()))
    : vehiculos;

  return {
    searchQuery,
    setSearchQuery,
    vehiculos: vehiculosFiltrados,
    totalVehiculos: stats.totalPlacas,
    mensuales,
    totalMensuales: stats.totalMensuales,
    statsMensuales: {
      vencidos: mensuales.filter((m) => m.estado === "vencido").length,
      porVencer: mensuales.filter((m) => m.estado === "por_vencer").length,
      alerta: mensuales.filter((m) => m.estado === "alerta").length,
      activos: mensuales.filter((m) => m.estado === "activo").length,
    },
    cargando,
    error,
    recargar: cargar,
  };
}
