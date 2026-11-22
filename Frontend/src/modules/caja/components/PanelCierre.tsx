import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Campo, ErrorBanner } from "@/shared/components/ErrorBanner";
import { InputPesos, aPesos } from "@/shared/components/InputPesos";
import { formatCurrencyCOP, getApiError } from "@/shared/utils/formatters";
import { useCerrarCaja } from "../hooks/useCaja";
import type { ResumenTurno } from "../caja.types";
import { DiferenciaEfectivo } from "./ResumenTurnoView";

interface PanelCierreProps {
  turno: ResumenTurno;
  /** Se llama con el resumen devuelto por el backend (ya incluye el recibo del cierre). */
  onCerrada: (resumen: ResumenTurno) => void;
}

/** Cierre de caja: se cuenta el efectivo y se confirma. Muestra la diferencia antes de cerrar. */
export function PanelCierre({ turno, onCerrada }: PanelCierreProps) {
  const [abierto, setAbierto] = useState(false);
  const [contado, setContado] = useState("");
  const [notas, setNotas] = useState("");
  const cerrar = useCerrarCaja();

  const contadoNum = aPesos(contado);
  const diferencia = contadoNum === null ? null : contadoNum - turno.esperadoEfectivo;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (contadoNum === null) return;
    cerrar.mutate({ efectivoContado: contadoNum, notas: notas.trim() || undefined }, { onSuccess: onCerrada });
  };

  if (!abierto) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-light">
              <Lock className="size-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Cierre de caja</h2>
              <p className="mt-1 text-sm text-text-muted">Al terminar el día, cuenta el efectivo y cierra la caja. Se imprime el resumen.</p>
            </div>
          </div>
          <Button onClick={() => setAbierto(true)} className="shrink-0 bg-brand font-semibold text-white shadow-sm hover:bg-brand-hover">
            Cerrar caja
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-bold text-text-primary">Cerrar caja</h2>
      <p className="mb-4 text-sm text-text-muted">
        Debería haber <strong className="text-text-primary">{formatCurrencyCOP(turno.esperadoEfectivo)}</strong> en efectivo
        (base {formatCurrencyCOP(turno.baseEfectivo)} + cobrado {formatCurrencyCOP(turno.efectivo)}).
      </p>

      <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Efectivo contado en caja">
          <InputPesos value={contado} onChange={setContado} placeholder="0" autoFocus className="h-12 text-lg font-bold" />
        </Campo>
        <Campo etiqueta="Notas (opcional)">
          <Input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} className="h-12" />
        </Campo>
      </div>

      {diferencia !== null && (
        <p className="mt-3 text-sm text-text-muted" aria-live="polite">
          Diferencia: <DiferenciaEfectivo diferencia={diferencia} />
        </p>
      )}

      <div className="mt-4 max-w-2xl space-y-3">
        <ErrorBanner mensaje={cerrar.isError ? getApiError(cerrar.error, "No se pudo cerrar la caja") : null} />
        <div className="flex gap-2">
          <Button type="submit" disabled={cerrar.isPending || contadoNum === null} className="h-11 gap-2 bg-brand px-6 font-semibold text-white shadow-sm hover:bg-brand-hover">
            {cerrar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            Confirmar cierre
          </Button>
          <Button type="button" variant="outline" onClick={() => setAbierto(false)} disabled={cerrar.isPending} className="h-11">
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}
