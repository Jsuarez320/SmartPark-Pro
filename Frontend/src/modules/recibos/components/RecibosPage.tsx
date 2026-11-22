import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Loader2, Printer, Search } from "lucide-react";
import { AvisoImpresion } from "@/shared/components/AvisoImpresion";
import { Campo, ErrorBanner } from "@/shared/components/ErrorBanner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useImprimirRecibo } from "@/shared/printing/useImprimirRecibo";
import { NOMBRE_TIPO_RECIBO, numeroRecibo, type ReciboApi, type TipoRecibo } from "@/shared/types/recibo";
import { formatCurrencyCOP, formatFechaHoraCompleta, getApiError } from "@/shared/utils/formatters";
import { normalizarPlaca } from "@/shared/utils/placa";
import { useBuscarRecibos, useReimprimirRecibo } from "../hooks/useRecibos";
import { ModalRecibo } from "./ModalRecibo";

const PAGINA = 50;
const MAXIMO = 200;
const TIPOS = Object.keys(NOMBRE_TIPO_RECIBO) as TipoRecibo[];

/**
 * Buscador de recibos anteriores (por número, placa, fecha o tipo) con reimpresión.
 * La reimpresión usa el contenido GUARDADO del recibo: no se vuelve a calcular nada.
 * Acepta ?numero=, ?placa= y ?tipo= en la dirección (otros módulos enlazan aquí).
 */
