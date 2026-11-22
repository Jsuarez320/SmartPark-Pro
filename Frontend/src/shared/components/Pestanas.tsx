interface PestanasProps<T extends string> {
  items: { valor: T; etiqueta: string; contador?: number }[];
  valor: T;
  onChange: (valor: T) => void;
  etiquetaAccesible: string;
}

/** Pestañas / filtros en píldora, con el mismo estilo del resto de la aplicación. */
export function Pestanas<T extends string>({ items, valor, onChange, etiquetaAccesible }: PestanasProps<T>) {
  return (
    <div role="tablist" aria-label={etiquetaAccesible} className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1">
      {items.map((i) => {
        const activo = i.valor === valor;
        return (
          <button
            key={i.valor}
            role="tab"
            aria-selected={activo}
            type="button"
            onClick={() => onChange(i.valor)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activo ? "bg-brand text-white shadow-sm" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {i.etiqueta}
            {i.contador !== undefined && i.contador > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${activo ? "bg-white/25" : "bg-border"}`}>{i.contador}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
