import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Campo, ErrorBanner } from "@/shared/components/ErrorBanner";
import { getApiError } from "@/shared/utils/formatters";
import { useConfiguracionCobro, useGuardarConfiguracion } from "../hooks/useTarifas";
import type { ConfiguracionCobro } from "../tarifas.types";

type Borrador = Record<keyof ConfiguracionCobro, string>;

const aBorrador = (c: ConfiguracionCobro): Borrador =>
  Object.fromEntries(Object.entries(c).map(([k, v]) => [k, String(v)])) as Borrador;

const NUMERICOS: (keyof ConfiguracionCobro)[] = ["graciaMinutos", "umbralVencimientoDias"];

export function ParametrosTab() {
  const { data, isLoading, error } = useConfiguracionCobro();
  const guardar = useGuardarConfiguracion();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [aviso, setAviso] = useState(false);

  useEffect(() => {
    if (data) setBorrador(aBorrador(data));
  }, [data]);

  if (isLoading || !borrador || !data) {
    return error ? (
      <ErrorBanner mensaje={getApiError(error, "No se pudieron cargar los parámetros")} />
    ) : (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" /> Cargando parámetros...
      </div>
    );
  }

  const cambiar = (clave: keyof ConfiguracionCobro, valor: string) => {
    setAviso(false);
    setErrorLocal(null);
    guardar.reset();
    setBorrador({ ...borrador, [clave]: valor });
  };

  const cambios: Partial<ConfiguracionCobro> = {};
  for (const clave of Object.keys(data) as (keyof ConfiguracionCobro)[]) {
    if (borrador[clave] === String(data[clave])) continue;
    (cambios as Record<string, string | number>)[clave] = NUMERICOS.includes(clave) ? Number(borrador[clave]) : borrador[clave];
  }
  const hayCambios = Object.keys(cambios).length > 0;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    for (const clave of NUMERICOS) {
      if (!/^\d+$/.test(borrador[clave])) {
        setErrorLocal("Gracia y días de aviso deben ser números enteros.");
        return;
      }
    }
    guardar.mutate(cambios, { onSuccess: () => setAviso(true) });
  };

  const hora = (clave: keyof ConfiguracionCobro, etiqueta: string) => (
    <Campo etiqueta={etiqueta}>
      <Input type="time" value={borrador[clave]} onChange={(e) => cambiar(clave, e.target.value)} className="h-11" />
    </Campo>
  );

  return (
    <form onSubmit={enviar} className="space-y-6">
      <section className="rounded-xl border border-border p-5">
        <h3 className="mb-4 text-lg font-bold text-text-primary">Cobro por horas</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Minutos de gracia" ayuda="Una estadía de hasta estos minutos no se cobra (0 a 60).">
            <Input inputMode="numeric" value={borrador.graciaMinutos} onChange={(e) => cambiar("graciaMinutos", e.target.value.replace(/\D/g, ""))} className="h-11" />
          </Campo>
          <div />
          {hora("nocturnaInicio", "Inicio de la franja nocturna")}
          {hora("nocturnaFin", "Fin de la franja nocturna")}
        </div>
      </section>

      <section className="rounded-xl border border-border p-5">
        <h3 className="mb-4 text-lg font-bold text-text-primary">Mensualidades</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Días para «por vencer»" ayuda="Una mensualidad pasa a «por vencer» cuando le faltan estos días o menos (0 a 30).">
            <Input inputMode="numeric" value={borrador.umbralVencimientoDias} onChange={(e) => cambiar("umbralVencimientoDias", e.target.value.replace(/\D/g, ""))} className="h-11" />
          </Campo>
          <div />
          {hora("jornadaMananaInicio", "Jornada de mañana: desde")}
          {hora("jornadaMananaFin", "Jornada de mañana: hasta")}
          {hora("jornadaTardeInicio", "Jornada de tarde: desde")}
          {hora("jornadaTardeFin", "Jornada de tarde: hasta")}
        </div>
        <p className="mt-3 text-xs text-text-subtle">
          Hora de Colombia. La jornada completa no tiene restricción de horario.
        </p>
      </section>

      <ErrorBanner mensaje={errorLocal ?? (guardar.isError ? getApiError(guardar.error, "No se pudieron guardar los parámetros") : null)} />
      {aviso && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">Parámetros guardados.</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={!hayCambios || guardar.isPending} className="gap-2 bg-brand font-semibold text-white shadow-sm hover:bg-brand-hover">
          {guardar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar parámetros
        </Button>
      </div>
    </form>
  );
}
