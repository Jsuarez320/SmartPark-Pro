import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBanner } from "@/shared/components/ErrorBanner";
import { Pestanas } from "@/shared/components/Pestanas";
import { formatCurrencyCOP, formatFechaHoraCompleta, getApiError } from "@/shared/utils/formatters";
import { useHistorialTarifa } from "../hooks/useTarifas";
import type { TipoVehiculo } from "../tarifas.types";

export function HistorialTab() {
  const [tipo, setTipo] = useState<TipoVehiculo>("carro");
  const { data, isLoading, error } = useHistorialTarifa(tipo);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">Todas las versiones de precios, de la más reciente a la más antigua.</p>
        <Pestanas
          etiquetaAccesible="Tipo de vehículo"
          valor={tipo}
          onChange={setTipo}
          items={[
            { valor: "carro", etiqueta: "Carro" },
            { valor: "moto", etiqueta: "Moto" },
          ]}
        />
      </div>

      <ErrorBanner mensaje={error ? getApiError(error, "No se pudo cargar el historial") : null} />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Cargando historial...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-3 py-2 font-medium">Desde</th>
                <th className="px-3 py-2 font-medium">Hasta</th>
                <th className="px-3 py-2 text-right font-medium">Hora</th>
                <th className="px-3 py-2 text-right font-medium">Día</th>
                <th className="px-3 py-2 text-right font-medium">Hora fest.</th>
                <th className="px-3 py-2 text-right font-medium">Día fest.</th>
                <th className="px-3 py-2 text-right font-medium">Nocturna</th>
                <th className="px-3 py-2 text-right font-medium">Mens. 1 d</th>
                <th className="px-3 py-2 text-right font-medium">Mens. 15 d</th>
                <th className="px-3 py-2 text-right font-medium">Mens. 1 mes</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((t) => (
                <tr key={t.id} className="border-b border-border-light">
                  <td className="px-3 py-2 text-text-secondary">{formatFechaHoraCompleta(t.vigenteDesde)}</td>
                  <td className="px-3 py-2">
                    {t.vigenteHasta ? (
                      <span className="text-text-secondary">{formatFechaHoraCompleta(t.vigenteHasta)}</span>
                    ) : (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Vigente</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{formatCurrencyCOP(t.valorHora)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyCOP(t.valorDia)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyCOP(t.valorHoraFestivo)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyCOP(t.valorDiaFestivo)}</td>
                  <td className="px-3 py-2 text-right">{t.nocturnaActiva && t.valorHoraNocturna != null ? formatCurrencyCOP(t.valorHoraNocturna) : "—"}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyCOP(t.mensualidad1Dia)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyCOP(t.mensualidad15Dias)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrencyCOP(t.mensualidad1Mes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
