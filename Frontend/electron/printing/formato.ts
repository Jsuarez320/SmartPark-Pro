/**
 * Utilitarios de maquetación para tiquetes de texto (ESC/POS). Reutilizables por el
 * recibo, el tiquete de entrada, el cierre de caja, etc.
 *
 * Todo es ASCII/Latin-1 puro (sin NBSP ni Intl): la página de códigos de la impresora
 * no tiene U+00A0 y saldría como "?".
 */

/** Columnas con fuente A: 72 mm = 576 puntos / 12. */
export const COLUMNAS = 48;
/** Con doble ancho cada carácter ocupa 2 columnas. */
export const COLUMNAS_DOBLE = COLUMNAS / 2;

/** Quita caracteres de control: evita que un texto del usuario inyecte comandos ESC/POS. */
export function limpiar(texto: string): string {
  return texto.replace(/[\x00-\x1F\x7F]/g, " ").trim();
}

/** Rellena con espacios a la izquierda (alinea a la derecha). No recorta. */
export function padLeft(texto: string, ancho: number): string {
  return texto.length >= ancho ? texto : " ".repeat(ancho - texto.length) + texto;
}

/** Rellena con espacios a la derecha (alinea a la izquierda). No recorta. */
export function padRight(texto: string, ancho: number): string {
  return texto.length >= ancho ? texto : texto + " ".repeat(ancho - texto.length);
}

/**
 * Parte un texto por palabras en líneas de `cols` como máximo.
 * Una palabra más larga que `cols` se corta (único caso en que se parte una palabra).
 */
export function envolver(texto: string, cols: number): string[] {
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

/**
 * Líneas para imprimir centradas. El centrado lo hace la impresora (ESC a 1); aquí solo
 * se hace el salto de línea por palabras. Respeta los saltos de línea del texto original.
 */
export function wrapCentered(texto: string, cols: number): string[] {
  return texto.split(/\r?\n/).flatMap((l) => envolver(l, cols));
}

/**
 * Izquierda + derecha en una línea de exactamente `cols` columnas.
 * Si no caben juntas devuelve dos líneas: la izquierda y el valor alineado a la derecha
 * (el valor nunca se parte; si es más largo que `cols` se envuelve alineado a la derecha).
 */
export function twoColumns(izq: string, der: string, cols: number): string[] {
  const i = limpiar(izq);
  const d = limpiar(der);
  if (i.length + 1 + d.length <= cols) return [i + " ".repeat(cols - i.length - d.length) + d];
  return [...envolver(i, cols), ...envolver(d, cols).map((l) => padLeft(l, cols))];
}

/**
 * "Etiqueta  : valor" con la etiqueta en ancho fijo. Si el valor no cabe, continúa en
 * líneas siguientes alineadas bajo el valor.
 */
export function labelValue(etiqueta: string, valor: string, cols: number, anchoEtiqueta = 10): string[] {
  const prefijo = padRight(limpiar(etiqueta), anchoEtiqueta) + ": ";
  const lineas = envolver(valor, Math.max(1, cols - prefijo.length));
  if (lineas.length === 0) return [prefijo.trimEnd()];
  return lineas.map((l, n) => (n === 0 ? prefijo : " ".repeat(prefijo.length)) + l);
}

/**
 * Dos pares "Etiqueta  : valor" en una fila; el segundo queda alineado a la derecha
 * ("Entrada   : 19/11/2026          Hora : 09:57"). Si no caben, un par por línea.
 */
export function labelValuePair(
  par1: [string, string],
  par2: [string, string],
  cols: number,
  anchoEtiqueta = 10,
): string[] {
  const izq = padRight(limpiar(par1[0]), anchoEtiqueta) + ": " + limpiar(par1[1]);
  const der = `${limpiar(par2[0])} : ${limpiar(par2[1])}`;
  if (izq.length + 1 + der.length <= cols) return twoColumns(izq, der, cols);
  return [
    ...labelValue(par1[0], par1[1], cols, anchoEtiqueta),
    ...labelValue(par2[0], par2[1], cols, anchoEtiqueta),
  ];
}

/** Bordes derechos (columna, base 1) de la tabla de ítems en 48 columnas. */
const BORDES_TABLA = [5, 20, 32, 48] as const;

/**
 * Fila de la tabla CANT / V. UNIT / IVA / TOTAL, todo alineado a la derecha:
 * CANT en las columnas 1-5, V. UNIT termina en la 20, IVA en la 32 y TOTAL en la 48.
 * Si alguna celda no cabe en su columna (cifras enormes) la fila se compacta: celdas
 * separadas por un espacio y alineadas a la derecha, sin pasar de 48 columnas.
 */
export function tableRow(celdas: [string, string, string, string], cols = COLUMNAS): string {
  const anchos = BORDES_TABLA.map((borde, n) => borde - (n === 0 ? 0 : BORDES_TABLA[n - 1]));
  if (cols === COLUMNAS && celdas.every((c, n) => c.length <= anchos[n])) {
    return celdas.map((c, n) => padLeft(c, anchos[n])).join("");
  }
  return padLeft(celdas.join(" "), cols).slice(-cols);
}

/** Fila de ítem: descripción envuelta en 48 col. y debajo los números en columnas. */
export function itemRows(
  item: { descripcion: string; cantidad: number; valorUnitario: number; iva: number; total: number },
  cols = COLUMNAS,
): string[] {
  const desc = envolver(item.descripcion, cols);
  return [
    ...desc,
    tableRow(
      [String(item.cantidad), formatearCOP(item.valorUnitario), formatearCOP(item.iva), formatearCOP(item.total)],
      cols,
    ),
  ];
}

// ------------------------------------------------------------------ dinero y fechas

/** Pesos colombianos sin decimales: "$1.600", "-$500". */
export function formatearCOP(valor: number): string {
  const entero = Math.round(valor);
  const conPuntos = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${entero < 0 ? "-" : ""}$${conPuntos}`;
}

function dos(n: number): string {
  return String(n).padStart(2, "0");
}

/** "19/11/2026" en hora local; si la fecha no es válida devuelve el texto limpio. */
export function formatearFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return limpiar(iso);
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "09:57" en 24 horas, hora local. */
export function formatearHora24(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return limpiar(iso);
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}
