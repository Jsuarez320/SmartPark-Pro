import { useState } from "react";
import { Loader2, LockOpen } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Campo, ErrorBanner } from "@/shared/components/ErrorBanner";
import { InputPesos, aPesos } from "@/shared/components/InputPesos";
import { getApiError } from "@/shared/utils/formatters";
import { useAbrirCaja } from "../hooks/useCaja";

/** Apertura de la caja con la base inicial de efectivo y, si aplica, de transferencias. Enter envía. */
export function PanelApertura() {
  const [efectivo, setEfectivo] = useState("");
  const [transferencia, setTransferencia] = useState("");
  const abrir = useAbrirCaja();

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    abrir.mutate({ baseEfectivo: aPesos(efectivo) ?? 0, baseTransferencia: aPesos(transferencia) ?? 0 });
  };

  return (
    <form onSubmit={enviar} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-light">
          <LockOpen className="size-5 text-brand" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary">Caja cerrada</h2>
          <p className="mt-1 text-sm text-text-muted">
            Abre la caja con la base inicial para poder cobrar salidas y mensualidades. Sin caja abierta no se puede cobrar.
          </p>
        </div>
      </div>

      <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Base inicial de efectivo">
          <InputPesos value={efectivo} onChange={setEfectivo} placeholder="0" autoFocus className="h-12 text-lg font-bold" />
        </Campo>
        <Campo etiqueta="Base inicial de transferencias" ayuda="Opcional. Déjalo vacío si no aplica.">
          <InputPesos value={transferencia} onChange={setTransferencia} placeholder="0" className="h-12 text-lg font-bold" />
        </Campo>
      </div>

      <div className="mt-4 max-w-2xl space-y-3">
        <ErrorBanner mensaje={abrir.isError ? getApiError(abrir.error, "No se pudo abrir la caja") : null} />
        <Button type="submit" disabled={abrir.isPending} className="h-12 gap-2 bg-brand px-6 font-semibold text-white shadow-sm hover:bg-brand-hover">
          {abrir.isPending ? <Loader2 className="size-4 animate-spin" /> : <LockOpen className="size-4" />}
          Abrir caja
        </Button>
      </div>
    </form>
  );
}
