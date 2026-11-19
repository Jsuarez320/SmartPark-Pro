import { useState, useCallback, useEffect } from "react";
import { formatDuracion, formatHora, getApiError } from "@/shared/utils/formatters";
import { usePrinter } from "@/shared/printing/usePrinter";
import type { FacturaImpresion } from "@/shared/printing/types";
import type { DatosPago, MetodoPago, SalidaResponse, VehiculoPatio } from "../receipt.types";
import { obtenerVehiculoPatio, procesarPago } from "../services/receipt.service";

/**
 * Un concepto por cobro: bloques × valor del bloque cuando cuadra con el total; si no
 * (tope diario, mínimo, membresía) una sola fila por el total. El backend aún no envía
 * recargos ni mensualidades por separado: cuando lo haga, aquí se mapea una fila por concepto.
 */
function armarRecibo(res: SalidaResponse): FacturaImpresion {
  const cuadra = res.bloques > 0 && res.bloques * res.valorBloque === res.total && !res.topeAplicado;
  return {
    numero: res.ticket,
    fechaEmision: res.horaSalida,
    tiquete: res.tarjeta || undefined,
    horaEntrada: res.horaIngreso,
    horaSalida: res.horaSalida,
    tipoVehiculo: res.tipo,
    placa: res.placa,
    items: [
      {
        descripcion: res.topeAplicado ? "SERVICIO PARQUEADERO (TOPE DIARIO)" : "SERVICIO PARQUEADERO",
        cantidad: cuadra ? res.bloques : 1,
        valorUnitario: cuadra ? res.valorBloque : res.total,
        iva: 0,
        total: res.total,
      },
    ],
    subtotal: res.total,
    descuento: 0,
    total: res.total,
    metodoPago: etiquetaMetodo(res.metodoPago),
  };
}

/** "efectivo" → "Efectivo" (el recibo no usa CSS para capitalizar). */
function etiquetaMetodo(metodo?: string | null): string {
  return metodo ? metodo.charAt(0).toUpperCase() + metodo.slice(1) : "Sin cobro";
}

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
  const { imprimirFactura, ocupado: imprimiendo, error: errorImpresion, limpiarError } = usePrinter();

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
        factura: armarRecibo(res),
      });
      return true;
    } catch (err) {
      setError(getApiError(err, "No se pudo registrar la salida"));
      return false;
    } finally {
      setCargando(false);
    }
  }, [ingresoId, vehiculo, metodoPago]);

  /** Imprime en la térmica (ESC/POS RAW). Un fallo no revierte el cobro: solo se informa. */
  const imprimir = useCallback(async () => {
    if (datosRecibo) await imprimirFactura(datosRecibo.factura); // el error queda en errorImpresion
  }, [datosRecibo, imprimirFactura]);

  const reiniciar = useCallback(() => {
    setVehiculo(null);
    setDatosRecibo(null);
    setError(null);
    limpiarError();
    setMetodoPago("efectivo");
    setMontoRecibido(0);
  }, [limpiarError]);

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
    imprimiendo,
    errorImpresion,
    reiniciar,
  };
}
