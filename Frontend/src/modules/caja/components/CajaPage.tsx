import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { AvisoImpresion } from "@/shared/components/AvisoImpresion";
import { ErrorBanner } from "@/shared/components/ErrorBanner";
import { useImprimirRecibo } from "@/shared/printing/useImprimirRecibo";
import { getApiError } from "@/shared/utils/formatters";
import { useAuthStore } from "@/stores/authStore";
import { useTurnoActual } from "../hooks/useCaja";
import { reciboDeCierre } from "../services/caja.service";
import type { ResumenTurno } from "../caja.types";
import { HistorialTurnos } from "./HistorialTurnos";
import { PanelApertura } from "./PanelApertura";
import { PanelCierre } from "./PanelCierre";
import { ReportesPeriodo } from "./ReportesPeriodo";
import { ResumenTurnoView } from "./ResumenTurnoView";

/** Caja: apertura con bases, resumen en vivo por medio de pago, cierre con resumen imprimible. */
export function CajaPage() {
  const esAdmin = useAuthStore((s) => s.user?.role === "admin");
  const { data: turno, isLoading, error } = useTurnoActual();
  const [cierre, setCierre] = useState<ResumenTurno | null>(null);
  const impresion = useImprimirRecibo();

  const alCerrar = (resumen: ResumenTurno) => {
    setCierre(resumen);
    const recibo = reciboDeCierre(resumen);
    // Si la impresora falla la caja ya quedó cerrada: se avisa y se puede reimprimir desde Recibos.
    if (recibo) void impresion.imprimir(recibo);
  };

  const reintentar = () => {
    const recibo = cierre && reciboDeCierre(cierre);
    if (recibo) void impresion.imprimir(recibo);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Caja</h1>
        <p className="mt-1 text-sm text-text-muted">
          {esAdmin ? "Administra los turnos de caja y revisa los ingresos" : "Abre y cierra la caja del día"}
        </p>
      </div>

      <ErrorBanner mensaje={error ? getApiError(error, "No se pudo consultar la caja") : null} />
      <AvisoImpresion estado={impresion.estado} onReintentar={reintentar} onCerrar={impresion.limpiar} />

      {cierre && (
        <section className="space-y-4 rounded-xl border border-green-200 bg-green-50/40 p-5" aria-label="Caja cerrada">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-primary">Caja cerrada</h2>
              <p className="text-sm text-text-muted">Recibo de cierre No. {String(cierre.reciboNumero ?? "").padStart(6, "0")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={reintentar} disabled={impresion.imprimiendo} className="gap-2">
                {impresion.imprimiendo ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                Imprimir resumen
              </Button>
              <Button type="button" variant="outline" onClick={() => setCierre(null)}>
                Ocultar
              </Button>
            </div>
          </div>
          <ResumenTurnoView resumen={cierre} />
          <p className="text-xs text-text-muted">
            ¿Necesitas otra copia más tarde? Búscala en <Link to="/recibos" className="font-semibold text-brand underline">Recibos</Link>.
          </p>
        </section>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Consultando la caja...
        </div>
      ) : turno ? (
        <>
          <ResumenTurnoView resumen={turno} />
          <PanelCierre turno={turno} onCerrada={alCerrar} />
        </>
      ) : (
        <PanelApertura />
      )}

      {esAdmin && (
        <>
          <HistorialTurnos />
          <ReportesPeriodo />
        </>
      )}
    </div>
  );
}
