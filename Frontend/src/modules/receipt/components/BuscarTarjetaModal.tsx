import { useEffect, useRef, useState } from "react";
import { X, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { getApiError } from "@/shared/utils/formatters";
import { obtenerPatio } from "../services/receipt.service";

interface BuscarTarjetaModalProps {
  open: boolean;
  onClose: () => void;
  /** Se llama cuando la tarjeta leída corresponde a un vehículo en el patio. */
  onEncontrado: (ingresoId: string, tarjeta: string) => void;
}

export function BuscarTarjetaModal({ open, onClose, onEncontrado }: BuscarTarjetaModalProps) {
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCodigo("");
      setError(null);
    }
  }, [open]);

  // Mantiene el foco en el campo para que el lector (que actúa como teclado) escriba ahí.
  useEffect(() => {
    if (open && !buscando) inputRef.current?.focus();
  }, [open, buscando, error]);

  if (!open) return null;

  const buscar = async () => {
    const tarjeta = codigo.trim();
    if (!tarjeta || buscando) return;

    setBuscando(true);
    setError(null);
    try {
      // Consulta por el código exacto: no depende de ningún filtro con retraso.
      const resultados = await obtenerPatio(tarjeta);
      const vehiculo = resultados.find((v) => v.tarjeta.toUpperCase() === tarjeta);
      if (vehiculo) {
        onEncontrado(vehiculo.ingresoId, tarjeta);
      } else {
        setError(`No hay un vehículo en el patio con la tarjeta ${tarjeta}`);
        setCodigo("");
      }
    } catch (err) {
      setError(getApiError(err, "No se pudo buscar el vehículo"));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-text-subtle hover:text-text-muted transition-colors"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>

        <div className="text-center mb-5">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-brand-light">
            <CreditCard className="size-7 text-brand" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Buscar por tarjeta</h2>
          <p className="text-sm text-text-muted mt-1">
            Pase la tarjeta del vehículo por el lector
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            buscar();
          }}
          className="space-y-4"
        >
          <Input
            ref={inputRef}
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="Esperando tarjeta..."
            className="h-12 text-center font-mono text-lg font-bold tracking-wider"
            disabled={buscando}
            maxLength={32}
            autoComplete="off"
          />

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={buscando || !codigo.trim()}
              className="flex-1 h-11 bg-brand hover:bg-brand-hover text-white font-semibold"
            >
              {buscando ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Buscando...
                </span>
              ) : (
                "Buscar"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
