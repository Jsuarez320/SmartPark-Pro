import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, Lock, Car, Bike } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAuthStore, isAdminRole } from "@/stores/authStore";

export function CajaPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminRole(user?.role);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const periodoActivo = "Día";

  const dineroEnCaja = 0;
  const ingresosDelDia = 0;
  const entregadoHoy = 0;
  const transaccionesHoy = 0;
  const carrosHoy = 0;
  const motosHoy = 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Caja</h1>
        <p className="text-sm text-text-muted mt-1">
          {isAdmin ? "Administre los ingresos y movimientos de caja" : "Resumen de caja del día"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Dinero en Caja</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-light">
              <DollarSign className="size-4 text-brand" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            ${dineroEnCaja.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Ingresos del Día</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="size-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            ${ingresosDelDia.toLocaleString()}
          </p>
          <p className="text-xs text-text-subtle mt-1 flex items-center gap-1">
            <span className="inline-block size-1.5 rounded-full bg-green-500" />
            {transaccionesHoy} transacciones
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Entregado Hoy</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-50">
              <TrendingDown className="size-4 text-destructive" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            ${entregadoHoy.toLocaleString()}
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-light shrink-0">
                <Lock className="size-5 text-brand" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Cierre de Caja</h2>
                <p className="text-sm text-text-muted mt-1">
                  Al finalizar tu turno, entrega el dinero y cierra la caja
                </p>
              </div>
            </div>
            <Button
              onClick={() => setMostrarConfirmacion(true)}
              className="bg-brand hover:bg-brand-hover text-white font-semibold shadow-sm shrink-0"
            >
              Cerrar Caja
            </Button>
          </div>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Car className="size-4 text-brand" />
                <p className="text-sm font-medium text-text-secondary">Carros Hoy</p>
              </div>
              <p className="text-2xl font-bold text-text-primary">{carrosHoy}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Bike className="size-4 text-vehicle-moto" />
                <p className="text-sm font-medium text-text-secondary">Motos Hoy</p>
              </div>
              <p className="text-2xl font-bold text-text-primary">{motosHoy}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-primary">Historial de Ingresos</h2>
              <div className="flex gap-1 bg-background rounded-lg p-1 border border-border">
                {["Día", "Semana", "Mes", "Año"].map((p) => (
                  <button
                    key={p}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      p === periodoActivo
                        ? "bg-brand text-white shadow-sm"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                <p className="text-sm text-blue-600 font-medium">Total del Día</p>
                <p className="text-xl font-bold text-text-primary mt-1">$0</p>
                <p className="text-xs text-blue-400 mt-0.5">0 transacciones</p>
              </div>
              <div className="rounded-lg bg-brand-light border border-brand/20 p-4">
                <p className="text-sm text-brand font-medium">Por Carros</p>
                <p className="text-xl font-bold text-text-primary mt-1">$0</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-100 p-4">
                <p className="text-sm text-vehicle-moto font-medium">Por Motos</p>
                <p className="text-xl font-bold text-text-primary mt-1">$0</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-text-secondary mb-3">Transacciones Recientes</h3>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-text-muted">Conecta con la API para ver las transacciones</p>
              </div>
            </div>
          </div>
        </>
      )}

      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-brand-light">
                <ArrowUpRight className="size-7 text-brand" />
              </div>
              <h2 className="text-xl font-bold text-text-primary">¿Cerrar Caja?</h2>
              <p className="text-sm text-text-muted mt-1">
                Vas a entregar <strong className="text-text-primary">${dineroEnCaja.toLocaleString()}</strong> de la caja
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setMostrarConfirmacion(false)}
                className="flex-1 h-11 border-border text-text-muted font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => setMostrarConfirmacion(false)}
                className="flex-1 h-11 bg-brand hover:bg-brand-hover text-white font-semibold shadow-sm"
              >
                Confirmar Cierre
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
