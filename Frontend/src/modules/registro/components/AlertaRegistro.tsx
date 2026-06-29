import { CheckCircle, X, Printer, QrCode, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export interface RespuestaRegistro {
  mensaje: string;
  id: string;
  estado: string;
  placa: string;
  tipo: string;
  horaIngreso: string;
  total?: number;
}

interface AlertaRegistroProps {
  open: boolean;
  data: RespuestaRegistro | null;
  onClose: () => void;
}

export function AlertaRegistro({ open, data, onClose }: AlertaRegistroProps) {
  if (!open || !data) return null;

  const esError = data.estado === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-text-subtle hover:text-text-muted">
          <X className="size-5" />
        </button>

        <div className="text-center mb-6">
          <div className={`mx-auto mb-3 flex size-14 items-center justify-center rounded-full ${esError ? "bg-red-100" : "bg-green-100"}`}>
            {esError ? (
              <AlertCircle className="size-7 text-red-600" />
            ) : (
              <CheckCircle className="size-7 text-green-600" />
            )}
          </div>
          <h2 className={`text-xl font-bold ${esError ? "text-red-700" : "text-text-primary"}`}>
            {esError ? "Error al Registrar" : "Registro Exitoso"}
          </h2>
          <p className="text-sm text-text-muted mt-1">{data.mensaje}</p>
        </div>

        <div className="rounded-xl bg-background border border-border p-4 space-y-3">
          {!esError && (
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Ticket</span>
              <span className="text-sm font-mono font-bold text-text-primary">{data.id.slice(0, 8).toUpperCase()}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Estado</p>
              <span className={`inline-flex items-center gap-1 mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${esError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                <span className={`size-1.5 rounded-full ${esError ? "bg-red-500" : "bg-green-500"}`} />
                {esError ? "Falló" : data.estado}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Placa</p>
              <p className="font-bold text-text-primary mt-0.5">{data.placa}</p>
            </div>
          </div>

          {!esError && (
            <>
              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-text-muted">Tipo</span>
                <span className="font-medium text-text-primary capitalize">{data.tipo}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Hora de Ingreso</span>
                <span className="font-medium text-text-primary">{data.horaIngreso}</span>
              </div>
            </>
          )}

          {data.total !== undefined && !esError && (
            <div className="flex items-center justify-between text-sm pt-1 border-t border-border">
              <span className="text-text-muted">Total a Pagar</span>
              <span className="text-lg font-bold text-brand">${data.total.toLocaleString()}</span>
            </div>
          )}
        </div>

        {!esError && (
          <div className="flex justify-center my-3">
            <QrCode className="size-16 text-text-subtle opacity-40" />
          </div>
        )}

        <div className="flex gap-3 mt-4">
          {!esError && (
            <Button onClick={() => window.print()} className="flex-1 h-11 bg-brand hover:bg-brand-hover text-white font-semibold gap-2">
              <Printer className="size-4" />
              Imprimir
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className={`${esError ? "w-full" : "flex-1"} h-11 border-border text-text-muted font-semibold`}>
            {esError ? "Intentar de nuevo" : "Aceptar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
