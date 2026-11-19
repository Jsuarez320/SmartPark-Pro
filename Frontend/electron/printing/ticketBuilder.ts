import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import type { CharacterSet } from "node-thermal-printer";
import type { FacturaImpresion, PrinterConfig } from "./types.js";

const ANCHO = 48; // 80 mm con fuente A

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

/** "14/11/2026 18:05" en hora local; el tiquete es para quien está en el parqueadero. */
export function formatearFechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return limpiar(iso);
  return (
    `${dosDigitos(d.getDate())}/${dosDigitos(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`
  );
}

/**
 * COP sin decimales: "$ 12.000". Se arma a mano en vez de Intl porque Intl 'es-CO'
 * puede usar espacios no separables (U+00A0) que no existen en CP858 y saldrían como "?".
 */
export function formatearCOP(valor: number): string {
  const entero = Math.round(valor);
  const conPuntos = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${entero < 0 ? "-" : ""}$ ${conPuntos}`;
}

export async function construirTicket(
  factura: FacturaImpresion,
  config: PrinterConfig,
): Promise<Buffer> {
  const p = crearConstructor(config.characterSet);
  const { encabezado } = config;

  // --- Encabezado ---
  p.alignCenter();
  p.bold(true);
  p.println(limpiar(encabezado.nombre));
  p.bold(false);
  if (encabezado.nit) p.println(`NIT ${limpiar(encabezado.nit)}`);
  if (encabezado.direccion) p.println(limpiar(encabezado.direccion));
  if (encabezado.telefono) p.println(`Tel. ${limpiar(encabezado.telefono)}`);
  p.drawLine();

  // --- Datos de la factura ---
  p.alignLeft();
  p.leftRight("Factura No.", limpiar(factura.numero));
  p.leftRight("Emisión", formatearFechaHora(factura.fechaEmision));
  p.drawLine();

  // --- Placa grande y en negrita ---
  p.alignCenter();
  p.bold(true);
  p.setTextSize(2, 2);
  p.println(limpiar(factura.placa).toUpperCase());
  p.setTextNormal();
  p.bold(false);
  p.println(factura.tipoVehiculo === "moto" ? "Moto" : "Carro");
  p.drawLine();

  // --- Tiempos y cobro ---
  p.alignLeft();
  p.leftRight("Entrada", formatearFechaHora(factura.horaEntrada));
  p.leftRight("Salida", formatearFechaHora(factura.horaSalida));
  p.leftRight("Tiempo total", limpiar(factura.tiempoTotal));
  p.leftRight("Tarifa", limpiar(factura.tarifaAplicada));
  p.leftRight("Método de pago", limpiar(factura.metodoPago));
  p.drawLine();
  p.bold(true);
  p.setTextSize(1, 1);
  // Con texto doble ancho cada carácter ocupa 2 columnas: el ancho útil baja a la mitad.
  const etiqueta = "TOTAL";
  const monto = formatearCOP(factura.total);
  const relleno = Math.max(1, ANCHO / 2 - etiqueta.length - monto.length);
  p.println(etiqueta + " ".repeat(relleno) + monto);
  p.setTextNormal();
  p.bold(false);
  p.drawLine();

  // --- Pie ---
  if (config.piePagina) {
    p.alignCenter();
    for (const linea of config.piePagina.split(/\r?\n/)) p.println(limpiar(linea));
  }

  p.cut();
  if (config.abrirCajon) p.openCashDrawer();

  const buffer = p.getBuffer();
  if (!buffer) throw new Error("El tiquete quedó vacío.");
  return buffer;
}
