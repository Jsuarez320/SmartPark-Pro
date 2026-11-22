import { formatCurrencyCOP, formatFechaHoraCompleta } from "@/shared/utils/formatters";
import type { CobroOperacion } from "../operaciones.types";

const NOMBRE_TRAMO = { normal: "Hora", nocturna: "Hora nocturna", festivo: "Hora dom/festivo" } as const;

/** Detalle del cobro por horas: tramos de cada periodo de 24 h y el tope diario si se aplicó. */
export function DesgloseCobro({ cobro }: { cobro: CobroOperacion }) {
  return (
    <div className="space-y-2 text-sm">
      {cobro.periodos.map((p, n) => (
        <div key={p.inicio} className="rounded-lg border border-border-light bg-background p-3">
          {cobro.periodos.length > 1 && (
            <p className="mb-1 text-xs font-semibold text-text-muted">
              Día {n + 1}: {formatFechaHoraCompleta(p.inicio)} → {formatFechaHoraCompleta(p.fin)}
            </p>
          )}
          {p.tramos.map((t) => (
            <div key={t.tipo} className="flex justify-between text-text-secondary">
              <span>
                {t.horas} h · {NOMBRE_TRAMO[t.tipo]} × {formatCurrencyCOP(t.valorHora)}
              </span>
              <span>{formatCurrencyCOP(t.subtotal)}</span>
            </div>
          ))}
          {p.topeAplicado && (
            <div className="mt-1 flex justify-between font-semibold text-brand">
              <span>Tope del día aplicado</span>
              <span>{formatCurrencyCOP(p.total)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
