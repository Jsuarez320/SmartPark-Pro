import { useCallback, useRef, useState } from "react";
import type { ReciboApi } from "@/shared/types/recibo";
import { numeroRecibo } from "@/shared/types/recibo";

export type EstadoImpresion =
  | { estado: "inactivo" }
  | { estado: "imprimiendo"; recibo: ReciboApi }
  | { estado: "ok"; recibo: ReciboApi }
  | { estado: "error"; recibo: ReciboApi; mensaje: string };

const NO_DISPONIBLE = "La impresión solo está disponible en la aplicación de escritorio.";

/**
 * Imprime un recibo guardado por el backend con la impresora térmica (proceso main de Electron).
 *
 * REGLA: si la impresora falla, la operación YA quedó registrada. Esto nunca lanza ni revierte nada:
 * deja el resultado en `estado` para avisar al empleado que puede reintentar o reimprimir desde Recibos.
 */
export function useImprimirRecibo() {
  const [estado, setEstado] = useState<EstadoImpresion>({ estado: "inactivo" });
  const enCurso = useRef(false);

  const imprimir = useCallback(async (recibo: ReciboApi): Promise<boolean> => {
    if (enCurso.current) return false;
    enCurso.current = true;
    setEstado({ estado: "imprimiendo", recibo });
    try {
      const api = typeof window === "undefined" ? undefined : window.smartpark?.printer;
      if (!api) {
        setEstado({ estado: "error", recibo, mensaje: NO_DISPONIBLE });
        return false;
      }
      const r = await api.imprimirRecibo(recibo);
      if (r.ok) {
        setEstado({ estado: "ok", recibo });
        return true;
      }
      setEstado({ estado: "error", recibo, mensaje: r.error });
      return false;
    } catch {
      // El main no lanza, pero si el canal IPC falla no dejamos la interfaz colgada.
      setEstado({ estado: "error", recibo, mensaje: "No se pudo comunicar con el servicio de impresión." });
      return false;
    } finally {
      enCurso.current = false;
    }
  }, []);

  const limpiar = useCallback(() => setEstado({ estado: "inactivo" }), []);

  return { estado, imprimir, limpiar, imprimiendo: estado.estado === "imprimiendo" };
}

/** Texto para avisar que falló la impresión pero la operación quedó registrada. */
export function mensajeFalloImpresion(recibo: ReciboApi, motivo: string): string {
  return `No se pudo imprimir el recibo No. ${numeroRecibo(recibo.numero)} (${motivo}). La operación quedó registrada: puede reintentar o reimprimirlo desde Recibos.`;
}
