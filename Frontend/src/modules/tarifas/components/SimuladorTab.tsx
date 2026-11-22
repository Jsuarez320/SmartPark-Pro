import { useState } from "react";
import { Calculator, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Campo, ErrorBanner } from "@/shared/components/ErrorBanner";
import { formatCurrencyCOP, formatDuracion, formatFechaHoraCompleta, getApiError } from "@/shared/utils/formatters";
import { useSimularCobro } from "../hooks/useTarifas";
import type { TipoVehiculo } from "../tarifas.types";

const NOMBRE_TRAMO = { normal: "Hora normal", nocturna: "Hora nocturna", festivo: "Hora dom/festivo" } as const;

/** "2026-11-23T10:00" (hora local del equipo) → ISO con zona horaria. */
const aISO = (local: string) => new Date(local).toISOString();

export function SimuladorTab() {
  const [tipo, setTipo] = useState<TipoVehiculo>("carro");
  const [entrada, setEntrada] = useState("");
  const [salida, setSalida] = useState("");
  const simular = useSimularCobro();

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    simular.mutate({ tipo, entrada: aISO(entrada), salida: salida ? aISO(salida) : undefined });
  };

  const r = simular.data;

  return (
    <div className="space-y-6">
      <form onSubmit={enviar} className="rounded-xl border border-border p-5">
        <h3 className="text-lg font-bold text-text-primary">Simulador de cobro</h3>
        <p className="mb-4 text-sm text-text-muted">
          Calcula cuánto se cobraría por una estadía con las tarifas vigentes en la hora de salida. No guarda nada.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo etiqueta="Tipo de vehículo">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoVehiculo)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
            </select>
          </Campo>
          <Campo etiqueta="Entrada">
            <Input type="datetime-local" value={entrada} onChange={(e) => setEntrada(e.target.value)} required className="h-11" />
          </Campo>
          <Campo etiqueta="Salida" ayuda="Vacío = ahora (hora del servidor).">
            <Input type="datetime-local" value={salida} onChange={(e) => setSalida(e.target.value)} className="h-11" />
          </Campo>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={!entrada || simular.isPending} className="gap-2 bg-brand font-semibold text-white hover:bg-brand-hover">
            {simular.isPending ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
            Simular
          </Button>
        </div>
      </form>

      <ErrorBanner mensaje={simular.isError ? getApiError(simular.error, "No se pudo simular el cobro") : null} />

      {r && (
        <section className="rounded-xl border border-border p-5" aria-live="polite">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-text-muted">Total a cobrar</p>
              <p className="text-4xl font-bold text-text-primary">{formatCurrencyCOP(r.total)}</p>
            </div>
            <div className="text-right text-sm text-text-muted">
              <p>Permanencia: {formatDuracion(r.minutosTotales)}</p>
              <p>Horas cobradas: {r.horasCobradas}</p>
            </div>
          </div>
          {r.total === 0 && <p className="mt-3 text-sm text-text-muted">Dentro del tiempo de gracia: no se cobra.</p>}
          <div className="mt-4 space-y-3">
            {r.periodos.map((p, n) => (
              <div key={p.inicio} className="rounded-lg border border-border-light bg-background p-3 text-sm">
                <p className="mb-2 font-semibold text-text-secondary">
                  {r.periodos.length > 1 ? `Día ${n + 1} · ` : ""}
                  {formatFechaHoraCompleta(p.inicio)} → {formatFechaHoraCompleta(p.fin)}
                </p>
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
        </section>
      )}
    </div>
  );
}
