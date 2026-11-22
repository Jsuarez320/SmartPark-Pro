import * as React from "react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils";

interface InputPesosProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  /** Texto del campo (se mantiene como string mientras se escribe). */
  value: string;
  onChange: (valor: string) => void;
}

/** Campo numérico en pesos COP con prefijo "$". Solo deja escribir dígitos. */
export const InputPesos = React.forwardRef<HTMLInputElement, InputPesosProps>(
  ({ value, onChange, className, ...props }, ref) => (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-subtle">$</span>
      <Input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className={cn("pl-7", className)}
        {...props}
      />
    </div>
  ),
);
InputPesos.displayName = "InputPesos";

/** "12500" → 12500; vacío o inválido → null. */
export function aPesos(texto: string): number | null {
  if (texto.trim() === "") return null;
  const n = Number(texto);
  return Number.isInteger(n) && n >= 0 ? n : null;
}
