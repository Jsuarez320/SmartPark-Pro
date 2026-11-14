import { useCallback, useState } from "react";
import { Car, Clock, Bike, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatDuracion, formatHora } from "@/shared/utils/formatters";
import { NotificacionTarjeta } from "@/shared/components/NotificacionTarjeta";
import { usePatio } from "../hooks/usePatio";
import { PagoModal } from "./PagoModal";
import { BuscarTarjetaModal } from "./BuscarTarjetaModal";

export function PagoPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [buscarOpen, setBuscarOpen] = useState(false);
  const [tarjetaDetectada, setTarjetaDetectada] = useState<string | null>(null);

  const { vehiculos, cargando, error, recargar } = usePatio("");

  const abrirPago = (ingresoId: string) => {
    setSelectedId(ingresoId);
    setModalOpen(true);
  };

  const handleEncontrado = (ingresoId: string, tarjeta: string) => {
    setBuscarOpen(false);
    setTarjetaDetectada(tarjeta);
    abrirPago(ingresoId);
  };

  const cerrarNotificacion = useCallback(() => setTarjetaDetectada(null), []);

  return (
    <div className="space-y-6">
      <NotificacionTarjeta codigo={tarjetaDetectada} onClose={cerrarNotificacion} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Cobrar Salida</h1>
          <p className="text-sm text-text-muted mt-1">
            Pulse Cobrar y pase la tarjeta por el lector para registrar la salida
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
            <Car className="size-4 text-brand" />
            <span className="text-sm text-text-muted">En patio:</span>
            <span className="font-bold text-text-primary">{vehiculos.length}</span>
          </div>
          <Button
            onClick={() => setBuscarOpen(true)}
            className="h-11 px-6 bg-brand hover:bg-brand-hover text-white font-bold shadow-sm"
          >
            <CreditCard className="size-4 mr-2" /> Cobrar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Cargando vehículos...
        </div>
      ) : vehiculos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border bg-surface">
          <Car className="size-12 text-text-subtle mb-4" />
          <p className="text-base font-medium text-text-muted">No hay vehículos en patio</p>
          <p className="text-sm text-text-subtle mt-1">
            Registra un ingreso para verlo aquí
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {vehiculos.map((v) => (
            <div
              key={v.ingresoId}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex size-11 items-center justify-center rounded-lg ${
                    v.tipo === "moto" ? "bg-red-50" : "bg-brand-light"
                  }`}
                >
                  {v.tipo === "moto" ? (
                    <Bike className="size-5 text-vehicle-moto" />
                  ) : (
                    <Car className="size-5 text-brand" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-text-primary text-base">{v.placa}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted mt-0.5">
                    <span className="font-mono">{v.tarjeta}</span>
                    <span className="capitalize">{v.tipo}</span>
                    <span>{v.plan}{v.membresia ? " (membresía)" : ""}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatHora(v.fechaIngreso)} ({formatDuracion(v.minutos)})
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold text-text-primary">${v.valor.toLocaleString("es-CO")}</p>
            </div>
          ))}
        </div>
      )}

      <BuscarTarjetaModal
        open={buscarOpen}
        onClose={() => setBuscarOpen(false)}
        onEncontrado={handleEncontrado}
      />

      <PagoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ingresoId={selectedId}
        onPagado={recargar}
      />
    </div>
  );
}
