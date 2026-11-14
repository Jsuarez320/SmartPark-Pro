import { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Lock,
  LockOpen,
  Car,
  Bike,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useAuthStore, isAdminRole } from "@/stores/authStore";
import { formatCurrencyCOP, formatFechaHora, formatHora } from "@/shared/utils/formatters";
import { useCaja } from "../hooks/useCaja";

export function CajaPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminRole(user?.role);
  const {
    periodoActivo, setPeriodoActivo, periodos,
    turno, cargando, procesando, error, limpiarError,
    ingresos, transacciones, historial,
    ultimoCierre, descartarCierre,
    abrir, cerrar,
  } = useCaja(isAdmin);

  const [montoInicial, setMontoInicial] = useState("");
  const [mostrarCierre, setMostrarCierre] = useState(false);
  const [montoContado, setMontoContado] = useState("");
  const [notas, setNotas] = useState("");

  const handleAbrir = async () => {
    if (await abrir(Number(montoInicial) || 0)) setMontoInicial("");
  };

  const handleCerrar = async () => {
    if (await cerrar(Number(montoContado), notas)) {
      setMostrarCierre(false);
      setMontoContado("");
      setNotas("");
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" /> Cargando caja...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Caja</h1>
        <p className="text-sm text-text-muted mt-1">
          {isAdmin ? "Administre los ingresos y turnos de caja" : "Abra y cierre su turno de caja"}
        </p>
      </div>

      {error && (
        <div
          className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          <span>{error}</span>
          <button onClick={limpiarError} className="font-semibold">Cerrar</button>
        </div>
      )}

      {turno ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-text-muted">Efectivo esperado en caja</p>
                <div className="flex size-8 items-center justify-center rounded-lg bg-brand-light">
                  <DollarSign className="size-4 text-brand" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary">{formatCurrencyCOP(turno.totalEsperadoCaja)}</p>
              <p className="text-xs text-text-subtle mt-1">Base + cobros en efectivo</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-text-muted">Recaudado en el turno</p>
                <div className="flex size-8 items-center justify-center rounded-lg bg-green-50">
                  <TrendingUp className="size-4 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary">{formatCurrencyCOP(turno.totalRecaudado)}</p>
              <p className="text-xs text-text-subtle mt-1 flex items-center gap-1">
                <span className="inline-block size-1.5 rounded-full bg-green-500" />
                {turno.totalTransacciones} transacciones · otros métodos {formatCurrencyCOP(turno.otrosMetodos)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-text-muted">Monto inicial</p>
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50">
                  <Wallet className="size-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary">{formatCurrencyCOP(turno.montoInicial)}</p>
              <p className="text-xs text-text-subtle mt-1">
                Abierta por {turno.abiertoPor} a las {formatHora(turno.fechaApertura)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-light shrink-0">
                  <Lock className="size-5 text-brand" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Cierre de Caja</h2>
                  <p className="text-sm text-text-muted mt-1">
                    Al finalizar el turno, cuente el efectivo y cierre la caja
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setMostrarCierre(true)}
                className="bg-brand hover:bg-brand-hover text-white font-semibold shadow-sm shrink-0"
              >
                Cerrar Caja
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand-light shrink-0">
              <LockOpen className="size-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Caja cerrada</h2>
              <p className="text-sm text-text-muted mt-1">
                Debe abrir un turno de caja para poder cobrar salidas y membresías
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end max-w-lg">
            <div className="flex-1">
              <label className="text-sm font-medium text-text-secondary">Efectivo inicial (base)</label>
              <Input
                type="number"
                min={0}
                value={montoInicial}
                onChange={(e) => setMontoInicial(e.target.value)}
                placeholder="$0"
                className="h-12 mt-1.5 text-lg font-bold"
              />
            </div>
            <Button
              onClick={handleAbrir}
              disabled={procesando}
              className="h-12 px-6 bg-brand hover:bg-brand-hover text-white font-semibold shadow-sm"
            >
              {procesando ? <Loader2 className="size-4 animate-spin" /> : "Abrir Caja"}
            </Button>
          </div>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text-primary">Historial de Ingresos</h2>
              <div className="flex gap-1 bg-background rounded-lg p-1 border border-border">
                {periodos.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodoActivo(p)}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                <p className="text-sm text-blue-600 font-medium">Total ({periodoActivo})</p>
                <p className="text-xl font-bold text-text-primary mt-1">{formatCurrencyCOP(ingresos?.total ?? 0)}</p>
                <p className="text-xs text-blue-400 mt-0.5">{ingresos?.transacciones ?? 0} transacciones</p>
              </div>
              <div className="rounded-lg bg-brand-light border border-brand/20 p-4">
                <p className="flex items-center gap-1.5 text-sm text-brand font-medium">
                  <Car className="size-4" /> Por Carros
                </p>
                <p className="text-xl font-bold text-text-primary mt-1">{formatCurrencyCOP(ingresos?.porCarros ?? 0)}</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-100 p-4">
                <p className="flex items-center gap-1.5 text-sm text-vehicle-moto font-medium">
                  <Bike className="size-4" /> Por Motos
                </p>
                <p className="text-xl font-bold text-text-primary mt-1">{formatCurrencyCOP(ingresos?.porMotos ?? 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-sm">
              {[
                ["Por tiempo", ingresos?.porConcepto.tiempo],
                ["Medio día", ingresos?.porConcepto.medioDia],
                ["Día completo", ingresos?.porConcepto.diaCompleto],
                ["Membresías", ingresos?.porConcepto.membresia],
              ].map(([label, valor]) => (
                <div key={label as string} className="rounded-lg border border-border p-3">
                  <p className="text-text-muted">{label}</p>
                  <p className="font-bold text-text-primary">{formatCurrencyCOP((valor as number) ?? 0)}</p>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-bold text-text-secondary mb-3">Transacciones</h3>
            {transacciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-text-muted">No hay transacciones en este periodo</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-muted">
                      <th className="py-2 px-2 font-medium">Fecha</th>
                      <th className="py-2 px-2 font-medium">Placa</th>
                      <th className="py-2 px-2 font-medium">Concepto</th>
                      <th className="py-2 px-2 font-medium">Método</th>
                      <th className="py-2 px-2 font-medium text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transacciones.map((t) => (
                      <tr key={t.id} className="border-b border-border-light">
                        <td className="py-2 px-2 text-text-muted">{formatFechaHora(t.fecha)}</td>
                        <td className="py-2 px-2 font-bold text-text-primary">{t.placa}</td>
                        <td className="py-2 px-2 text-text-secondary">{t.concepto}</td>
                        <td className="py-2 px-2 capitalize text-text-secondary">{t.metodoPago}</td>
                        <td className="py-2 px-2 text-right font-bold text-text-primary">{formatCurrencyCOP(t.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-bold text-text-primary mb-4">Turnos Cerrados</h2>
            {historial.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Aún no hay turnos cerrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-muted">
                      <th className="py-2 px-2 font-medium">Cierre</th>
                      <th className="py-2 px-2 font-medium">Abrió / Cerró</th>
                      <th className="py-2 px-2 font-medium text-right">Recaudado</th>
                      <th className="py-2 px-2 font-medium text-right">Contado</th>
                      <th className="py-2 px-2 font-medium text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => (
                      <tr key={h.turnoId} className="border-b border-border-light">
                        <td className="py-2 px-2 text-text-muted">{formatFechaHora(h.fechaCierre)}</td>
                        <td className="py-2 px-2 text-text-secondary">{h.abiertoPor} / {h.cerradoPor}</td>
                        <td className="py-2 px-2 text-right">{formatCurrencyCOP(h.totalRecaudado)}</td>
                        <td className="py-2 px-2 text-right">{formatCurrencyCOP(h.montoContado)}</td>
                        <td
                          className={`py-2 px-2 text-right font-bold ${
                            h.diferenciaCaja === 0 ? "text-green-700" : "text-destructive"
                          }`}
                        >
                          {formatCurrencyCOP(h.diferenciaCaja)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {mostrarCierre && turno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="text-center mb-5">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-brand-light">
                <ArrowUpRight className="size-7 text-brand" />
              </div>
              <h2 className="text-xl font-bold text-text-primary">¿Cerrar Caja?</h2>
              <p className="text-sm text-text-muted mt-1">
                Debería haber <strong className="text-text-primary">{formatCurrencyCOP(turno.totalEsperadoCaja)}</strong> en efectivo
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-text-secondary">Efectivo contado</label>
                <Input
                  type="number"
                  min={0}
                  value={montoContado}
                  onChange={(e) => setMontoContado(e.target.value)}
                  placeholder="$0"
                  className="h-12 mt-1.5 text-lg font-bold"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary">Notas (opcional)</label>
                <Input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} className="h-11 mt-1.5" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setMostrarCierre(false)}
                className="flex-1 h-11 border-border text-text-muted font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCerrar}
                disabled={procesando || montoContado === ""}
                className="flex-1 h-11 bg-brand hover:bg-brand-hover text-white font-semibold shadow-sm"
              >
                {procesando ? <Loader2 className="size-4 animate-spin" /> : "Confirmar Cierre"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {ultimoCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-surface p-6 shadow-xl text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="size-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Caja cerrada</h2>
            <div className="mt-4 rounded-xl bg-background border border-border p-4 text-sm space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-text-muted">Recaudado</span>
                <span className="font-bold">{formatCurrencyCOP(ultimoCierre.totalRecaudado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Efectivo contado</span>
                <span className="font-bold">{formatCurrencyCOP(ultimoCierre.montoContado)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-text-muted">Diferencia</span>
                <span
                  className={`font-bold ${ultimoCierre.diferenciaCaja === 0 ? "text-green-700" : "text-destructive"}`}
                >
                  {formatCurrencyCOP(ultimoCierre.diferenciaCaja)}
                </span>
              </div>
            </div>
            <Button
              onClick={descartarCierre}
              className="mt-5 w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold"
            >
              Aceptar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
