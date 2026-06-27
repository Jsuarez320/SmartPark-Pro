import { Settings, Play } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function ConsolaSimulador() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-bold text-text-secondary mb-2">
        <span className="text-accent"><Settings className="size-5" /></span>
        Consola del Simulador
      </h3>
      <p className="text-sm text-text-muted mb-6 leading-relaxed">
        Ejecute eventos virtuales y restaure la infraestructura para pruebas rápidas
      </p>

      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-widest uppercase text-text-subtle mb-4">
          Simulador de tránsito de demostración
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="flex flex-col items-center justify-center gap-2 h-20 border-border hover:bg-background text-text-tertiary font-semibold shadow-sm rounded-xl">
            <Play className="size-6 text-accent" />
            Simular Entrada
          </Button>
          <Button variant="outline" className="flex flex-col items-center justify-center gap-2 h-20 border-border hover:bg-background text-text-tertiary font-semibold shadow-sm rounded-xl">
            <Play className="size-6 text-destructive rotate-180" />
            Simular Salida
          </Button>
        </div>
      </div>
    </div>
  );
}
