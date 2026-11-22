import { useState } from "react";
import { Bike, Car, Info, Loader2, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Campo, ErrorBanner } from "@/shared/components/ErrorBanner";
import { InputPesos, aPesos } from "@/shared/components/InputPesos";
import { formatFechaHoraCompleta, getApiError } from "@/shared/utils/formatters";
import { useGuardarTarifa, useTarifasVigentes } from "../hooks/useTarifas";
import type { Tarifa, TarifaInput } from "../tarifas.types";

type CampoPrecio =
  | "valorHora"
  | "valorDia"
  | "valorHoraFestivo"
  | "valorDiaFestivo"
  | "mensualidad1Dia"
  | "mensualidad15Dias"
  | "mensualidad1Mes";

const GRUPOS: { titulo: string; ayuda?: string; campos: [CampoPrecio, string][] }[] = [
  {
    titulo: "Por horas",
    ayuda: "Toda hora iniciada se cobra completa. El máximo por día es el tope de cada 24 horas.",
    campos: [
      ["valorHora", "Valor por hora"],
      ["valorDia", "Máximo por día (tope)"],
    ],
  },
  {
    titulo: "Domingos y festivos",
    campos: [
      ["valorHoraFestivo", "Valor por hora"],
      ["valorDiaFestivo", "Máximo por día (tope)"],
    ],
  },
  {
    titulo: "Mensualidades",
    campos: [
      ["mensualidad1Dia", "1 día"],
      ["mensualidad15Dias", "15 días"],
      ["mensualidad1Mes", "1 mes"],
    ],
  },
];

interface Formulario {
  valores: Record<CampoPrecio, string>;
  nocturnaActiva: boolean;
  valorHoraNocturna: string;
}

function aFormulario(t: Tarifa): Formulario {
  return {
    valores: {
      valorHora: String(t.valorHora),
      valorDia: String(t.valorDia),
      valorHoraFestivo: String(t.valorHoraFestivo),
      valorDiaFestivo: String(t.valorDiaFestivo),
      mensualidad1Dia: String(t.mensualidad1Dia),
      mensualidad15Dias: String(t.mensualidad15Dias),
      mensualidad1Mes: String(t.mensualidad1Mes),
    },
    nocturnaActiva: t.nocturnaActiva,
    valorHoraNocturna: t.valorHoraNocturna == null ? "" : String(t.valorHoraNocturna),
  };
}

/** Convierte el formulario en lo que espera la API, o devuelve el motivo por el que no se puede guardar. */
function aInput(f: Formulario): TarifaInput | string {
  const numeros = {} as Record<CampoPrecio, number>;
  for (const [clave, etiqueta] of GRUPOS.flatMap((g) => g.campos)) {
    const n = aPesos(f.valores[clave]);
    if (n === null || n <= 0) return `Escribe un valor mayor que 0 en «${etiqueta}».`;
    numeros[clave] = n;
  }
  let nocturna: number | null = null;
  if (f.nocturnaActiva) {
    nocturna = aPesos(f.valorHoraNocturna);
    if (nocturna === null || nocturna <= 0) return "Escribe el valor por hora nocturna para activar la tarifa nocturna.";
  }
  return { ...numeros, nocturnaActiva: f.nocturnaActiva, valorHoraNocturna: nocturna };
}

function TarjetaTarifa({ tarifa }: { tarifa: Tarifa }) {
  const [form, setForm] = useState<Formulario>(() => aFormulario(tarifa));
  const [aviso, setAviso] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const guardar = useGuardarTarifa();

  const original = JSON.stringify(aFormulario(tarifa));
  const modificado = JSON.stringify(form) !== original;
  const Icono = tarifa.tipo === "moto" ? Bike : Car;

  const cambiar = (parcial: Partial<Formulario>) => {
    setAviso(null);
    setErrorLocal(null);
    guardar.reset();
    setForm((f) => ({ ...f, ...parcial }));
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const input = aInput(form);
    if (typeof input === "string") {
      setErrorLocal(input);
      return;
    }
    guardar.mutate(
      { tipo: tarifa.tipo, tarifa: input },
      { onSuccess: () => setAviso("Nueva versión guardada. Rige desde ahora; los cobros anteriores no cambian.") },
    );
  };

  return (
    <form onSubmit={enviar} className="rounded-xl border border-border p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand-light">
            <Icono className="size-4 text-brand" />
          </div>
          <h3 className="text-lg font-bold capitalize text-text-primary">{tarifa.tipo}</h3>
        </div>
        <span className="text-xs text-text-subtle">Vigente desde {formatFechaHoraCompleta(tarifa.vigenteDesde)}</span>
      </div>

      <div className="space-y-5">
        {GRUPOS.map((g) => (
          <fieldset key={g.titulo} className="space-y-3">
            <legend className="text-sm font-bold text-text-secondary">{g.titulo}</legend>
            {g.ayuda && <p className="text-xs text-text-subtle">{g.ayuda}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {g.campos.map(([clave, etiqueta]) => (
                <Campo key={clave} etiqueta={etiqueta}>
                  <InputPesos
                    value={form.valores[clave]}
                    onChange={(v) => cambiar({ valores: { ...form.valores, [clave]: v } })}
                    aria-label={`${g.titulo}: ${etiqueta}`}
                    className="h-11"
                  />
                </Campo>
              ))}
            </div>
          </fieldset>
        ))}

        <fieldset className="space-y-3">
          <legend className="text-sm font-bold text-text-secondary">Tarifa nocturna (opcional)</legend>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <Checkbox checked={form.nocturnaActiva} onChange={(e) => cambiar({ nocturnaActiva: e.target.checked })} />
            Activar tarifa nocturna
          </label>
          {form.nocturnaActiva && (
            <Campo etiqueta="Valor por hora nocturna" ayuda="Aplica en la franja nocturna (se configura en Parámetros).">
              <InputPesos
                value={form.valorHoraNocturna}
                onChange={(v) => cambiar({ valorHoraNocturna: v })}
                aria-label="Valor por hora nocturna"
                className="h-11"
              />
            </Campo>
          )}
        </fieldset>
      </div>

      <div className="mt-5 space-y-3">
        <ErrorBanner mensaje={errorLocal ?? (guardar.isError ? getApiError(guardar.error, "No se pudo guardar la tarifa") : null)} />
        {aviso && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{aviso}</p>}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!modificado || guardar.isPending}
            className="gap-2 bg-brand font-semibold text-white shadow-sm hover:bg-brand-hover"
          >
            {guardar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar nueva versión
          </Button>
        </div>
      </div>
    </form>
  );
}

export function PreciosTab() {
  const { data, isLoading, error } = useTarifasVigentes();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" /> Cargando tarifas...
      </div>
    );
  }
  if (error) return <ErrorBanner mensaje={getApiError(error, "No se pudieron cargar las tarifas")} />;

  const ordenadas = [...(data ?? [])].sort((a, b) => a.tipo.localeCompare(b.tipo));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {ordenadas.map((t) => (
          <TarjetaTarifa key={`${t.tipo}-${t.id}`} tarifa={t} />
        ))}
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-brand" />
        <p className="text-sm text-text-muted">
          Guardar crea una <span className="font-bold text-text-secondary">nueva versión</span> de la tarifa: la anterior se conserva
          en el Historial. Cada cobro guarda las tarifas con las que se hizo, así un cambio de precio nunca altera recibos ya emitidos.
        </p>
      </div>
    </div>
  );
}
