import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import type { CharacterSet } from "node-thermal-printer";
import type { FacturaImpresion, PrinterConfig } from "./types.js";

const ANCHO = 48; // 72 mm imprimibles con fuente A
const ANCHO_DOBLE = ANCHO / 2; // con doble ancho cada carácter ocupa 2 columnas

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
    width: ANCHO,
    // Configurable: se ajusta contra la página de autoprueba de la impresora.
    // Lanza si la página de códigos no existe para EPSON.
    characterSet: characterSet as CharacterSet,
    // El .d.ts de la librería marca `interface` como obligatorio, pero en runtime
    // es opcional (ver core.js). El cast solo acalla ese defecto de los tipos.
  } as ConstructorParameters<typeof ThermalPrinter>[0]);
}

/** Quita caracteres de control: evita que un texto del usuario inyecte comandos ESC/POS. */
function limpiar(texto: string): string {
  return texto.replace(/[\x00-\x1F\x7F]/g, " ").trim();
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "jueves, 19 de noviembre de 2026". A mano: no dependemos de los datos ICU de Electron. */
export function formatearFechaLarga(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return limpiar(iso);
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "05:30 p. m." (ASCII puro: sin NBSP, que CP858 no tiene y saldría como "?"). */
export function formatearHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return limpiar(iso);
  const h12 = d.getHours() % 12 || 12;
  return `${dosDigitos(h12)}:${dosDigitos(d.getMinutes())} ${d.getHours() < 12 ? "a. m." : "p. m."}`;
}

/** COP sin decimales: "$1.000". A mano por la misma razón (sin Intl/NBSP). */
export function formatearCOP(valor: number): string {
  const entero = Math.round(valor);
  const conPuntos = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${entero < 0 ? "-" : ""}$${conPuntos}`;
}

/** Parte un texto por palabras en líneas de `cols` como máximo (una palabra más larga se corta). */
function envolver(texto: string, cols: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of limpiar(texto).split(/\s+/).filter(Boolean)) {
    for (let w = palabra; w.length > 0; w = w.slice(cols)) {
      const trozo = w.slice(0, cols);
      if (!actual) actual = trozo;
      else if (actual.length + 1 + trozo.length <= cols) actual += " " + trozo;
      else {
        lineas.push(actual);
        actual = trozo;
      }
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** Texto centrado que hace salto de línea en vez de cortarse. */
function centrado(p: ThermalPrinter, texto: string, cols: number): void {
  p.alignCenter();
  for (const l of envolver(texto, cols)) p.println(l);
  p.alignLeft();
}

/**
 * Fila etiqueta (izq.) / valor (der.) en `cols` columnas. Si no caben en una línea,
 * el valor baja alineado a la derecha: nunca se parte un valor.
 */
function fila(p: ThermalPrinter, etiqueta: string, valor: string, cols: number): void {
  const e = limpiar(etiqueta);
  const v = limpiar(valor);
  p.alignLeft();
  if (e.length + 1 + v.length <= cols) {
    p.println(e + " ".repeat(cols - e.length - v.length) + v);
    return;
  }
  p.println(e);
  for (const l of envolver(v, cols)) p.println(" ".repeat(Math.max(0, cols - l.length)) + l);
}

export async function construirTicket(
  factura: FacturaImpresion,
  config: PrinterConfig,
): Promise<Buffer> {
  const p = crearConstructor(config.characterSet);
  const { encabezado } = config;

  // Inicio explícito, ANTES de la página de códigos porque ESC @ la reinicia:
  //   ESC @        reset
  //   ESC M 0      fuente A (12 puntos de ancho: 48 col. = 576 puntos = 72 mm)
  //   GS L 0 0     margen izquierdo 0
  //   GS W 64 02   ancho del área de impresión = 0x0240 = 576 puntos
  p.setBuffer(
    Buffer.from([0x1b, 0x40, 0x1b, 0x4d, 0x00, 0x1d, 0x4c, 0x00, 0x00, 0x1d, 0x57, 0x40, 0x02]),
  );
  p.setCharacterSet(config.characterSet as CharacterSet);

  // Tamaños con GS ! (no ESC !): ESC ! también borra la negrita, GS ! no la toca.
  // OJO: setTextSize(a, b) de esta librería arma el byte a*16+b y en GS ! el nibble alto es
  // el ANCHO, así que el primer argumento es el ancho, no el alto.
  const normal = () => p.setTextSize(0, 0);
  const altoDoble = () => p.setTextSize(0, 1); // ancho normal, alto doble (48 col.)
  const grande = () => p.setTextSize(1, 1); // ancho y alto dobles (24 col.)
  const sep = () => {
    normal();
    p.println("-".repeat(ANCHO));
  };
  p.bold(true); // ESC E 1: todo el recibo en negrita

  // --- Encabezado ---
  grande();
  centrado(p, "SMART PARK PRO", ANCHO_DOBLE);
  altoDoble();
  centrado(p, encabezado.nombre, ANCHO);
  if (encabezado.nit) centrado(p, `NIT ${encabezado.nit}`, ANCHO);
  if (encabezado.direccion) centrado(p, encabezado.direccion, ANCHO);
  if (encabezado.telefono) centrado(p, `Tel. ${encabezado.telefono}`, ANCHO);
  centrado(p, formatearFechaLarga(factura.fechaEmision), ANCHO);
  sep();

  // --- Título e identificación ---
  altoDoble();
  centrado(p, "RECIBO DE PAGO", ANCHO);
  fila(p, "Factura", factura.numero, ANCHO);
  grande(); // la placa va resaltada (24 columnas útiles)
  fila(p, "Placa", factura.placa.toUpperCase(), ANCHO_DOBLE);
  altoDoble();
  if (factura.tarjeta) fila(p, "Tarjeta", factura.tarjeta, ANCHO);
  fila(p, "Tipo", factura.tipoVehiculo === "moto" ? "Moto" : "Carro", ANCHO);
  sep();

  // --- Tiempos ---
  altoDoble();
  fila(p, "Ingreso", formatearHora(factura.horaEntrada), ANCHO);
  fila(p, "Salida", formatearHora(factura.horaSalida), ANCHO);
  fila(p, "Tiempo", factura.tiempoTotal, ANCHO);
  sep();

  // --- Cobro ---
  altoDoble();
  grande();
  fila(p, "Plan", factura.tarifaAplicada, ANCHO_DOBLE);
  altoDoble();
  if (factura.detalleCobro) fila(p, "Detalle", factura.detalleCobro, ANCHO);
  grande();
  fila(p, "TOTAL", formatearCOP(factura.total), ANCHO_DOBLE);
  sep();

  altoDoble();
  fila(p, "Pago", factura.metodoPago, ANCHO);
  sep();

  // --- Pie ---
  altoDoble();
  const pie = config.piePagina.trim() || "¡Gracias por su preferencia!";
  for (const linea of pie.split(/\r?\n/)) centrado(p, linea, ANCHO);
  centrado(p, "SmartPark Pro", ANCHO);
  normal();

  p.newLine();
  p.newLine();
  p.newLine();
  p.newLine();
  p.cut();
  if (config.abrirCajon) p.openCashDrawer();

  const buffer = p.getBuffer();
  if (!buffer) throw new Error("El tiquete quedó vacío.");
  return buffer;
}
