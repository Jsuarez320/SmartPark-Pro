import { Banknote, Smartphone } from "lucide-react";
import type { MedioPago } from "@/shared/types/recibo";

interface MedioPagoSelectorProps {
  value: MedioPago;
  onChange: (medio: MedioPago) => void;
  disabled?: boolean;
  /** Muestra el atajo de teclado (1 / 2) en cada opción. */
  mostrarAtajos?: boolean;
}

const OPCIONES = [
  { valor: "efectivo" as const, etiqueta: "Efectivo", icono: Banknote, atajo: "1" },
  { valor: "transferencia" as const, etiqueta: "Transferencia", icono: Smartphone, atajo: "2" },
];

/** Medio de pago de cada cobro: solo efectivo o transferencia. */
export function MedioPagoSelector({ value, onChange, disabled, mostrarAtajos }: MedioPagoSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Medio de pago" className="grid grid-cols-2 gap-2">
      {OPCIONES.map(({ valor, etiqueta, icono: Icono, atajo }) => {
        const activo = value === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={disabled}
            onClick={() => onChange(valor)}
            className={`flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50 ${
              activo
                ? "border-brand bg-brand-light text-brand"
                : "border-border bg-surface text-text-secondary hover:bg-background"
            }`}
          >
            <Icono className="size-4" />
            {etiqueta}
            {mostrarAtajos && <kbd className="rounded border border-border px-1.5 text-xs font-normal text-text-muted">{atajo}</kbd>}
          </button>
        );
      })}
    </div>
  );
}
