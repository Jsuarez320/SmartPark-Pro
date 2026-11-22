import { useCallback, useEffect, useState } from "react";
import type {
  PrinterConfig,
  ResultadoConfig,
  ResultadoImpresion,
  ResultadoImpresoras,
} from "./types";

const NO_DISPONIBLE = "La impresión solo está disponible en la aplicación de escritorio.";

/**
 * Configuración de la impresora (Configuración → Impresora) y prueba de impresión.
 * Para imprimir recibos de la operación usa `useImprimirRecibo`.
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
  const [impresoras, setImpresoras] = useState<string[]>([]);

  /** Ejecuta una llamada IPC: marca ocupado, captura errores inesperados y publica `error`. */
  const ejecutar = useCallback(
    async <T extends ResultadoImpresion | ResultadoConfig | ResultadoImpresoras>(llamada: () => Promise<T>): Promise<T | null> => {
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

  /** Vuelve a leer las impresoras instaladas en Windows. */
  const listarImpresoras = useCallback(async (): Promise<void> => {
    if (!api) return;
    const r = await ejecutar(() => api.listarImpresoras());
    if (r?.ok) setImpresoras(r.impresoras);
  }, [api, ejecutar]);

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
    impresoras,
    listarImpresoras,
    guardarConfig,
    imprimirPrueba,
  };
}
