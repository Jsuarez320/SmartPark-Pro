import { reciboDePrueba } from "./ejemplos.js";
import { construirTicket } from "./ticketBuilder.js";
import { guardarConfig, leerConfig } from "./printerConfig.js";
import { FileDumpProvider } from "./providers/fileDumpProvider.js";
import { WinspoolProvider } from "./providers/winspoolProvider.js";
import type { PrinterConfig, PrinterProvider, ReciboGuardado } from "./types.js";

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

/** El encabezado de la prueba usa el configurado y rellena con ejemplos lo que esté vacío. */
function conEncabezadoDeEjemplo(config: PrinterConfig): PrinterConfig {
  const ejemplo = {
    nombre: "PARQUEADERO SMART PARK",
    nit: "900.123.456-7",
    horario: "LUNES A VIERNES 6 AM A 8 PM\nSÁBADOS 7 AM A 2 PM",
    direccion: "CL 12 # 1 - 62 LA PLAYA",
    telefono: "320 436 8215",
    resolucionDian: "",
  };
  const e = config.encabezado;
  return {
    ...config,
    encabezado: {
      nombre: e.nombre.trim() || ejemplo.nombre,
      nit: e.nit.trim() || ejemplo.nit,
      horario: e.horario.trim() || ejemplo.horario,
      direccion: e.direccion.trim() || ejemplo.direccion,
      telefono: e.telefono.trim() || ejemplo.telefono,
      resolucionDian: e.resolucionDian,
    },
  };
}

/**
 * ÚNICO servicio de impresión. Imprime cualquier recibo guardado (ingreso, pago, mensualidad o
 * cierre de caja) con su plantilla. `userDataDir` = app.getPath('userData'), inyectado desde
 * ipc.ts para no acoplar a Electron.
 */
export function crearPrinterService(userDataDir: string) {
  // Cola en serie: dos clics seguidos no deben mezclar dos trabajos en el spooler.
  let cola: Promise<unknown> = Promise.resolve();
  const enSerie = <T>(tarea: () => Promise<T>): Promise<T> => {
    const siguiente = cola.then(tarea, tarea);
    cola = siguiente.catch(() => undefined);
    return siguiente;
  };

  async function imprimir(recibo: ReciboGuardado, config: PrinterConfig): Promise<void> {
    const buffer = construirTicket(recibo, config);
    await elegirProvider(config, userDataDir).imprimir(buffer);
  }

  return {
    getConfig: (): PrinterConfig => leerConfig(userDataDir),
    setConfig: (raw: unknown): PrinterConfig => guardarConfig(userDataDir, raw),
    imprimirRecibo: (recibo: ReciboGuardado) => enSerie(() => imprimir(recibo, leerConfig(userDataDir))),
    imprimirPrueba: () =>
      enSerie(() => imprimir(reciboDePrueba(), conEncabezadoDeEjemplo(leerConfig(userDataDir)))),
  };
}

export type PrinterService = ReturnType<typeof crearPrinterService>;
