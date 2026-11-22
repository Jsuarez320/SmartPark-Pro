import { useEffect } from "react";
import { Bike, Car, CornerDownLeft, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import type { TipoVehiculo } from "../operaciones.types";

interface FormularioPlacaProps {
  placa: string;
  onPlaca: (valor: string) => void;
  tipo: TipoVehiculo;
  onTipo: (tipo: TipoVehiculo) => void;
  onEnviar: () => void;
  enviando: boolean;
  /** Atajos F1/F2 activos (se desactivan mientras hay un diálogo abierto). */
  atajosActivos: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

const TIPOS = [
  { valor: "carro" as const, etiqueta: "Carro", icono: Car, atajo: "F1" },
  { valor: "moto" as const, etiqueta: "Moto", icono: Bike, atajo: "F2" },
];

/**
 * Placa + tipo de vehículo. Solo teclado: Enter envía, F1/F2 eligen Carro/Moto, Esc borra la placa.
 * El empleado nunca elige si es entrada o salida: lo decide el sistema.
 */
export function FormularioPlaca({ placa, onPlaca, tipo, onTipo, onEnviar, enviando, atajosActivos, inputRef }: FormularioPlacaProps) {
  useEffect(() => {
    if (!atajosActivos) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        onTipo("carro");
      } else if (e.key === "F2") {
        e.preventDefault();
        onTipo("moto");
      }
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [atajosActivos, onTipo]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onEnviar();
      }}
      className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8"
    >
      <div className="space-y-2">
        <label htmlFor="placa" className="text-sm font-medium text-text-secondary">
          Placa
        </label>
        <Input
          id="placa"
          ref={inputRef}
          value={placa}
          onChange={(e) => onPlaca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onPlaca("");
          }}
          placeholder="ABC123"
          maxLength={10}
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={enviando}
          aria-describedby="ayuda-placa"
          className="h-16 text-center text-3xl font-bold uppercase tracking-[0.3em]"
        />
      </div>

      <div className="mt-5 space-y-2">
        <span id="etiqueta-tipo" className="text-sm font-medium text-text-secondary">
          Tipo de vehículo
        </span>
        <div role="radiogroup" aria-labelledby="etiqueta-tipo" className="grid grid-cols-2 gap-3">
          {TIPOS.map(({ valor, etiqueta, icono: Icono, atajo }) => {
            const activo = tipo === valor;
            return (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => onTipo(valor)}
                disabled={enviando}
                className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-base font-semibold transition-colors ${
                  activo ? "border-brand bg-brand-light text-brand" : "border-border bg-surface text-text-secondary hover:bg-background"
                }`}
              >
                <Icono className="size-5" />
                {etiqueta}
                <kbd className="rounded border border-border px-1.5 text-xs font-normal text-text-muted">{atajo}</kbd>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        type="submit"
        disabled={enviando || placa.length < 3}
        className="mt-6 h-14 w-full gap-2 bg-brand text-base font-semibold text-white shadow-sm hover:bg-brand-hover"
      >
        {enviando ? <Loader2 className="size-5 animate-spin" /> : <CornerDownLeft className="size-5" />}
        Registrar
        <kbd className="rounded border border-white/40 px-1.5 text-xs font-normal">Enter</kbd>
      </Button>

      <p id="ayuda-placa" className="mt-3 text-center text-xs text-text-muted">
        El sistema decide si es entrada o salida según la placa · F1 Carro · F2 Moto · Esc borra la placa
      </p>
    </form>
  );
}
