import { useState } from "react";
import { Bike, Car } from "lucide-react";
import { ErrorBanner } from "@/shared/components/ErrorBanner";
import { Pestanas } from "@/shared/components/Pestanas";
import { formatCurrencyCOP, formatFechaHoraCompleta, getApiError } from "@/shared/utils/formatters";
import { useIngresosPeriodo, useTransaccionesPeriodo } from "../hooks/useCaja";
import type { PeriodoFiltro } from "../caja.types";

const PERIODOS: PeriodoFiltro[] = ["Día", "Semana", "Mes", "Año"];

/** Ingresos por periodo y transacciones (solo administrador). */
export function ReportesPeriodo() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("Día");
  const ingresos = useIngresosPeriodo(periodo, true);
  const transacciones = useTransaccionesPeriodo(periodo, true);
  const d = ingresos.data;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text-primary">Ingresos por periodo</h2>
        <Pestanas etiquetaAccesible="Periodo" valor={periodo} onChange={setPeriodo} items={PERIODOS.map((p) => ({ valor: p, etiqueta: p }))} />
      </div>

      <ErrorBanner mensaje={ingresos.error ? getApiError(ingresos.error, "No se pudieron cargar los ingresos") : null} />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-600">Total ({periodo})</p>
          <p className="mt-1 text-xl font-bold text-text-primary">{formatCurrencyCOP(d?.total ?? 0)}</p>
          <p className="mt-0.5 text-xs text-blue-400">{d?.transacciones ?? 0} transacciones</p>
        </div>
        <div className="rounded-lg border border-brand/20 bg-brand-light p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-brand"><Car className="size-4" /> Carros</p>
          <p className="mt-1 text-xl font-bold text-text-primary">{formatCurrencyCOP(d?.porCarros ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-vehicle-moto"><Bike className="size-4" /> Motos</p>
          <p className="mt-1 text-xl font-bold text-text-primary">{formatCurrencyCOP(d?.porMotos ?? 0)}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-border p-3">
          <p className="text-text-muted">Cobros por horas</p>
          <p className="font-bold text-text-primary">{formatCurrencyCOP(d?.porConcepto.tiempo ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-text-muted">Mensualidades</p>
          <p className="font-bold text-text-primary">{formatCurrencyCOP(d?.porConcepto.membresia ?? 0)}</p>
        </div>
      </div>

      <h3 className="mb-3 text-sm font-bold text-text-secondary">Transacciones</h3>
      {(transacciones.data ?? []).length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">No hay transacciones en este periodo</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-2 py-2 font-medium">Fecha</th>
                <th className="px-2 py-2 font-medium">Placa</th>
                <th className="px-2 py-2 font-medium">Concepto</th>
                <th className="px-2 py-2 font-medium">Medio</th>
                <th className="px-2 py-2 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {transacciones.data!.map((t) => (
                <tr key={t.id} className="border-b border-border-light">
                  <td className="px-2 py-2 text-text-muted">{formatFechaHoraCompleta(t.fecha)}</td>
                  <td className="px-2 py-2 font-bold text-text-primary">{t.placa}</td>
                  <td className="px-2 py-2 text-text-secondary">{t.concepto}</td>
                  <td className="px-2 py-2 capitalize text-text-secondary">{t.metodoPago}</td>
                  <td className="px-2 py-2 text-right font-bold text-text-primary">{formatCurrencyCOP(t.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
