import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Campo, ErrorBanner } from "@/shared/components/ErrorBanner";
import { MedioPagoSelector } from "@/shared/components/MedioPagoSelector";
import { Modal } from "@/shared/components/Modal";
import { formatCurrencyCOP, formatDia, getApiError } from "@/shared/utils/formatters";
import { useRenovarMensualidad, usePreciosMensualidad } from "../hooks/useMensualidades";
import {
  NOMBRE_JORNADA,
  NOMBRE_PERIODO,
  type Jornada,
  type Mensualidad,
  type MedioPago,
  type PeriodoMensualidad,
  type RespuestaMensualidad,
} from "../mensualidades.types";
import { textoDias } from "./EstadoBadge";

const SELECT = "flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

interface ModalRenovarProps {
  mensualidad: Mensualidad | null;
  onClose: () => void;
  onRenovada: (respuesta: RespuestaMensualidad) => void;
}

/** Renovar: registra un pago nuevo y extiende la vigencia. Exige medio de pago y caja abierta. */
export function ModalRenovar({ mensualidad, onClose, onRenovada }: ModalRenovarProps) {
  const [periodo, setPeriodo] = useState<PeriodoMensualidad>("1_mes");
  const [jornada, setJornada] = useState<Jornada>("completa");
  const [medio, setMedio] = useState<MedioPago>("efectivo");
  const [referencia, setReferencia] = useState("");
  const renovar = useRenovarMensualidad();
  const precios = usePreciosMensualidad();

  // Cada vez que se abre para otra mensualidad, parte de sus valores actuales.
  useEffect(() => {
    if (!mensualidad) return;
    setPeriodo(mensualidad.periodo);
    setJornada(mensualidad.jornada);
    setMedio("efectivo");
    setReferencia("");
    renovar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensualidad?.id]);

  const precio = mensualidad ? precios.data?.[mensualidad.tipoVehiculo]?.[periodo] : undefined;

  const cerrar = () => {
    if (!renovar.isPending) onClose();
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensualidad) return;
    renovar.mutate(
      {
        id: mensualidad.id,
        datos: {
          periodo,
          jornada,
          medioPago: medio,
          referencia: medio === "transferencia" ? referencia.trim() || undefined : undefined,
        },
      },
      { onSuccess: onRenovada },
    );
  };

  return (
    <Modal
      open={mensualidad !== null}
      onClose={cerrar}
      titulo="Renovar mensualidad"
      descripcion="Registra un pago nuevo y extiende la vigencia."
    >
      {mensualidad && (
        <form onSubmit={enviar} className="space-y-4">
          <div className="rounded-lg border border-border bg-background p-3 text-sm">
            <p className="text-lg font-bold tracking-widest text-text-primary">{mensualidad.placa}</p>
            <p className="text-text-muted">{mensualidad.cliente}</p>
            <p className="mt-1 text-text-secondary">
              Vigente hasta <strong>{formatDia(mensualidad.fechaFin)}</strong> ({textoDias(mensualidad.diasRestantes).toLowerCase()})
            </p>
            <p className="mt-1 text-xs text-text-subtle">
              La renovación empieza el día siguiente al vencimiento (o hoy, si ya venció): no se pierden ni se cobran días de más.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Periodo">
              <select value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoMensualidad)} className={SELECT} autoFocus>
                {(Object.keys(NOMBRE_PERIODO) as PeriodoMensualidad[]).map((p) => (
                  <option key={p} value={p}>
                    {NOMBRE_PERIODO[p]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Jornada">
              <select value={jornada} onChange={(e) => setJornada(e.target.value as Jornada)} className={SELECT}>
                {(Object.keys(NOMBRE_JORNADA) as Jornada[]).map((j) => (
                  <option key={j} value={j}>
                    {NOMBRE_JORNADA[j]}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-text-muted">Total a cobrar</span>
              <span className="text-2xl font-bold text-text-primary" aria-live="polite">
                {precio === undefined ? "—" : formatCurrencyCOP(precio)}
              </span>
            </div>
            <MedioPagoSelector value={medio} onChange={setMedio} disabled={renovar.isPending} />
            {medio === "transferencia" && (
              <div className="mt-3">
                <Campo etiqueta="Referencia de la transferencia (opcional)">
                  <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={100} className="h-11" />
                </Campo>
              </div>
            )}
          </div>

          <ErrorBanner mensaje={renovar.isError ? getApiError(renovar.error, "No se pudo renovar la mensualidad") : null} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cerrar} disabled={renovar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={renovar.isPending} className="gap-2 bg-brand font-semibold text-white hover:bg-brand-hover">
              {renovar.isPending && <Loader2 className="size-4 animate-spin" />}
              Renovar y cobrar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
