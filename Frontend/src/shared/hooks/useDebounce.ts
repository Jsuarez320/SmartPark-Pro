import { useEffect, useState } from "react";

/** Devuelve `valor` con un retraso: útil para no consultar la API en cada tecla de un buscador. */
export function useDebounce<T>(valor: T, retrasoMs = 300): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), retrasoMs);
    return () => clearTimeout(id);
  }, [valor, retrasoMs]);
  return debounced;
}
