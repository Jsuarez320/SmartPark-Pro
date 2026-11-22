import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ErrorBanner } from "@/shared/components/ErrorBanner";
import { Modal } from "@/shared/components/Modal";
import { formatCurrencyCOP, formatFechaHoraCompleta, getApiError } from "@/shared/utils/formatters";
import { useDetalleTurno, useHistorialTurnos } from "../hooks/useCaja";
import { DiferenciaEfectivo, ResumenTurnoView } from "./ResumenTurnoView";

function DetalleTurno({ turnoId, onCerrar }: { turnoId: string | null; onCerrar: () => void }) {
  const { data, isLoading, error } = useDetalleTurno(turnoId);

  return (
    <Modal open={turnoId !== null} onClose={onCerrar} titulo="Resumen del turno" ancho="max-w-4xl">
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Cargando...
        </div>
      )}
      <ErrorBanner mensaje={error ? getApiError(error, "No se pudo cargar el turno") : null} />
      {data && (
        <div className="space-y-4">
          <ResumenTurnoView resumen={data} />
          {data.reciboNumero !== null && (
            <div className="flex justify-end">
              {/* Reimprimir el cierre es una función de Recibos: se navega allá, no se importa el módulo. */}
              <Button asChild variant="outline">
                <Link to={`/recibos?tipo=cierre_caja&numero=${data.reciboNumero}`}>Ver o reimprimir el recibo de cierre</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Historial de turnos de caja (solo administrador). */
export function HistorialTurnos() {
  const { data, isLoading, error } = useHistorialTurnos(true);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-text-primary">Historial de turnos</h2>
      <ErrorBanner mensaje={error ? getApiError(error, "No se pudo cargar el historial") : null} />
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Cargando...
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">Aún no hay turnos</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-2 py-2 font-medium">Apertura</th>
                <th className="px-2 py-2 font-medium">Cierre</th>
                <th className="px-2 py-2 font-medium">Responsable</th>
                <th className="px-2 py-2 text-right font-medium">Efectivo</th>
                <th className="px-2 py-2 text-right font-medium">Transf.</th>
                <th className="px-2 py-2 text-right font-medium">Contado</th>
                <th className="px-2 py-2 font-medium">Diferencia</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {data!.map((t) => (
                <tr key={t.turnoId} className="border-b border-border-light">
                  <td className="px-2 py-2 text-text-muted">{formatFechaHoraCompleta(t.fechaApertura)}</td>
                  <td className="px-2 py-2 text-text-muted">
                    {t.fechaCierre ? formatFechaHoraCompleta(t.fechaCierre) : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Abierta</span>}
                  </td>
                  <td className="px-2 py-2 text-text-secondary">{t.cerradoPor ?? t.abiertoPor}</td>
                  <td className="px-2 py-2 text-right text-text-secondary">{formatCurrencyCOP(t.efectivo)}</td>
                  <td className="px-2 py-2 text-right text-text-secondary">{formatCurrencyCOP(t.transferencia)}</td>
                  <td className="px-2 py-2 text-right text-text-secondary">{t.efectivoContado === null ? "—" : formatCurrencyCOP(t.efectivoContado)}</td>
                  <td className="px-2 py-2">{t.diferenciaEfectivo === null ? "—" : <DiferenciaEfectivo diferencia={t.diferenciaEfectivo} />}</td>
                  <td className="px-2 py-2 text-right">
                    <Button type="button" variant="outline" onClick={() => setSeleccionado(t.turnoId)} className="h-8 px-3 text-xs">
                      Ver resumen
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <DetalleTurno turnoId={seleccionado} onCerrar={() => setSeleccionado(null)} />
    </div>
  );
}
