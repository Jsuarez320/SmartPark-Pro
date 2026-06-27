import { useState } from "react";
import type { PeriodoFiltro, ResumenCaja, DesgloseIngresos, Transaccion, Retiro } from "../caja.types";

const periodos: PeriodoFiltro[] = ["Día", "Semana", "Mes", "Año"];

export function useCaja() {
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoFiltro>("Día");
  const [resumen] = useState<ResumenCaja>({ dineroEnCaja: 0, ingresosDelDia: 0, entregadoHoy: 0 });
  const [ingresos] = useState<DesgloseIngresos>({
    total: 0,
    porCarros: 0,
    porMotos: 0,
    porTipoPago: { mensual: 0, diario: 0, porTiempo: 0, evento: 0 },
    transacciones: 0,
  });
  const [transacciones] = useState<Transaccion[]>([]);
  const [retiros] = useState<Retiro[]>([]);

  return {
    periodoActivo,
    setPeriodoActivo,
    periodos,
    resumen,
    ingresos,
    transacciones,
    retiros,
  };
}
