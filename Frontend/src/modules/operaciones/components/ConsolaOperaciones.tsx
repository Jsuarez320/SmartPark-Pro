import { PlusCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function ConsolaOperaciones() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h3 className="text-sm font-bold tracking-wider uppercase text-text-secondary mb-2">
        Consola de Operaciones
      </h3>
      <p className="text-sm text-text-muted mb-6 leading-relaxed">
        Registre los ingresos de forma digital. El sistema de asignación de
        celdas automático rellenará el patio dinámicamente.
      </p>
      <Button className="w-full bg-brand hover:bg-brand-hover text-white rounded-lg py-6 flex items-center justify-center gap-2 font-bold shadow-md">
        <PlusCircle className="size-5" />
        Registrar Ingreso (Vehículo)
      </Button>
    </div>
  );
}
