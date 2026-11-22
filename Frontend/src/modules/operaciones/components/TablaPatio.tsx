import { useState } from "react";
import { Bike, Car, Loader2, LogOut, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ErrorBanner } from "@/shared/components/ErrorBanner";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { numeroRecibo } from "@/shared/types/recibo";
import { formatCurrencyCOP, formatDuracion, formatHora, getApiError } from "@/shared/utils/formatters";
import { usePatio } from "../hooks/usePatio";
import type { ItemPatio } from "../operaciones.types";

interface TablaPatioProps {
  /** Inicia la salida de ese vehículo (como si se escribiera su placa y se pulsara Enter). */
  onSalida: (item: ItemPatio) => void;
  deshabilitado: boolean;
}

/** Vehículos dentro del parqueadero con lo que se cobraría si salieran ahora. */
export function TablaPatio({ onSalida, deshabilitado }: TablaPatioProps) {
  const [busqueda, setBusqueda] = useState("");
  const q = useDebounce(busqueda.trim(), 300);
  const { data, isLoading, error } = usePatio(q);
  const items = data ?? [];

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm" aria-label="Vehículos en el parqueadero">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text-primary">
          En el parqueadero <span className="text-sm font-normal text-text-muted">({items.length})</span>
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar placa o tiquete"
            aria-label="Buscar en el parqueadero"
            className="h-10 pl-9"
          />
        </div>
      </div>

      <ErrorBanner mensaje={error ? getApiError(error, "No se pudo cargar el parqueadero") : null} />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Cargando...
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">{q ? "Ningún vehículo coincide con la búsqueda" : "No hay vehículos dentro"}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-2 py-2 font-medium">Placa</th>
                <th className="px-2 py-2 font-medium">Entró</th>
                <th className="px-2 py-2 font-medium">Tiempo</th>
                <th className="px-2 py-2 font-medium">Tiquete</th>
                <th className="px-2 py-2 text-right font-medium">Valor ahora</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const Icono = i.tipoVehiculo === "moto" ? Bike : Car;
                return (
                  <tr key={i.ingresoId} className="border-b border-border-light">
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-2 font-bold tracking-wider text-text-primary">
                        <Icono className="size-4 text-text-muted" aria-label={i.tipoVehiculo} />
                        {i.placa}
                      </span>
                      {i.cliente && <span className="text-xs text-text-muted">{i.cliente}</span>}
                    </td>
                    <td className="px-2 py-2 text-text-muted">{formatHora(i.horaEntrada)}</td>
                    <td className="px-2 py-2 text-text-secondary">{formatDuracion(i.minutos)}</td>
                    <td className="px-2 py-2 font-mono text-text-muted">{i.tiquete === null ? "—" : numeroRecibo(i.tiquete)}</td>
                    <td className="px-2 py-2 text-right font-bold text-text-primary">
                      {i.esMensualidad ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">Mensualidad</span>
                      ) : i.valorEstimado === null ? (
                        "—"
                      ) : (
                        formatCurrencyCOP(i.valorEstimado)
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button type="button" variant="outline" disabled={deshabilitado} onClick={() => onSalida(i)} className="h-8 gap-1.5 px-3 text-xs">
                        <LogOut className="size-3.5" /> Salida
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
