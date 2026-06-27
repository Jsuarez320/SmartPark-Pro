import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useCaja } from "../hooks/useCaja";

export function CajaPage() {
  const {
    periodoActivo,
    setPeriodoActivo,
    periodos,
    resumen,
    ingresos,
    transacciones,
    retiros,
  } = useCaja();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Cierre de Caja</h1>
        <p className="text-sm text-text-muted mt-1">
          Administra los ingresos del día y los movimientos de la caja.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Dinero en Caja</p>
            <DollarSign className="size-4 text-brand" />
          </div>
          <p className="text-2xl font-bold text-text-primary">${resumen.dineroEnCaja.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Ingresos del Día</p>
            <TrendingUp className="size-4 text-brand" />
          </div>
          <p className="text-2xl font-bold text-text-primary">${resumen.ingresosDelDia.toLocaleString()}</p>
          <p className="text-xs text-text-subtle mt-1 flex items-center gap-1">
            <span className="inline-block size-1.5 rounded-full bg-brand" />
            Actualización automática
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Entregado Hoy</p>
            <TrendingDown className="size-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold text-text-primary">${resumen.entregadoHoy.toLocaleString()}</p>
          <Button className="w-full mt-3 bg-brand hover:bg-brand-hover text-white font-semibold h-10 rounded-lg">
            Entregar dinero
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">Historial de Ingresos</h2>
          <div className="flex gap-2">
            {periodos.map((p) => (
              <button
                key={p}
                onClick={() => setPeriodoActivo(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  p === periodoActivo
                    ? "bg-brand text-white"
                    : "bg-background border border-border text-text-muted hover:bg-background"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm text-blue-600 font-medium">Total del Día</p>
            <p className="text-xl font-bold text-text-primary mt-1">${ingresos.total.toLocaleString()}</p>
            <p className="text-xs text-blue-400 mt-0.5">{ingresos.transacciones} transacciones</p>
          </div>
          <div className="rounded-lg bg-green-50 border border-green-100 p-4">
            <p className="text-sm text-green-600 font-medium">Por Carros</p>
            <p className="text-xl font-bold text-text-primary mt-1">${ingresos.porCarros.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-purple-50 border border-purple-100 p-4">
            <p className="text-sm text-purple-600 font-medium">Por Motos</p>
            <p className="text-xl font-bold text-text-primary mt-1">${ingresos.porMotos.toLocaleString()}</p>
          </div>
        </div>

        <h3 className="text-sm font-bold text-text-secondary mb-3">Desglose por Tipo de Pago</h3>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Mensual", value: ingresos.porTipoPago.mensual },
            { label: "Diario", value: ingresos.porTipoPago.diario },
            { label: "Por Tiempo", value: ingresos.porTipoPago.porTiempo },
            { label: "Evento", value: ingresos.porTipoPago.evento },
          ].map((tipo) => (
            <div key={tipo.label} className="rounded-lg bg-background border border-border p-3 text-center">
              <p className="text-xs text-text-muted">{tipo.label}</p>
              <p className="text-lg font-bold text-text-primary mt-1">${tipo.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-bold text-text-secondary mb-3">Transacciones Recientes</h3>
        {transacciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-text-muted">No hay transacciones registradas aún.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transacciones.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-background border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{t.placa}</p>
                  <p className="text-xs text-text-muted">{t.tipo} · {t.metodoPago}</p>
                </div>
                <p className="text-sm font-bold text-text-primary">${t.monto.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-text-primary mb-4">Retiros Recientes</h2>
        {retiros.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-text-muted">No hay retiros registrados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {retiros.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-background border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">${r.monto.toLocaleString()}</p>
                  <p className="text-xs text-text-muted">{r.motivo}</p>
                </div>
                <p className="text-xs text-text-muted">{r.fecha}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
