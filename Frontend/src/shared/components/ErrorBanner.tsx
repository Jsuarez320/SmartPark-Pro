interface ErrorBannerProps {
  mensaje: string | null | undefined;
  onCerrar?: () => void;
}

/** Error de la API o de una validación, en el estilo de toda la aplicación. */
export function ErrorBanner({ mensaje, onCerrar }: ErrorBannerProps) {
  if (!mensaje) return null;
  return (
    <div
      className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      role="alert"
    >
      <span>{mensaje}</span>
      {onCerrar && (
        <button onClick={onCerrar} className="font-semibold">
          Cerrar
        </button>
      )}
    </div>
  );
}

/** Etiqueta + campo con el espaciado estándar de los formularios. */
export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-secondary">{etiqueta}</label>
      {children}
      {ayuda && <p className="text-xs text-text-subtle">{ayuda}</p>}
    </div>
  );
}
