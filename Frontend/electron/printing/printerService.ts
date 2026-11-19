import { construirTicket } from "./ticketBuilder.js";
import { guardarConfig, leerConfig } from "./printerConfig.js";
import { FileDumpProvider } from "./providers/fileDumpProvider.js";
import { WinspoolProvider } from "./providers/winspoolProvider.js";
import type { FacturaImpresion, PrinterConfig, PrinterProvider } from "./types.js";

/** Elige el provider según la config y la plataforma. Un EscPosRedProvider se añadiría aquí. */
export function elegirProvider(config: PrinterConfig, userDataDir: string): PrinterProvider {
  switch (config.modo) {
    case "dump":
      return new FileDumpProvider(userDataDir);
    case "usb":
      if (process.platform !== "win32") {
        // No caemos en silencio a 'dump': el operador creería que imprimió.
        throw new Error('El modo "USB" solo funciona en Windows. Usa "Solo archivo" en este equipo.');
      }
      return new WinspoolProvider(config.impresora);
  }
}

/** Factura ficticia para la prueba; el texto con tildes y ñ va en el pie. */
function facturaDePrueba(): FacturaImpresion {
  const ahora = new Date();
  const hace = new Date(ahora.getTime() - 75 * 60_000);
  return {
    numero: "SP-000001",
    tarjeta: "0042",
    detalleCobro: "6 × $1.000",
    fechaEmision: ahora.toISOString(),
    placa: "TEST123",
    tipoVehiculo: "carro",
    horaEntrada: hace.toISOString(),
    horaSalida: ahora.toISOString(),
    tiempoTotal: "1 h 25 min",
    tarifaAplicada: "Bloque 15 min",
    total: 1000,
    metodoPago: "Efectivo",
  };
}

/** `userDataDir` = app.getPath('userData'), inyectado desde ipc.ts para no acoplar a Electron. */
export function crearPrinterService(userDataDir: string) {
  // Cola en serie: dos clics seguidos no deben mezclar dos trabajos en el spooler.
  let cola: Promise<unknown> = Promise.resolve();
  const enSerie = <T>(tarea: () => Promise<T>): Promise<T> => {
    const siguiente = cola.then(tarea, tarea);
    cola = siguiente.catch(() => undefined);
    return siguiente;
  };

  async function imprimir(factura: FacturaImpresion, config: PrinterConfig): Promise<void> {
    const buffer = await construirTicket(factura, config);
    await elegirProvider(config, userDataDir).imprimir(buffer);
  }

  return {
    getConfig: (): PrinterConfig => leerConfig(userDataDir),
    setConfig: (raw: unknown): PrinterConfig => guardarConfig(userDataDir, raw),
    imprimirFactura: (factura: FacturaImpresion) =>
      enSerie(() => imprimir(factura, leerConfig(userDataDir))),
    imprimirPrueba: () =>
      enSerie(() => {
        const config = leerConfig(userDataDir);
        const conTexto: PrinterConfig = {
          ...config,
          piePagina: `Señor, añadió café en Bogotá\n${config.piePagina}`.trim(),
        };
        return imprimir(facturaDePrueba(), conTexto);
      }),
  };
}

export type PrinterService = ReturnType<typeof crearPrinterService>;