export function RecibosPage() {
  const [params] = useSearchParams();
  const tipoInicial = params.get("tipo");
  const [numero, setNumero] = useState(params.get("numero") ?? "");
  const [placa, setPlaca] = useState(params.get("placa") ?? "");
  const [tipo, setTipo] = useState<TipoRecibo | "">(TIPOS.includes(tipoInicial as TipoRecibo) ? (tipoInicial as TipoRecibo) : "");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [limite, setLimite] = useState(PAGINA);
  const [verId, setVerId] = useState<string | null>(null);
  const [ultimoReimpreso, setUltimoReimpreso] = useState<ReciboApi | null>(null);

  const numeroDebounced = useDebounce(numero, 300);
  const placaDebounced = useDebounce(placa, 300);
  const filtroInvalido = desde !== "" && hasta !== "" && desde > hasta;

  const { data, isLoading, isFetching, error } = useBuscarRecibos({
    numero: /^\d+$/.test(numeroDebounced) && Number(numeroDebounced) > 0 ? Number(numeroDebounced) : undefined,
    placa: placaDebounced || undefined,
    tipo: tipo || undefined,
    desde: filtroInvalido ? undefined : desde || undefined,
    hasta: filtroInvalido ? undefined : hasta || undefined,
    limit: limite,
  });
  const recibos = data ?? [];

  const reimprimir = useReimprimirRecibo();
  const impresion = useImprimirRecibo();

  const alReimprimir = (id: string) => {
    reimprimir.mutate(id, {
      onSuccess: (recibo) => {
        setVerId(null);
        setUltimoReimpreso(recibo);
        // Si la impresora falla, la copia ya quedó contada: se avisa y se puede reintentar.
        void impresion.imprimir(recibo);
      },
    });
  };

  const cambiarFiltro = <T,>(set: (v: T) => void) => (v: T) => {
    setLimite(PAGINA);
    set(v);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Recibos</h1>
        <p className="mt-1 text-sm text-text-muted">Busca un recibo anterior y reimprímelo. La copia es idéntica al original.</p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm" aria-label="Filtros">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Campo etiqueta="Número de recibo">
            <Input
              value={numero}
              onChange={(e) => cambiarFiltro(setNumero)(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="Ej. 125"
              autoFocus
              className="h-11"
            />
          </Campo>
          <Campo etiqueta="Placa">
            <Input
              value={placa}
              onChange={(e) => cambiarFiltro(setPlaca)(normalizarPlaca(e.target.value))}
              maxLength={10}
              placeholder="ABC123"
              className="h-11 font-bold uppercase tracking-widest"
            />
          </Campo>
          <Campo etiqueta="Tipo">
            <select
              value={tipo}
              onChange={(e) => cambiarFiltro(setTipo)(e.target.value as TipoRecibo | "")}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO_RECIBO[t]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Desde">
            <Input type="date" value={desde} onChange={(e) => cambiarFiltro(setDesde)(e.target.value)} className="h-11" />
          </Campo>
          <Campo etiqueta="Hasta">
            <Input type="date" value={hasta} onChange={(e) => cambiarFiltro(setHasta)(e.target.value)} className="h-11" />
          </Campo>
        </div>
        {filtroInvalido && <p className="mt-3 text-sm text-destructive">«Desde» no puede ser posterior a «Hasta».</p>}
      </section>

      <ErrorBanner mensaje={error ? getApiError(error, "No se pudieron buscar los recibos") : reimprimir.isError ? getApiError(reimprimir.error, "No se pudo reimprimir") : null} />
      <AvisoImpresion
        estado={impresion.estado}
        onReintentar={() => ultimoReimpreso && void impresion.imprimir(ultimoReimpreso)}
        onCerrar={impresion.limpiar}
      />

      <section className="rounded-xl border border-border bg-surface shadow-sm" aria-label="Resultados" aria-busy={isFetching}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
            <Loader2 className="size-4 animate-spin" /> Buscando...
          </div>
        ) : recibos.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
            <Search className="size-4" /> Ningún recibo coincide con la búsqueda
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="px-3 py-3 font-medium">No.</th>
                    <th className="px-3 py-3 font-medium">Tipo</th>
                    <th className="px-3 py-3 font-medium">Placa</th>
                    <th className="px-3 py-3 font-medium">Fecha</th>
                    <th className="px-3 py-3 text-right font-medium">Total</th>
                    <th className="px-3 py-3 font-medium">Pago</th>
                    <th className="px-3 py-3 font-medium">Cajero</th>
                    <th className="px-3 py-3 text-center font-medium">Copias</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {recibos.map((r) => (
                    <tr key={r.id} className="border-b border-border-light">
                      <td className="px-3 py-3 font-mono font-bold text-text-primary">{numeroRecibo(r.numero)}</td>
                      <td className="px-3 py-3 text-text-secondary">{NOMBRE_TIPO_RECIBO[r.tipo]}</td>
                      <td className="px-3 py-3 font-bold tracking-wider text-text-primary">{r.placa ?? "—"}</td>
                      <td className="px-3 py-3 text-text-muted">{formatFechaHoraCompleta(r.creadoEn)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-text-primary">{r.total == null ? "—" : formatCurrencyCOP(r.total)}</td>
                      <td className="px-3 py-3 capitalize text-text-secondary">{r.medioPago ?? "—"}</td>
                      <td className="px-3 py-3 text-text-secondary">{r.operador ?? "—"}</td>
                      <td className="px-3 py-3 text-center text-text-muted">{r.reimpresiones}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setVerId(r.id)} className="h-8 gap-1.5 px-3 text-xs">
                            <Eye className="size-3.5" /> Ver
                          </Button>
                          <Button
                            type="button"
                            onClick={() => alReimprimir(r.id)}
                            disabled={reimprimir.isPending}
                            className="h-8 gap-1.5 bg-brand px-3 text-xs text-white hover:bg-brand-hover"
                            aria-label={`Reimprimir recibo ${numeroRecibo(r.numero)}`}
                          >
                            <Printer className="size-3.5" /> Reimprimir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recibos.length >= limite && limite < MAXIMO && (
              <div className="border-t border-border p-3 text-center">
                <Button type="button" variant="outline" onClick={() => setLimite((l) => Math.min(l + PAGINA, MAXIMO))} disabled={isFetching}>
                  Ver más
                </Button>
              </div>
            )}
            {recibos.length >= MAXIMO && <p className="border-t border-border p-3 text-center text-xs text-text-muted">Mostrando los {MAXIMO} más recientes: afina la búsqueda con un filtro.</p>}
          </>
        )}
      </section>

      <ModalRecibo id={verId} onClose={() => setVerId(null)} onReimprimir={alReimprimir} reimprimiendo={reimprimir.isPending} />
    </div>
  );
}
