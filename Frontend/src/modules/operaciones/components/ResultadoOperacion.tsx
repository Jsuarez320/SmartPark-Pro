import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, BadgeCheck, TriangleAlert } from "lucide-react";
import { formatCurrencyCOP, formatDuracion, formatFechaHoraCompleta } from "@/shared/utils/formatters";
import { numeroRecibo } from "@/shared/types/recibo";
import type { RespuestaOperacion } from "../operaciones.types";
import { DesgloseCobro } from "./DesgloseCobro";

/** Resultado de la última operación registrada. */
export function ResultadoOperacion({ resultado }: { resultado: RespuestaOperacion }) {
  const entrada = resultado.tipo === "entrada";
  const Icono = entrada ? ArrowDownToLine : ArrowUpFromLine;
  const total = resultado.cobro?.total ?? 0;

  return (
    <section
      aria-label="Última operación"
      aria-live="polite"
      className={`rounded-2xl border p-5 shadow-sm ${entrada ? "border-brand/30 bg-brand-light/40" : "border-green-200 bg-green-50/50"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex size-11 items-center justify-center rounded-xl ${entrada ? "bg-brand text-white" : "bg-green-600 text-white"}`}>
            <Icono className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{entrada ? "Entrada registrada" : "Salida registrada"}</p>
            <p className="text-2xl font-bold tracking-widest text-text-primary">{resultado.placa}</p>
          </div>
        </div>
        {resultado.recibo && (
          <p className="text-right text-xs text-text-muted">
            Recibo No. <span className="font-mono font-bold text-text-secondary">{numeroRecibo(resultado.recibo.numero)}</span>
            <br />
            <Link to={`/recibos?numero=${resultado.recibo.numero}`} className="font-semibold text-brand underline">
              ¿Otra copia? Búscala en Recibos
            </Link>
          </p>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between text-text-muted">
          <dt>Vehículo</dt>
          <dd className="font-medium capitalize text-text-secondary">{resultado.tipoVehiculo}</dd>
        </div>
        <div className="flex justify-between text-text-muted">
          <dt>Entrada</dt>
          <dd className="font-medium text-text-secondary">{formatFechaHoraCompleta(resultado.horaEntrada)}</dd>
        </div>
        {resultado.horaSalida && (
          <div className="flex justify-between text-text-muted">
            <dt>Salida</dt>
            <dd className="font-medium text-text-secondary">{formatFechaHoraCompleta(resultado.horaSalida)}</dd>
          </div>
        )}
        {resultado.cobro && (
          <div className="flex justify-between text-text-muted">
            <dt>Permanencia</dt>
            <dd className="font-medium text-text-secondary">{formatDuracion(resultado.cobro.minutosTotales)}</dd>
          </div>
        )}
      </dl>

      {resultado.esMensualidad && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-700">
          <BadgeCheck className="size-4" /> Mensualidad vigente: sin cobro
        </p>
      )}

      {resultado.aviso && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {resultado.aviso}
        </p>
      )}

      {!entrada && resultado.cobro && total > 0 && (
        <div className="mt-4 space-y-3">
          <DesgloseCobro cobro={resultado.cobro} />
          <p className="flex items-center justify-between rounded-lg bg-surface p-3 text-lg font-bold text-text-primary">
            <span>
              Cobrado <span className="text-sm font-normal capitalize text-text-muted">({resultado.medioPago})</span>
            </span>
            <span>{formatCurrencyCOP(total)}</span>
          </p>
        </div>
      )}

      {!entrada && !resultado.esMensualidad && total === 0 && (
        <p className="mt-3 text-sm text-text-muted">Dentro del tiempo de gracia: no se cobra.</p>
      )}
    </section>
  );
}
