import { useState } from "react";
import { CalendarPlus, Loader2, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Campo, ErrorBanner } from "@/shared/components/ErrorBanner";
import { formatDia, getApiError } from "@/shared/utils/formatters";
import { useAgregarFestivo, useEliminarFestivo, useFestivos, usePrecargarFestivos } from "../hooks/useTarifas";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Día de la semana de una fecha de calendario (se fija el mediodía para evitar desfases de zona horaria). */
const diaSemana = (fecha: string) => DIAS[new Date(`${fecha}T12:00:00`).getDay()];

export function FestivosTab() {
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual);
  const [fecha, setFecha] = useState("");
  const [nombre, setNombre] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [porEliminar, setPorEliminar] = useState<string | null>(null);

  const { data, isLoading, error } = useFestivos(anio);
  const agregar = useAgregarFestivo();
  const eliminar = useEliminarFestivo();
  const precargar = usePrecargarFestivos();

  const limpiarEstado = () => {
    setAviso(null);
    agregar.reset();
    eliminar.reset();
    precargar.reset();
  };

  const alAgregar = (e: React.FormEvent) => {
    e.preventDefault();
    limpiarEstado();
    agregar.mutate(
      { fecha, nombre: nombre.trim() },
      {
        onSuccess: (f) => {
          setAviso(`Festivo agregado: ${formatDia(f.fecha)}.`);
          setFecha("");
          setNombre("");
          setAnio(Number(f.fecha.slice(0, 4)));
        },
      },
    );
  };

  const alPrecargar = () => {
    limpiarEstado();
    precargar.mutate(anio, {
      onSuccess: (r) => setAviso(`Festivos de ${r.anio}: ${r.agregados} agregados, ${r.existentes} ya estaban.`),
    });
  };

  const alEliminar = (f: string) => {
    limpiarEstado();
    eliminar.mutate(f, { onSuccess: () => setPorEliminar(null) });
  };

  const errorMutacion = [agregar, eliminar, precargar].find((m) => m.isError);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Festivos de {anio}</h3>
            <p className="text-sm text-text-muted">Los domingos y festivos se cobran con la tarifa de domingos y festivos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
              {[anioActual - 1, anioActual, anioActual + 1, anioActual + 2].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    limpiarEstado();
                    setAnio(a);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${a === anio ? "bg-brand text-white" : "text-text-muted hover:text-text-secondary"}`}
                >
                  {a}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={alPrecargar} disabled={precargar.isPending} className="gap-2">
              {precargar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Precargar festivos oficiales
            </Button>
          </div>
        </div>

        <ErrorBanner mensaje={error ? getApiError(error, "No se pudieron cargar los festivos") : errorMutacion ? getApiError(errorMutacion.error, "No se pudo completar la acción") : null} />
        {aviso && <p className="mb-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{aviso}</p>}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
            <Loader2 className="size-4 animate-spin" /> Cargando festivos...
          </div>
        ) : (data ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No hay festivos cargados para {anio}. Usa «Precargar festivos oficiales».</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="px-2 py-2 font-medium">Fecha</th>
                  <th className="px-2 py-2 font-medium">Día</th>
                  <th className="px-2 py-2 font-medium">Festivo</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {data!.map((f) => (
                  <tr key={f.fecha} className="border-b border-border-light">
                    <td className="px-2 py-2 font-medium text-text-primary">{formatDia(f.fecha)}</td>
                    <td className="px-2 py-2 capitalize text-text-muted">{diaSemana(f.fecha)}</td>
                    <td className="px-2 py-2 text-text-secondary">{f.nombre}</td>
                    <td className="px-2 py-2 text-right">
                      {porEliminar === f.fecha ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-text-muted">¿Quitar este festivo?</span>
                          <Button type="button" variant="destructive" onClick={() => alEliminar(f.fecha)} disabled={eliminar.isPending} className="h-8 px-3 text-xs">
                            Quitar
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setPorEliminar(null)} className="h-8 px-3 text-xs">
                            No
                          </Button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setPorEliminar(f.fecha)} className="rounded-md p-1.5 text-text-subtle hover:text-destructive" aria-label={`Quitar festivo ${formatDia(f.fecha)}`}>
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form onSubmit={alAgregar} className="rounded-xl border border-border p-5">
        <h3 className="mb-4 text-lg font-bold text-text-primary">Agregar un festivo</h3>
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[180px_1fr_auto]">
          <Campo etiqueta="Fecha">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className="h-11" />
          </Campo>
          <Campo etiqueta="Nombre">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} required placeholder="Ej. Festivo local" className="h-11" />
          </Campo>
          <Button type="submit" disabled={agregar.isPending || !fecha || !nombre.trim()} className="h-11 gap-2 bg-brand font-semibold text-white hover:bg-brand-hover">
            {agregar.isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
            Agregar
          </Button>
        </div>
      </form>
    </div>
  );
}
