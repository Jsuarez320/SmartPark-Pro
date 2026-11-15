import type { FacturaImpresion } from "@/shared/printing/types";

/**
 * Factura ficticia para probar la impresora desde Configuración.
 * Temporal: cuando exista el endpoint de facturas, el flujo de cobro enviará datos reales.
 */
export function crearFacturaEjemplo(): FacturaImpresion {
  const salida = new Date();
  const entrada = new Date(salida.getTime() - (2 * 60 + 15) * 60_000);
  return {
    numero: "EJ-000001",
    fechaEmision: salida.toISOString(),
    placa: "ABC123",
    tipoVehiculo: "carro",
    horaEntrada: entrada.toISOString(),
    horaSalida: salida.toISOString(),
    tiempoTotal: "2 h 15 min",
    tarifaAplicada: "Bloque 15 min",
    total: 12000,
    metodoPago: "Efectivo",
  };
}
