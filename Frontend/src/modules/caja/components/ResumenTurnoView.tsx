import { Banknote, Smartphone, TrendingUp } from "lucide-react";
import { formatCurrencyCOP, formatFechaHoraCompleta, formatHora } from "@/shared/utils/formatters";
import type { ResumenTurno } from "../caja.types";

function TarjetaMedio({
  titulo,
  icono,
  base,
  cobrado,
  movimientos,
  esperado,
  etiquetaEsperado,
}: {
  titulo: string;
  icono: React.ReactNode;
  base: number;
  cobrado: number;
  movimientos: number;
  esperado: number;
  etiquetaEsperado: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-text-secondary">{titulo}</p>
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-light">{icono}</div>
      </div>
      <p className="text-xs text-text-muted">{etiquetaEsperado}</p>
      <p className="text-2xl font-bold text-text-primary">{formatCurrencyCOP(esperado)}</p>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between text-text-muted">
          <dt>Base inicial</dt>
          <dd className="font-medium text-text-secondary">{formatCurrencyCOP(base)}</dd>
        </div>
        <div className="flex justify-between text-text-muted">
          <dt>Cobrado ({movimientos} {movimientos === 1 ? "movimiento" : "movimientos"})</dt>
          <dd className="font-medium text-text-secondary">{formatCurrencyCOP(cobrado)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Diferencia de efectivo al cierre: contado − esperado. */
export function DiferenciaEfectivo({ diferencia }: { diferencia: number }) {
  if (diferencia === 0) return <span className="font-bold text-green-700">Cuadrada</span>;
  return (
    <span className="font-bold text-destructive">
      {diferencia > 0 ? "Sobrante" : "Faltante"} {formatCurrencyCOP(Math.abs(diferencia))}
    </span>
  );
}

/** Resumen de un turno (abierto, recién cerrado o del historial): bases, cobrado por medio, esperado y detalle. */
export function ResumenTurnoView({ resumen, conMovimientos = true }: { resumen: ResumenTurno; conMovimientos?: boolean }) {
  const cerrada = resumen.estado === "cerrada";

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Abierta por <span className="font-medium text-text-secondary">{resumen.abiertoPor}</span> el {formatFechaHoraCompleta(resumen.fechaApertura)}
        {cerrada && resumen.fechaCierre && (
          <>
            {" · "}cerrada por <span className="font-medium text-text-secondary">{resumen.cerradoPor}</span> el {formatFechaHoraCompleta(resumen.fechaCierre)}
          </>
        )}
        {" · "}
        {resumen.horasTurno} h
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TarjetaMedio
          titulo="Efectivo"
          icono={<Banknote className="size-4 text-brand" />}
          base={resumen.baseEfectivo}
          cobrado={resumen.efectivo}
          movimientos={resumen.movimientosEfectivo}
          esperado={resumen.esperadoEfectivo}
          etiquetaEsperado="Esperado en caja (base + cobrado)"
        />
        <TarjetaMedio
          titulo="Transferencias"
          icono={<Smartphone className="size-4 text-brand" />}
          base={resumen.baseTransferencia}
          cobrado={resumen.transferencia}
          movimientos={resumen.movimientosTransferencia}
          esperado={resumen.esperadoTransferencia}
          etiquetaEsperado="Esperado (base + cobrado)"
        />
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-text-secondary">Total recaudado</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="size-4 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-text-muted">Todos los medios de pago</p>
          <p className="text-2xl font-bold text-text-primary">{formatCurrencyCOP(resumen.totalRecaudado)}</p>
          <p className="mt-3 text-sm text-text-muted">{resumen.totalTransacciones} movimientos en total</p>
        </div>
      </div>

      {cerrada && resumen.efectivoContado !== null && resumen.diferenciaEfectivo !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="text-sm text-text-muted">
            Efectivo contado: <span className="font-bold text-text-primary">{formatCurrencyCOP(resumen.efectivoContado)}</span>
            <span className="mx-2">·</span>
            Esperado: <span className="font-bold text-text-primary">{formatCurrencyCOP(resumen.esperadoEfectivo)}</span>
          </div>
          <DiferenciaEfectivo diferencia={resumen.diferenciaEfectivo} />
          {resumen.notas && <p className="w-full text-sm text-text-muted">Notas: {resumen.notas}</p>}
        </div>
      )}

      {conMovimientos && resumen.movimientos && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-text-secondary">Detalle de movimientos</h3>
          {resumen.movimientos.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">Aún no hay cobros en este turno</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="px-2 py-2 font-medium">Hora</th>
                    <th className="px-2 py-2 font-medium">Placa</th>
                    <th className="px-2 py-2 font-medium">Operación</th>
                    <th className="px-2 py-2 font-medium">Medio</th>
                    <th className="px-2 py-2 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.movimientos.map((m) => (
                    <tr key={m.id} className="border-b border-border-light">
                      <td className="px-2 py-2 text-text-muted">{formatHora(m.fecha)}</td>
                      <td className="px-2 py-2 font-bold text-text-primary">{m.placa ?? "—"}</td>
                      <td className="px-2 py-2 text-text-secondary">{m.operacion === "mensualidad" ? "Mensualidad" : "Cobro por horas"}</td>
                      <td className="px-2 py-2 capitalize text-text-secondary">{m.medio}</td>
                      <td className="px-2 py-2 text-right font-bold text-text-primary">{formatCurrencyCOP(m.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
