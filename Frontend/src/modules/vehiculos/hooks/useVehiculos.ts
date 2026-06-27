import { useState } from "react";
import type { Vehiculo, Mensual, EstadisticasVehiculos } from "../vehiculos.types";

export function useVehiculos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [vehiculos] = useState<Vehiculo[]>([]);
  const [mensuales] = useState<Mensual[]>([]);
  const [stats] = useState<EstadisticasVehiculos>({ totalPlacas: 0, totalMensuales: 0 });

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
  };
}
