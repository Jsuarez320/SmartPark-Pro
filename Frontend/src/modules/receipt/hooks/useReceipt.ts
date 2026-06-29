import { useState, useCallback } from "react";
import type { DatosPago, MetodoPago } from "../receipt.types";
import { imprimirRecibo } from "../services/receipt.service";

interface PagoState {
  cargando: boolean;
  pagado: boolean;
  datosRecibo: DatosPago | null;
}

export function useReceipt() {
  const [state, setState] = useState<PagoState>({
    cargando: false,
    pagado: false,
    datosRecibo: null,
  });
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [montoRecibido, setMontoRecibido] = useState(0);

  const pagar = useCallback(async (placa: string) => {
    setState((prev) => ({ ...prev, cargando: true }));

    await new Promise((r) => setTimeout(r, 800));

    const datos: DatosPago = {
      ticket: `TKT-${Date.now().toString(36).toUpperCase()}`,
      placa,
      tipo: "Carro",
      horaIngreso: new Date(Date.now() - 5400000).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      horaSalida: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      tiempoTranscurrido: "1h 30min",
      tarifa: 3200,
      total: Math.max(3200, montoRecibido || 3200),
      metodoPago,
      fecha: new Date().toLocaleDateString("es-CO", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      }),
    };

    setState({ cargando: false, pagado: true, datosRecibo: datos });
  }, [metodoPago, montoRecibido]);

  const imprimir = useCallback(() => {
    if (state.datosRecibo) {
      imprimirRecibo(state.datosRecibo);
    }
  }, [state.datosRecibo]);

  const reiniciar = useCallback(() => {
    setState({ cargando: false, pagado: false, datosRecibo: null });
    setMetodoPago("efectivo");
    setMontoRecibido(0);
  }, []);

  const agregarMonto = useCallback((cantidad: number) => {
    setMontoRecibido((prev) => prev + cantidad);
  }, []);

  return {
    ...state,
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
