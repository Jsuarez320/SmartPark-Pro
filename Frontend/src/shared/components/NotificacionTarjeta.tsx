import { useEffect } from "react";
import { CreditCard, X } from "lucide-react";

interface NotificacionTarjetaProps {
  /** Código de la tarjeta detectada; null oculta la notificación. */
  codigo: string | null;
  onClose: () => void;
  duracionMs?: number;
}

export function NotificacionTarjeta({ codigo, onClose, duracionMs = 3000 }: NotificacionTarjetaProps) {
  useEffect(() => {
    if (!codigo) return;
    const id = setTimeout(onClose, duracionMs);
    return () => clearTimeout(id);
  }, [codigo, duracionMs, onClose]);

  if (!codigo) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-[60] flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-brand-light">
        <CreditCard className="size-5 text-brand" />
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary">Tarjeta detectada</p>
        <p className="font-mono text-xs font-bold tracking-wider text-text-muted">{codigo}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-2 text-text-subtle transition-colors hover:text-text-muted"
        aria-label="Cerrar notificación"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
