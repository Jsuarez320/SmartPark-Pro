import { useEffect, useRef, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ErrorBanner } from "@/shared/components/ErrorBanner";
import { InputPesos, aPesos } from "@/shared/components/InputPesos";
import { MedioPagoSelector } from "@/shared/components/MedioPagoSelector";
import { Modal } from "@/shared/components/Modal";
import { formatCurrencyCOP, formatDuracion, formatFechaHoraCompleta } from "@/shared/utils/formatters";
import type { MedioPago, SalidaPendiente } from "../operaciones.types";
import { DesgloseCobro } from "./DesgloseCobro";

interface PanelPagoProps {
  pendiente: SalidaPendiente | null;
  procesando: boolean;
  error: string | null;
  onConfirmar: (medio: MedioPago, referencia: string) => void;
  onCancelar: () => void;
}

/**
 * Cobro de una salida. El medio de pago es obligatorio. Solo teclado:
 *   1 = Efectivo · 2 = Transferencia · Enter = confirmar · Esc = cancelar.
 * El foco queda en «Confirmar»: el caso normal es placa + Enter + Enter.
 */
export function PanelPago({ pendiente, procesando, error, onConfirmar, onCancelar }: PanelPagoProps) {
  const [medio, setMedio] = useState<MedioPago>("efectivo");
  const [recibido, setRecibido] = useState("");
  const [referencia, setReferencia] = useState("");
  const confirmarRef = useRef<HTMLButtonElement>(null);

  // Cada salida nueva empieza en efectivo y sin datos escritos.
  useEffect(() => {
    setMedio("efectivo");
    setRecibido("");
    setReferencia("");
  }, [pendiente?.ingresoId]);

  const total = pendiente?.cobro.total ?? 0;
  const recibidoNum = aPesos(recibido);
  const vuelto = medio === "efectivo" && recibidoNum !== null ? recibidoNum - total : null;

  const alPulsarTecla = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return; // dentro de un campo, los números se escriben
    if (e.key === "1") setMedio("efectivo");
    else if (e.key === "2") setMedio("transferencia");
  };

  return (
    <Modal
      open={pendiente !== null}
      onClose={() => !procesando && onCancelar()}
      titulo="Cobrar salida"
      descripcion="Revisa el valor, elige el medio de pago y confirma."
      enfocarAlAbrir={confirmarRef}
    >
      {pendiente && (
        <form
          onKeyDown={alPulsarTecla}
          onSubmit={(e) => {
            e.preventDefault();
            onConfirmar(medio, referencia);
          }}
          className="space-y-4"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold tracking-widest text-text-primary">{pendiente.placa}</p>
              <p className="text-sm capitalize text-text-muted">{pendiente.tipoVehiculo}</p>
            </div>
            <div className="text-right text-sm text-text-muted">
              <p>Entrada: {formatFechaHoraCompleta(pendiente.horaEntrada)}</p>
              <p>Salida: {formatFechaHoraCompleta(pendiente.horaSalida)}</p>
              <p className="font-medium text-text-secondary">
                Permanencia {formatDuracion(pendiente.cobro.minutosTotales)} · {pendiente.cobro.horasCobradas} h cobradas
              </p>
            </div>
          </div>

          <DesgloseCobro cobro={pendiente.cobro} />

          <div className="rounded-xl border border-border bg-background p-4 text-center">
            <p className="text-sm text-text-muted">Total a cobrar</p>
            <p className="text-5xl font-bold text-text-primary" aria-live="polite">
              {formatCurrencyCOP(total)}
            </p>
          </div>

          <MedioPagoSelector value={medio} onChange={setMedio} disabled={procesando} mostrarAtajos />

          {medio === "efectivo" ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Efectivo recibido (opcional, para calcular el vuelto)</label>
              <InputPesos value={recibido} onChange={setRecibido} placeholder="0" disabled={procesando} className="h-11" />
              {vuelto !== null && (
                <p className={`text-sm font-semibold ${vuelto >= 0 ? "text-green-700" : "text-destructive"}`} aria-live="polite">
                  {vuelto >= 0 ? `Vuelto: ${formatCurrencyCOP(vuelto)}` : `Faltan ${formatCurrencyCOP(-vuelto)}`}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Referencia de la transferencia (opcional)</label>
              <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={100} disabled={procesando} className="h-11" />
            </div>
          )}

          <ErrorBanner mensaje={error} />

          <div className="flex gap-2">
            <Button
              ref={confirmarRef}
              type="submit"
              disabled={procesando}
              className="h-12 flex-1 gap-2 bg-brand text-base font-semibold text-white shadow-sm hover:bg-brand-hover"
            >
              {procesando ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
              Confirmar cobro
              <kbd className="rounded border border-white/40 px-1.5 text-xs font-normal">Enter</kbd>
            </Button>
            <Button type="button" variant="outline" onClick={onCancelar} disabled={procesando} className="h-12">
              Cancelar
              <kbd className="ml-1 rounded border border-border px-1.5 text-xs font-normal text-text-muted">Esc</kbd>
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
