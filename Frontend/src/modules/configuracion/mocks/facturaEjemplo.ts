import type { FacturaImpresion } from "@/shared/printing/types";

/**
 * Recibo ficticio para probar la impresora desde Configuración (datos de la maqueta).
 * Temporal: cuando exista el endpoint de facturas, el flujo de cobro enviará datos reales.
 */
export function crearFacturaEjemplo(): FacturaImpresion {
  const salida = new Date();
  const entrada = new Date(salida.getTime() - 95 * 60_000);
  return {
    numero: "EJ-000001",
    fechaEmision: salida.toISOString(),
    cajero: "01 CAJERO 01",
    tiquete: "729360330190957-01",
    horaEntrada: entrada.toISOString(),
    horaSalida: salida.toISOString(),
    cedula: "222222222222",
    nombre: "CONSUMIDOR FINAL",
    tipoVehiculo: "moto",
    placa: "XZO75",
    marca: "HONDA",
    items: [
      { descripcion: "SERVICIO PARQUEADERO", cantidad: 1, valorUnitario: 1600, iva: 0, total: 1600 },
      { descripcion: "RECARGO", cantidad: 1, valorUnitario: 1600, iva: 0, total: 1600 },
    ],
    subtotal: 3200,
    descuento: 0,
    total: 3200,
    metodoPago: "Efectivo",
  };
}
