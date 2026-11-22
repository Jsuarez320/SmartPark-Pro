import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useImprimirRecibo } from "@/shared/printing/useImprimirRecibo";
import { getApiError } from "@/shared/utils/formatters";
import { normalizarPlaca } from "@/shared/utils/placa";
import type { MedioPago, RegistrarOperacionDatos, RespuestaOperacion, SalidaPendiente, TipoVehiculo } from "../operaciones.types";
import { registrarOperacion } from "../services/operaciones.service";

const esSalidaConValor = (r: RespuestaOperacion): r is SalidaPendiente => r.requierePago && !r.registrado && r.cobro !== null;

/**
 * Flujo de la pantalla de operaciones. El empleado solo escribe la placa y elige el tipo de vehículo:
 *   Enter → el backend decide ENTRADA o SALIDA.
 *   Salida con valor → queda "pendiente" (sin guardar) hasta confirmar el medio de pago.
 *   Si la impresora falla, la operación YA quedó registrada: se avisa y se puede reintentar o reimprimir.
 */
export function useOperacion() {
  const qc = useQueryClient();
  const [placa, setPlaca] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState<TipoVehiculo>("carro");
  const [pendiente, setPendiente] = useState<SalidaPendiente | null>(null);
  const [ultima, setUltima] = useState<RespuestaOperacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const impresion = useImprimirRecibo();
  const { imprimir } = impresion;
  const mutacion = useMutation({ mutationFn: registrarOperacion });

  const refrescar = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["operaciones"] });
    void qc.invalidateQueries({ queryKey: ["caja"] });
    void qc.invalidateQueries({ queryKey: ["recibos"] });
  }, [qc]);

  const finalizar = useCallback(
    (r: RespuestaOperacion) => {
      setUltima(r);
      setPendiente(null);
      setPlaca("");
      setError(null);
      refrescar();
      // Se imprime la entrada y toda salida con cobro. Una salida sin cobro (gracia o mensualidad) no gasta papel.
      if (r.recibo && (r.tipo === "entrada" || (r.cobro?.total ?? 0) > 0)) void imprimir(r.recibo);
    },
    [refrescar, imprimir],
  );

  const enviarDatos = useCallback(
    async (datos: RegistrarOperacionDatos): Promise<RespuestaOperacion | null> => {
      setError(null);
      try {
        const r = await mutacion.mutateAsync(datos);
        if (esSalidaConValor(r)) setPendiente(r);
        else if (r.registrado) finalizar(r);
        return r;
      } catch (e) {
        setError(getApiError(e, "No se pudo registrar la operación"));
        return null;
      }
    },
    [mutacion, finalizar],
  );

  /** Enter en la placa. */
  const registrar = useCallback(
    (placaForzada?: string, tipoForzado?: TipoVehiculo) => {
      const p = normalizarPlaca(placaForzada ?? placa);
      if (!p) return Promise.resolve(null);
      return enviarDatos({ placa: p, tipoVehiculo: tipoForzado ?? tipoVehiculo });
    },
    [placa, tipoVehiculo, enviarDatos],
  );

  /** Confirma el cobro de la salida pendiente con el medio de pago elegido. */
  const confirmarPago = useCallback(
    async (medioPago: MedioPago, referencia: string) => {
      if (!pendiente) return;
      setError(null);
      try {
        const r = await mutacion.mutateAsync({
          placa: pendiente.placa,
          medioPago,
          referencia: referencia.trim() || undefined,
          totalConfirmado: pendiente.cobro.total,
        });
        if (r.registrado) finalizar(r);
      } catch (e) {
        const detalle = getApiError(e, "No se pudo registrar el cobro");
        setError(detalle);
        // Pasó a otra hora y el valor cambió: se vuelve a calcular para que el empleado vea el nuevo total.
        if ((e as AxiosError).response?.status === 409 && /cambió/.test(detalle)) {
          try {
            const nueva = await registrarOperacion({ placa: pendiente.placa });
            if (esSalidaConValor(nueva)) setPendiente(nueva);
          } catch {
            /* se deja el aviso original */
          }
        }
      }
    },
    [pendiente, mutacion, finalizar],
  );

  const cancelarPago = useCallback(() => {
    setPendiente(null);
    setError(null);
  }, []);

  const reintentarImpresion = useCallback(() => {
    const recibo = ultima?.recibo;
    if (recibo) void imprimir(recibo);
  }, [ultima, imprimir]);

  return {
    placa,
    setPlaca: (valor: string) => setPlaca(normalizarPlaca(valor)),
    tipoVehiculo,
    setTipoVehiculo,
    enviando: mutacion.isPending,
    pendiente,
    ultima,
    error,
    limpiarError: () => setError(null),
    registrar,
    confirmarPago,
    cancelarPago,
    impresion,
    reintentarImpresion,
  };
}
