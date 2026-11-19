import { useCallback, useEffect, useState } from "react";
import type { FacturaImpresion, PrinterConfig, ResultadoConfig, ResultadoImpresion } from "./types";

const NO_DISPONIBLE = "La impresión solo está disponible en la aplicación de escritorio.";

/**
 * Envuelve window.smartpark.printer con estados de carga y error.
 * Nunca lanza: cada acción devuelve el resultado y deja el mensaje en `error`.
 */
export function usePrinter() {
  const api = typeof window === "undefined" ? undefined : window.smartpark?.printer;
  const disponible = api !== undefined;

  const [config, setConfig] = useState<PrinterConfig | null>(null);
  const [cargando, setCargando] = useState(disponible);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Ejecuta una llamada IPC: marca ocupado, captura errores inesperados y publica `error`. */
  const ejecutar = useCallback(
    async <T extends ResultadoImpresion | ResultadoConfig>(llamada: () => Promise<T>): Promise<T | null> => {
      setError(null);
      setOcupado(true);
      try {
        const resultado = await llamada();
        if (!resultado.ok) setError(resultado.error);
        return resultado;
      } catch {
        // El main no lanza, pero si el canal falla (p. ej. ventana cerrándose) no dejamos la UI colgada.
        setError("No se pudo comunicar con el servicio de impresión.");
        return null;
      } finally {
        setOcupado(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!api) return;
    let activo = true;
    void api
      .getConfig()
      .then((r) => {
        if (!activo) return;
        if (r.ok) setConfig(r.config);
        else setError(r.error);
      })
      .catch(() => activo && setError("No se pudo leer la configuración de la impresora."))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [api]);

  const guardarConfig = useCallback(
    async (nueva: PrinterConfig): Promise<boolean> => {
      if (!api) {
        setError(NO_DISPONIBLE);
        return false;
      }
      const r = await ejecutar(() => api.setConfig(nueva));
      if (r?.ok) {
        setConfig(r.config);
        return true;
      }
      return false;
    },
    [api, ejecutar],
  );

  const imprimirFactura = useCallback(
    async (factura: FacturaImpresion): Promise<boolean> => {
      if (!api) {
        setError(NO_DISPONIBLE);
        return false;
      }
      return (await ejecutar(() => api.imprimirFactura(factura)))?.ok === true;
    },
    [api, ejecutar],
  );

  const imprimirPrueba = useCallback(async (): Promise<boolean> => {
    if (!api) {
      setError(NO_DISPONIBLE);
      return false;
    }
    return (await ejecutar(() => api.imprimirPrueba()))?.ok === true;
  }, [api, ejecutar]);

  return {
    disponible,
    config,
    cargando,
    ocupado,
    error,
    limpiarError: () => setError(null),
    guardarConfig,
    imprimirFactura,
    imprimirPrueba,
  };
}
