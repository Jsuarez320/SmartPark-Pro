import { CheckCircle2, Loader2, Printer, TriangleAlert, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { mensajeFalloImpresion, type EstadoImpresion } from "@/shared/printing/useImprimirRecibo";
import { numeroRecibo } from "@/shared/types/recibo";

interface AvisoImpresionProps {
  estado: EstadoImpresion;
  onReintentar: () => void;
  onCerrar: () => void;
}

/** Resultado de la impresión de un recibo. Si falla, recuerda que la operación quedó registrada. */
export function AvisoImpresion({ estado, onReintentar, onCerrar }: AvisoImpresionProps) {
  if (estado.estado === "inactivo") return null;

  if (estado.estado === "imprimiendo") {
    return (
      <div role="status" className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" /> Imprimiendo recibo No. {numeroRecibo(estado.recibo.numero)}…
      </div>
    );
  }

  if (estado.estado === "ok") {
    return (
      <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="size-4" /> Recibo No. {numeroRecibo(estado.recibo.numero)} impreso.
        </span>
        <button onClick={onCerrar} aria-label="Cerrar aviso"><X className="size-4" /></button>
      </div>
    );
  }

  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
      <span className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        {mensajeFalloImpresion(estado.recibo, estado.mensaje)}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="outline" onClick={onReintentar} className="h-8 gap-1.5 px-2.5 text-xs">
          <Printer className="size-3.5" /> Reintentar
        </Button>
        <button onClick={onCerrar} aria-label="Cerrar aviso"><X className="size-4" /></button>
      </span>
    </div>
  );
}
