import { useState, useCallback, useEffect } from "react";
import { formatDuracion, formatHora, getApiError } from "@/shared/utils/formatters";
import type { DatosPago, MetodoPago, VehiculoPatio } from "../receipt.types";
import { imprimirRecibo, obtenerVehiculoPatio, procesarPago } from "../services/receipt.service";

/**
 * Cobro de la salida de un vehículo. Al abrirse el modal (ingresoId definido)
 * consulta el cobro actualizado a la API; el total definitivo lo calcula el backend.
 */
export function useReceipt(ingresoId: string | null) {
  const [vehiculo, setVehiculo] = useState<VehiculoPatio | null>(null);
  const [cargandoVehiculo, setCargandoVehiculo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datosRecibo, setDatosRecibo] = useState<DatosPago | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [montoRecibido, setMontoRecibido] = useState(0);

  useEffect(() => {
    if (!ingresoId) return;
    let cancelado = false;
    setCargandoVehiculo(true);
    setError(null);
    obtenerVehiculoPatio(ingresoId)
      .then((v) => !cancelado && setVehiculo(v))
      .catch((err) => !cancelado && setError(getApiError(err, "No se pudo consultar el vehículo")))
      .finally(() => !cancelado && setCargandoVehiculo(false));
    return () => {
      cancelado = true;
    };
  }, [ingresoId]);

  const pagar = useCallback(async () => {
    if (!ingresoId || !vehiculo) return false;
    setCargando(true);
    setError(null);
    try {
      const res = await procesarPago({
        ingresoId,
        metodoPago: vehiculo.valor > 0 ? metodoPago : undefined,
      });
      setDatosRecibo({
        ticket: res.ticket,
        placa: res.placa,
        tarjeta: res.tarjeta,
        tipo: res.tipo,
        plan: res.plan,
        horaIngreso: formatHora(res.horaIngreso),
        horaSalida: formatHora(res.horaSalida),
        tiempoTranscurrido: formatDuracion(res.minutos),
        bloques: res.bloques,
        valorBloque: res.valorBloque,
        topeAplicado: res.topeAplicado,
        total: res.total,
        metodoPago: res.metodoPago ?? "Sin cobro",
        fecha: new Date(res.horaSalida).toLocaleDateString("es-CO", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        }),
      });
      return true;
    } catch (err) {
      setError(getApiError(err, "No se pudo registrar la salida"));
      return false;
    } finally {
      setCargando(false);
    }
  }, [ingresoId, vehiculo, metodoPago]);

  const imprimir = useCallback(() => {
    if (datosRecibo) imprimirRecibo(datosRecibo);
  }, [datosRecibo]);

  const reiniciar = useCallback(() => {
    setVehiculo(null);
    setDatosRecibo(null);
    setError(null);
    setMetodoPago("efectivo");
    setMontoRecibido(0);
  }, []);

  const agregarMonto = useCallback((cantidad: number) => {
    setMontoRecibido((prev) => prev + cantidad);
  }, []);

  return {
    vehiculo,
    cargandoVehiculo,
    cargando,
    error,
    pagado: datosRecibo !== null,
    datosRecibo,
    metodoPago,
    setMetodoPago,
    montoRecibido,
    setMontoRecibido,
    agregarMonto,
    pagar,
    imprimir,
    reiniciar,
  };
}
