import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import type { CharacterSet } from "node-thermal-printer";
import { COLUMNAS, COLUMNAS_DOBLE } from "./formato.js";
import { componerTicket } from "./plantillas.js";
import type { PrinterConfig, ReciboGuardado } from "./types.js";

/**
 * Por qué NO pasamos `interface` al constructor:
 * en node-thermal-printer el constructor solo hace require('./interfaces') si
 * `initConfig.interface` existe. Sin él no se cargan network/printer/file, no se
 * abre ninguna conexión y `getBuffer()` devuelve los bytes ESC/POS acumulados.
 * Además `execute()` lanzaría "No interface!", así que la librería nunca puede
 * imprimir por su cuenta: el envío es responsabilidad exclusiva del PrinterProvider.
 */
export function crearConstructor(characterSet: string): ThermalPrinter {
  return new ThermalPrinter({
    type: PrinterTypes.EPSON,
    width: COLUMNAS,
    // Configurable: se ajusta contra la página de autoprueba de la impresora.
    // Lanza si la página de códigos no existe para EPSON.
    characterSet: characterSet as CharacterSet,
    // El .d.ts de la librería marca `interface` como obligatorio, pero en runtime
    // es opcional (ver core.js). El cast solo acalla ese defecto de los tipos.
  } as ConstructorParameters<typeof ThermalPrinter>[0]);
}

/**
 * Una línea ya maquetada.
 *  - "normal": tamaño normal             -> 48 columnas (GS ! 0x00)  [cuerpo]
 *  - "alto":   doble alto, ancho normal  -> 48 columnas (GS ! 0x01)  [nombre del negocio]
 *  - "grande": doble ancho + doble alto  -> 24 columnas (GS ! 0x11)
 * `negrita` (ESC E 1/0) se aplica solo a esa línea; el resto del recibo va en texto normal.
 * Las líneas con `centrado` se centran en la impresora (ESC a 1); el resto va a la izquierda
 * y ya trae su relleno de espacios calculado.
 */
export interface Linea {
  texto: string;
  modo: "normal" | "alto" | "grande";
  centrado?: boolean;
  negrita?: boolean;
}

export const columnasDe = (l: Linea): number => (l.modo === "grande" ? COLUMNAS_DOBLE : COLUMNAS);

/**
 * Imprime UNA línea y deja el estado limpio: negrita (ESC E 0), tamaño (GS ! 0) y
 * alineación a la izquierda. Así ningún estilo "contamina" a las líneas siguientes.
 * Tamaño con GS ! (no ESC !); el primer argumento de setTextSize en la librería es el ANCHO.
 */
function imprimirLinea(p: ThermalPrinter, l: Linea): void {
  p.bold(l.negrita === true); // ESC E 1 / ESC E 0 antes del texto
  if (l.modo === "grande") p.setTextSize(1, 1); // GS ! 0x11
  else if (l.modo === "alto") p.setTextSize(0, 1); // GS ! 0x01
  else p.setTextSize(0, 0); // GS ! 0x00 (cuerpo)
  if (l.centrado) p.alignCenter();
  else p.alignLeft();
  p.println(l.texto);
  p.bold(false); // ESC E 0
  p.setTextSize(0, 0); // GS ! 0x00
  p.alignLeft();
}

/** Bytes ESC/POS de una lista de líneas ya maquetadas. */
export function construirDesdeLineas(lineas: Linea[], config: PrinterConfig): Buffer {
  const p = crearConstructor(config.characterSet);

  // Inicio explícito, ANTES de la página de códigos porque ESC @ la reinicia:
  //   ESC @        reset
  //   ESC M 0      fuente A (12 puntos de ancho: 48 col. = 576 puntos = 72 mm)
  //   GS L 0 0     margen izquierdo 0
  //   GS W 64 02   ancho del área de impresión = 0x0240 = 576 puntos
  p.setBuffer(
    Buffer.from([0x1b, 0x40, 0x1b, 0x4d, 0x00, 0x1d, 0x4c, 0x00, 0x00, 0x1d, 0x57, 0x40, 0x02]),
  );
  p.setCharacterSet(config.characterSet as CharacterSet);
  p.bold(false);

  for (const linea of lineas) imprimirLinea(p, linea);

  for (let i = 0; i < 4; i++) p.newLine();
  p.add(Buffer.from([0x1d, 0x56, 0x42, 0x00])); // GS V 66 0: avanza y corta parcialmente
  if (config.abrirCajon) p.openCashDrawer();

  const buffer = p.getBuffer();
  if (!buffer) throw new Error("El tiquete quedó vacío.");
  return buffer;
}

/** Tiquete de cualquier recibo guardado (ingreso, pago, mensualidad o cierre de caja). */
export function construirTicket(recibo: ReciboGuardado, config: PrinterConfig): Buffer {
  return construirDesdeLineas(componerTicket(recibo, config), config);
}
