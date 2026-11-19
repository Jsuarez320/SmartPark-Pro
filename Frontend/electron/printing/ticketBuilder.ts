import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import type { CharacterSet } from "node-thermal-printer";
import {
  COLUMNAS,
  COLUMNAS_DOBLE,
  formatearCOP,
  formatearFecha,
  formatearHora24,
  itemRows,
  labelValue,
  labelValuePair,
  limpiar,
  tableRow,
  twoColumns,
  wrapCentered,
} from "./formato.js";
import type { PrinterConfig, ReciboData } from "./types.js";

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

const CEDULA_GENERICA = "222222222222";
const NOMBRE_GENERICO = "CONSUMIDOR FINAL";

/** Maqueta del recibo como lista de líneas. Pura (sin ESC/POS): fácil de probar. */
export function componerRecibo(r: ReciboData, config: PrinterConfig): Linea[] {
  const lineas: Linea[] = [];
  const izq = (textos: string[], negrita = false) =>
    textos.forEach((texto) => lineas.push({ texto, modo: "normal", negrita }));
  const centro = (texto: string, negrita = false, modo: Linea["modo"] = "normal") =>
    wrapCentered(texto, COLUMNAS).forEach((t) => lineas.push({ texto: t, modo, centrado: true, negrita }));
  const sep = () => izq(["-".repeat(COLUMNAS)]);
  const { encabezado: e } = config;

  // --- Encabezado: cada campo vacío omite su línea ---
  if (limpiar(e.nombre)) centro(e.nombre, true, "alto");
  if (limpiar(e.nit)) centro(`NIT ${e.nit}`);
  if (limpiar(e.horario)) centro(e.horario);
  if (limpiar(e.direccion)) centro(e.direccion);
  if (limpiar(e.telefono)) centro(e.telefono);
  if (limpiar(e.resolucionDian)) centro(e.resolucionDian);
  izq([""]);

  // --- Datos de la factura ---
  izq(twoColumns("FACTURA DE VENTA", r.numero, COLUMNAS), true);
  izq(["SISTEMA POS"], true);
  if (r.cajero && limpiar(r.cajero)) izq(labelValue("Cajero No", r.cajero, COLUMNAS));
  if (r.tiquete && limpiar(r.tiquete)) izq(labelValue("Tiquete No", r.tiquete, COLUMNAS));
  izq(labelValuePair(["Entrada", formatearFecha(r.horaEntrada)], ["Hora", formatearHora24(r.horaEntrada)], COLUMNAS));
  izq(labelValuePair(["Salida", formatearFecha(r.horaSalida)], ["Hora", formatearHora24(r.horaSalida)], COLUMNAS));
  izq(labelValue("Cédula", limpiar(r.cedula ?? "") || CEDULA_GENERICA, COLUMNAS));
  izq(labelValue("Nombre", limpiar(r.nombre ?? "") || NOMBRE_GENERICO, COLUMNAS));
  izq(
    labelValuePair(
      ["Tipo Veh.", r.tipoVehiculo === "moto" ? "MOTO" : "CARRO"],
      ["Placa", limpiar(r.placa).toUpperCase()],
      COLUMNAS,
    ),
  );
  if (r.marca && limpiar(r.marca)) izq(labelValue("Marca", r.marca, COLUMNAS));
  if (r.metodoPago && limpiar(r.metodoPago)) izq(labelValue("Pago", r.metodoPago, COLUMNAS));

  // --- Tabla de ítems: una fila por concepto cobrado ---
  sep();
  izq([tableRow(["CANT.", "V. UNIT", "IVA", "TOTAL"])], true);
  sep();
  for (const item of r.items) izq(itemRows(item));

  // --- Totales (bloque alineado a la derecha, desde la columna 22) ---
  const sangria = " ".repeat(21);
  const derecha = (etiqueta: string, valor: number) =>
    izq(twoColumns(etiqueta, formatearCOP(valor), COLUMNAS - sangria.length).map((l) => sangria + l), true);
  derecha("SUBTOTAL", r.subtotal);
  derecha("DESCUENTO", r.descuento);
  twoColumns("TOTAL", formatearCOP(r.total), COLUMNAS_DOBLE).forEach((t) => lineas.push({ texto: t, modo: "grande", negrita: true }));
  sep();

  // --- Pie configurable ---
  if (limpiar(config.piePagina)) centro(config.piePagina);

  return lineas;
}

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

export async function construirTicket(r: ReciboData, config: PrinterConfig): Promise<Buffer> {
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

  for (const linea of componerRecibo(r, config)) imprimirLinea(p, linea);

  for (let i = 0; i < 4; i++) p.newLine();
  p.add(Buffer.from([0x1d, 0x56, 0x42, 0x00])); // GS V 66 0: avanza y corta parcialmente
  if (config.abrirCajon) p.openCashDrawer();

  const buffer = p.getBuffer();
  if (!buffer) throw new Error("El tiquete quedó vacío.");
  return buffer;
}
