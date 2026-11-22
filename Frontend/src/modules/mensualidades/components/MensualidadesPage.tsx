import { useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Loader2, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { AvisoImpresion } from "@/shared/components/AvisoImpresion";
import { ErrorBanner } from "@/shared/components/ErrorBanner";
import { Pestanas } from "@/shared/components/Pestanas";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useImprimirRecibo } from "@/shared/printing/useImprimirRecibo";
import { numeroRecibo } from "@/shared/types/recibo";
import { formatCurrencyCOP, formatDia, getApiError } from "@/shared/utils/formatters";
import { useMensualidades, useResumenMensualidades } from "../hooks/useMensualidades";
import {
  NOMBRE_JORNADA,
  NOMBRE_PERIODO,
  type EstadoMensualidad,
  type Mensualidad,
  type RespuestaMensualidad,
} from "../mensualidades.types";
import { EstadoBadge, textoDias } from "./EstadoBadge";
import { ModalDetalle } from "./ModalDetalle";
import { ModalEditar } from "./ModalEditar";
import { ModalNueva } from "./ModalNueva";
import { ModalRenovar } from "./ModalRenovar";

type Filtro = "todas" | EstadoMensualidad;

/** Mensualidades: registrar, consultar, editar, renovar y controlar vencimientos. */
export function MensualidadesPage() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");
  const q = useDebounce(busqueda.trim(), 300);
  const [nueva, setNueva] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [renovando, setRenovando] = useState<Mensualidad | null>(null);
  const [editando, setEditando] = useState<Mensualidad | null>(null);
  const [ultima, setUltima] = useState<RespuestaMensualidad | null>(null);
  const impresion = useImprimirRecibo();

  const lista = useMensualidades(filtro === "todas" ? undefined : filtro, q);
  const resumen = useResumenMensualidades();
  const items = lista.data ?? [];
  const r = resumen.data;
  const alertas = (r?.porVencer ?? 0) + (r?.vencidas ?? 0);

  /** Registrar o renovar cobran: se muestra el resultado y se imprime el recibo del pago. */
  const alCobrar = (respuesta: RespuestaMensualidad) => {
    setNueva(false);
    setRenovando(null);
    setDetalleId(null);
    setUltima(respuesta);
    void impresion.imprimir(respuesta.recibo);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Mensualidades</h1>
          <p className="mt-1 text-sm text-text-muted">Clientes mensuales: registro, renovación y control de vencimientos</p>
        </div>
        <Button onClick={() => setNueva(true)} className="gap-2 bg-brand font-semibold text-white shadow-sm hover:bg-brand-hover">
          <Plus className="size-4" /> Nueva mensualidad
        </Button>
      </div>

      {alertas > 0 && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="flex items-center gap-2">
            <BellRing className="size-4 shrink-0" />
            {r!.vencidas > 0 && (
              <span>
                <strong>{r!.vencidas}</strong> {r!.vencidas === 1 ? "vencida" : "vencidas"}
              </span>
            )}
            {r!.vencidas > 0 && r!.porVencer > 0 && <span>·</span>}
            {r!.porVencer > 0 && (
              <span>
                <strong>{r!.porVencer}</strong> por vencer (en {r!.umbralDias} días o menos)
              </span>
            )}
          </span>
          <span className="flex gap-2">
            {r!.vencidas > 0 && (
              <Button type="button" variant="outline" onClick={() => setFiltro("vencida")} className="h-8 px-3 text-xs">
                Ver vencidas
              </Button>
            )}
            {r!.porVencer > 0 && (
              <Button type="button" variant="outline" onClick={() => setFiltro("por_vencer")} className="h-8 px-3 text-xs">
                Ver por vencer
              </Button>
            )}
          </span>
        </div>
      )}

      <AvisoImpresion
        estado={impresion.estado}
        onReintentar={() => ultima && void impresion.imprimir(ultima.recibo)}
        onCerrar={impresion.limpiar}
      />

      {ultima && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <span>
            {ultima.mensaje}: vigente hasta <strong>{formatDia(ultima.mensualidad.fechaFin)}</strong> · Recibo No.{" "}
            <Link to={`/recibos?numero=${ultima.recibo.numero}`} className="font-mono font-bold underline">
              {numeroRecibo(ultima.recibo.numero)}
            </Link>
          </span>
          <button onClick={() => setUltima(null)} className="font-semibold">
            Cerrar
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pestanas
          etiquetaAccesible="Estado de la mensualidad"
          valor={filtro}
          onChange={setFiltro}
          items={[
            { valor: "todas", etiqueta: "Todas" },
            { valor: "vigente", etiqueta: "Vigentes", contador: r?.vigentes },
            { valor: "por_vencer", etiqueta: "Por vencer", contador: r?.porVencer },
            { valor: "vencida", etiqueta: "Vencidas", contador: r?.vencidas },
          ]}
        />
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Placa, tarjeta, nombre o celular"
            aria-label="Buscar mensualidades"
            className="h-10 pl-9"
          />
        </div>
      </div>

      <ErrorBanner mensaje={lista.error ? getApiError(lista.error, "No se pudieron cargar las mensualidades") : null} />

      <div className="rounded-xl border border-border bg-surface shadow-sm">
        {lista.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
            <Loader2 className="size-4 animate-spin" /> Cargando...
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">
            {q || filtro !== "todas" ? "Ninguna mensualidad coincide con el filtro" : "Aún no hay mensualidades registradas"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="px-3 py-3 font-medium">Placa</th>
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Tarjeta</th>
                  <th className="px-3 py-3 font-medium">Periodo</th>
                  <th className="px-3 py-3 font-medium">Vence</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 text-right font-medium">Último pago</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="border-b border-border-light">
                    <td className="px-3 py-3">
                      <button onClick={() => setDetalleId(m.id)} className="font-bold tracking-wider text-text-primary hover:text-brand">
                        {m.placa}
                      </button>
                      {m.placaAlterna && <p className="text-xs text-text-muted">Alterna: {m.placaAlterna}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-text-secondary">{m.cliente}</p>
                      {m.celular && <p className="text-xs text-text-muted">{m.celular}</p>}
                    </td>
                    <td className="px-3 py-3 font-mono text-text-muted">{m.tarjeta ?? "—"}</td>
                    <td className="px-3 py-3 text-text-secondary">
                      {NOMBRE_PERIODO[m.periodo]}
                      <p className="text-xs text-text-muted">Jornada {NOMBRE_JORNADA[m.jornada].toLowerCase()}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-text-primary">{formatDia(m.fechaFin)}</p>
                      <p className="text-xs text-text-muted">{textoDias(m.diasRestantes)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <EstadoBadge estado={m.estado} />
                    </td>
                    <td className="px-3 py-3 text-right text-text-secondary">{formatCurrencyCOP(m.valorPagado)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" onClick={() => setRenovando(m)} className="h-8 gap-1.5 bg-brand px-3 text-xs text-white hover:bg-brand-hover">
                          <RefreshCw className="size-3.5" /> Renovar
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setEditando(m)} className="h-8 gap-1.5 px-3 text-xs" aria-label={`Editar ${m.placa}`}>
                          <Pencil className="size-3.5" /> Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalNueva open={nueva} onClose={() => setNueva(false)} onCreada={alCobrar} />
      <ModalRenovar mensualidad={renovando} onClose={() => setRenovando(null)} onRenovada={alCobrar} />
      <ModalEditar mensualidad={editando} onClose={() => setEditando(null)} onEditada={() => setEditando(null)} />
      <ModalDetalle
        id={detalleId}
        onClose={() => setDetalleId(null)}
        onRenovar={(m) => {
          setDetalleId(null);
          setRenovando(m);
        }}
        onEditar={(m) => {
          setDetalleId(null);
          setEditando(m);
        }}
      />
    </div>
  );
}
