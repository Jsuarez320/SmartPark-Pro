import { X, Printer, CheckCircle, Banknote, CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useReceipt } from "../hooks/useReceipt";

interface PagoModalProps {
  open: boolean;
  onClose: () => void;
  placa?: string;
}

const montosRapidos = [5000, 10000, 20000, 50000];

const metodos = [
  { value: "efectivo" as const, label: "Efectivo", icon: Banknote },
  { value: "tarjeta" as const, label: "Tarjeta", icon: CreditCard },
  { value: "nequi" as const, label: "Nequi", icon: Smartphone },
];

export function PagoModal({ open, onClose, placa = "ABC123" }: PagoModalProps) {
  const {
    cargando,
    pagado,
    datosRecibo,
    metodoPago,
    setMetodoPago,
    montoRecibido,
    setMontoRecibido,
    agregarMonto,
    pagar,
    imprimir,
    reiniciar,
  } = useReceipt();

  if (!open) return null;

  const cambio = Math.max(0, montoRecibido - (datosRecibo?.total ?? 0));

  const handlePagar = async () => {
    await pagar(placa);
  };

  const handleCerrar = () => {
    reiniciar();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <button
          onClick={handleCerrar}
          className="absolute right-4 top-4 text-text-subtle hover:text-text-muted"
        >
          <X className="size-5" />
        </button>

        {/* ── PAGO ── */}
        {!pagado && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Finalizar Pago</h2>
              <p className="text-sm text-text-muted mt-1">Registre la salida del vehículo</p>
            </div>

            <div className="rounded-xl bg-background border border-border p-4 space-y-1">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Vehículo</p>
              <p className="text-2xl font-bold text-text-primary">{placa}</p>
              <div className="flex gap-4 text-sm text-text-muted mt-2">
                <span>Ingreso: 18:30</span>
                <span>Tiempo: 1h 30min</span>
              </div>
              <p className="text-3xl font-bold text-text-primary mt-3">
                $3.200
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-text-secondary">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {metodos.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMetodoPago(m.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-sm font-medium transition-colors ${
                      metodoPago === m.value
                        ? "border-brand bg-brand-light text-brand"
                        : "border-border text-text-muted hover:border-brand/50"
                    }`}
                  >
                    <m.icon className="size-5" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {metodoPago === "efectivo" && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Monto recibido</label>
                  <Input
                    type="number"
                    value={montoRecibido || ""}
                    onChange={(e) => setMontoRecibido(Number(e.target.value))}
                    placeholder="$0"
                    className="h-11 mt-1 text-lg font-bold"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {montosRapidos.map((m) => (
                    <button
                      key={m}
                      onClick={() => agregarMonto(m)}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background"
                    >
                      ${m.toLocaleString()}
                    </button>
                  ))}
                </div>

                {cambio > 0 && (
                  <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                    <p className="text-sm text-green-600 font-medium">Cambio</p>
                    <p className="text-xl font-bold text-green-700">${cambio.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handlePagar}
              disabled={cargando || (metodoPago === "efectivo" && montoRecibido <= 0)}
              className="w-full h-12 bg-brand hover:bg-brand-hover text-white font-bold text-base"
            >
              {cargando ? "Procesando..." : "Finalizar Pago"}
            </Button>
          </div>
        )}

        {/* ── RECIBO ── */}
        {pagado && datosRecibo && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="size-7 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Pago Exitoso</h2>
              <p className="text-sm text-text-muted mt-1">
                Ticket {datosRecibo.ticket}
              </p>
            </div>

            <div className="rounded-xl bg-background border border-border p-5 font-mono text-sm space-y-2">
              <div className="text-center border-b border-dashed border-border pb-3 mb-3">
                <p className="font-bold text-base text-text-primary">SMART PARK PRO</p>
                <p className="text-xs text-text-muted">Parqueadero</p>
                <p className="text-xs text-text-muted">{datosRecibo.fecha}</p>
              </div>

              <div className="flex justify-between">
                <span className="text-text-muted">Ticket</span>
                <span className="font-bold text-text-primary">{datosRecibo.ticket}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Placa</span>
                <span className="font-bold text-text-primary">{datosRecibo.placa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Tipo</span>
                <span>{datosRecibo.tipo}</span>
              </div>

              <div className="border-t border-dashed border-border pt-2 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-muted">Ingreso</span>
                  <span>{datosRecibo.horaIngreso}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Salida</span>
                  <span>{datosRecibo.horaSalida}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Tiempo</span>
                  <span>{datosRecibo.tiempoTranscurrido}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-border pt-2 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-muted">Tarifa</span>
                  <span>${datosRecibo.tarifa.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL</span>
                  <span className="text-brand">${datosRecibo.total.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-border pt-2 mt-2 flex justify-between">
                <span className="text-text-muted">Pago</span>
                <span className="capitalize">{datosRecibo.metodoPago}</span>
              </div>

              <div className="text-center mt-3 pt-2 border-t border-dashed border-border">
                <p className="text-xs text-text-muted">¡Gracias por su preferencia!</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={imprimir}
                className="flex-1 h-11 bg-brand hover:bg-brand-hover text-white font-semibold gap-2"
              >
                <Printer className="size-4" />
                Imprimir Recibo
              </Button>
              <Button
                variant="outline"
                onClick={handleCerrar}
                className="flex-1 h-11 border-border text-text-muted font-semibold"
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
