import { Link } from "react-router-dom";
import { Loader2, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ErrorBanner } from "@/shared/components/ErrorBanner";
import { Modal } from "@/shared/components/Modal";
import { numeroRecibo } from "@/shared/types/recibo";
import { formatCurrencyCOP, formatDia, getApiError } from "@/shared/utils/formatters";
import { useDetalleMensualidad } from "../hooks/useMensualidades";
import { NOMBRE_JORNADA, NOMBRE_PERIODO, type Mensualidad } from "../mensualidades.types";
import { EstadoBadge, textoDias } from "./EstadoBadge";

interface ModalDetalleProps {
  id: string | null;
  onClose: () => void;
  onRenovar: (m: Mensualidad) => void;
  onEditar: (m: Mensualidad) => void;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border-light py-1.5 text-sm">
      <dt className="text-text-muted">{etiqueta}</dt>
      <dd className="text-right font-medium text-text-primary">{valor}</dd>
    </div>
  );
}

/** Datos de la mensualidad y todos sus periodos pagados (con medio de pago y número de recibo). */
export function ModalDetalle({ id, onClose, onRenovar, onEditar }: ModalDetalleProps) {
  const { data, isLoading, error } = useDetalleMensualidad(id);

  return (
    <Modal open={id !== null} onClose={onClose} titulo="Detalle de la mensualidad" ancho="max-w-2xl">
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Cargando...
        </div>
      )}
      <ErrorBanner mensaje={error ? getApiError(error, "No se pudo cargar la mensualidad") : null} />
      {data && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-bold tracking-widest text-text-primary">{data.placa}</p>
              <p className="text-sm text-text-muted">{data.cliente}</p>
            </div>
            <div className="text-right">
              <EstadoBadge estado={data.estado} />
              <p className="mt-1 text-xs text-text-muted">{textoDias(data.diasRestantes)}</p>
            </div>
          </div>

          <dl>
            <Dato etiqueta="Celular" valor={data.celular ?? "—"} />
            <Dato etiqueta="Vehículo" valor={<span className="capitalize">{data.tipoVehiculo}</span>} />
            <Dato etiqueta="Placa alterna" valor={data.placaAlterna ?? "—"} />
            <Dato etiqueta="Tarjeta" valor={data.tarjeta ?? "—"} />
            <Dato etiqueta="Jornada" valor={NOMBRE_JORNADA[data.jornada]} />
            <Dato etiqueta="Vigencia actual" valor={`${formatDia(data.fechaInicio)} → ${formatDia(data.fechaFin)}`} />
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-bold text-text-secondary">Periodos pagados</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="px-3 py-2 font-medium">Vigencia</th>
                    <th className="px-3 py-2 font-medium">Periodo</th>
                    <th className="px-3 py-2 font-medium">Pago</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                    <th className="px-3 py-2 font-medium">Recibo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periodos.map((p) => (
                    <tr key={p.id} className="border-b border-border-light">
                      <td className="px-3 py-2 text-text-secondary">
                        {formatDia(p.fechaInicio)} → {formatDia(p.fechaFin)}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">{NOMBRE_PERIODO[p.periodo]}</td>
                      <td className="px-3 py-2 capitalize text-text-secondary">{p.medioPago ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrencyCOP(p.valorPagado)}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {p.reciboNumero === null ? (
                          <span className="text-text-subtle" title="Registrada antes del módulo de recibos">—</span>
                        ) : (
                          <Link to={`/recibos?numero=${p.reciboNumero}`} className="text-brand underline">
                            {numeroRecibo(p.reciboNumero)}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onEditar(data)} className="gap-2">
              <Pencil className="size-4" /> Editar
            </Button>
            <Button type="button" onClick={() => onRenovar(data)} className="gap-2 bg-brand font-semibold text-white hover:bg-brand-hover">
              <RefreshCw className="size-4" /> Renovar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
