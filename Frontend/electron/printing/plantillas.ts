import {
  COLUMNAS,
  COLUMNAS_DOBLE,
  capitalizar,
  envolver,
  formatearCOP,
  formatearDia,
  formatearDuracion,
  formatearFecha,
  formatearHora24,
  labelValue,
  labelValuePair,
  limpiar,
  twoColumns,
  wrapCentered,
} from "./formato.js";
import type { Linea } from "./ticketBuilder.js";
import type {
  ContenidoCierre,
  ContenidoIngreso,
  ContenidoMensualidad,
  ContenidoPago,
  PrinterConfig,
  ReciboGuardado,
} from "./types.js";

/**
 * Plantillas de los cuatro tipos de recibo. Son funciones PURAS: reciben el recibo guardado
 * (lo que devuelve el backend) y devuelven líneas ya maquetadas; no tocan ESC/POS ni el disco.
 * Nada se recalcula: todo sale del `contenido` guardado.
 */

const NOMBRE_JORNADA = { manana: "Mañana", tarde: "Tarde", completa: "Completa" } as const;
const NOMBRE_PERIODO = { "1_dia": "1 día", "15_dias": "15 días", "1_mes": "1 mes" } as const;
const NOMBRE_TRAMO = { normal: "Hora", nocturna: "Hora nocturna", festivo: "Hora dom/fest" } as const;

/** Número de recibo con ceros a la izquierda: 123 → "000123". */
export const numeroRecibo = (numero: number): string => String(numero).padStart(6, "0");

type Par = [string, string];

/** Armador de líneas: evita repetir los mismos cierres en cada plantilla. */
class Maqueta {
  readonly lineas: Linea[] = [];

  izq(textos: string[], negrita = false): void {
    textos.forEach((texto) => this.lineas.push({ texto, modo: "normal", negrita }));
  }

  centro(texto: string, negrita = false, modo: Linea["modo"] = "normal"): void {
    wrapCentered(texto, modo === "grande" ? COLUMNAS_DOBLE : COLUMNAS).forEach((t) =>
      this.lineas.push({ texto: t, modo, centrado: true, negrita }),
    );
  }

  /** Línea de total en doble ancho + doble alto (24 columnas). */
  total(valor: number): void {
    twoColumns("TOTAL", formatearCOP(valor), COLUMNAS_DOBLE).forEach((t) =>
      this.lineas.push({ texto: t, modo: "grande", negrita: true }),
    );
  }

  sep(): void {
    this.izq(["-".repeat(COLUMNAS)]);
  }

  vacia(): void {
    this.izq([""]);
  }
}

function encabezado(m: Maqueta, config: PrinterConfig, conResolucion: boolean): void {
  const e = config.encabezado;
  if (limpiar(e.nombre)) m.centro(e.nombre, true, "alto");
  if (limpiar(e.nit)) m.centro(`NIT ${e.nit}`);
  if (limpiar(e.horario)) m.centro(e.horario);
  if (limpiar(e.direccion)) m.centro(e.direccion);
  if (limpiar(e.telefono)) m.centro(e.telefono);
  if (conResolucion && limpiar(e.resolucionDian)) m.centro(e.resolucionDian);
}

/** Título + número de recibo + marca de COPIA si ya se reimprimió. */
function cabecera(m: Maqueta, config: PrinterConfig, r: ReciboGuardado, titulo: string, conResolucion = false): void {
  encabezado(m, config, conResolucion);
  m.vacia();
  if (r.reimpresiones > 0) m.centro(`*** COPIA ${r.reimpresiones} ***`, true);
  m.centro(titulo, true);
  m.izq(twoColumns("Recibo No.", numeroRecibo(r.numero), COLUMNAS), true);
}

function pie(m: Maqueta, config: PrinterConfig, r: ReciboGuardado): void {
  if (limpiar(config.piePagina)) m.centro(config.piePagina);
  if (r.reimpresiones > 0) {
    m.vacia();
    m.centro(`*** COPIA ${r.reimpresiones} ***`, true);
  }
}

const datosVehiculo = (tipo: string, placa: string): [Par, Par] => [
  ["Tipo Veh.", tipo === "moto" ? "MOTO" : "CARRO"],
  ["Placa", limpiar(placa).toUpperCase()],
];

function medioDePago(m: Maqueta, medio: string | null, referencia: string | null): void {
  if (medio) m.izq(labelValue("Pago", capitalizar(medio), COLUMNAS));
  if (referencia && limpiar(referencia)) m.izq(labelValue("Referencia", referencia, COLUMNAS));
}

// ------------------------------------------------------------------ ingreso
function ingreso(r: ReciboGuardado & { tipo: "ingreso" }, config: PrinterConfig): Linea[] {
  const c: ContenidoIngreso = r.contenido;
  const m = new Maqueta();
  cabecera(m, config, r, "RECIBO DE ENTRADA");
  m.sep();
  // El número del recibo es el tiquete: lo que el cliente presenta para retirar el vehículo.
  m.centro("TIQUETE");
  m.centro(numeroRecibo(r.numero), true, "grande");
  m.sep();
  m.izq(labelValue("Cajero", c.operador, COLUMNAS));
  m.izq(labelValuePair(["Entrada", formatearFecha(c.horaEntrada)], ["Hora", formatearHora24(c.horaEntrada)], COLUMNAS));
  const [tipo, placa] = datosVehiculo(c.tipoVehiculo, c.placa);
  m.izq(labelValuePair(tipo, placa, COLUMNAS));

  if (c.mensualidad) {
    m.sep();
    m.centro("MENSUALIDAD", true);
    if (c.mensualidad.cliente) m.izq(labelValue("Cliente", c.mensualidad.cliente, COLUMNAS));
    const jornada = NOMBRE_JORNADA[c.mensualidad.jornada as keyof typeof NOMBRE_JORNADA] ?? c.mensualidad.jornada;
    m.izq(labelValue("Jornada", jornada, COLUMNAS));
    m.izq(labelValue("Vence", formatearDia(c.mensualidad.fechaFin), COLUMNAS));
    m.centro("Ingreso sin cobro por hora");
  } else if (c.tarifa) {
    const t = c.tarifa;
    m.sep();
    m.centro("TARIFAS", true);
    m.izq(labelValue("Hora", formatearCOP(t.valorHora), COLUMNAS, 14));
    m.izq(labelValue("Dom/festivo", formatearCOP(t.valorHoraFestivo), COLUMNAS, 14));
    if (t.nocturnaActiva && t.valorHoraNocturna != null) {
      m.izq(labelValue("Nocturna", formatearCOP(t.valorHoraNocturna), COLUMNAS, 14));
    }
    m.izq(labelValue("Máximo día", formatearCOP(t.valorDia), COLUMNAS, 14));
    m.izq(labelValue("Gracia", `${t.graciaMinutos} min`, COLUMNAS, 14));
  }

  m.sep();
  if (c.aviso && limpiar(c.aviso)) {
    m.centro(c.aviso);
    m.sep();
  }
  if (!c.esMensualidad) m.centro("Conserve este recibo: lo necesita para retirar su vehículo.");
  pie(m, config, r);
  return m.lineas;
}

// ------------------------------------------------------------------ pago por horas
function pago(r: ReciboGuardado & { tipo: "pago" }, config: PrinterConfig): Linea[] {
  const c: ContenidoPago = r.contenido;
  const m = new Maqueta();
  cabecera(m, config, r, "RECIBO DE PAGO", true);
  m.sep();
  if (c.tiquete != null) m.izq(labelValue("Tiquete No", numeroRecibo(c.tiquete), COLUMNAS));
  m.izq(labelValue("Cajero", c.operador, COLUMNAS));
  m.izq(labelValuePair(["Entrada", formatearFecha(c.horaEntrada)], ["Hora", formatearHora24(c.horaEntrada)], COLUMNAS));
  m.izq(labelValuePair(["Salida", formatearFecha(c.horaSalida)], ["Hora", formatearHora24(c.horaSalida)], COLUMNAS));
  const [tipo, placa] = datosVehiculo(c.tipoVehiculo, c.placa);
  m.izq(labelValuePair(tipo, placa, COLUMNAS));
  m.izq(labelValue("Tiempo", formatearDuracion(c.minutosTotales), COLUMNAS));
  m.sep();

  if (c.esMensualidad) {
    m.centro("MENSUALIDAD VIGENTE", true);
    m.centro("Salida sin cobro");
  } else if (c.total === 0) {
    m.centro("Dentro del tiempo de gracia", true);
    m.centro("Salida sin cobro");
  } else {
    m.centro("DETALLE DEL COBRO", true);
    m.izq(labelValue("Horas", String(c.horasCobradas), COLUMNAS));
    c.periodos.forEach((p, n) => {
      if (c.periodos.length > 1) m.izq([`Día ${n + 1}`], true);
      for (const t of p.tramos) {
        const etiqueta = `${t.horas} h ${NOMBRE_TRAMO[t.tipo]} x ${formatearCOP(t.valorHora)}`;
        m.izq(twoColumns(etiqueta, formatearCOP(t.subtotal), COLUMNAS));
      }
      if (p.topeAplicado) m.izq(twoColumns("Tope del día aplicado", formatearCOP(p.total), COLUMNAS));
    });
    medioDePago(m, c.medioPago, c.referencia);
  }

  m.sep();
  m.total(c.total);
  m.sep();
  pie(m, config, r);
  return m.lineas;
}

// ------------------------------------------------------------------ mensualidad
function mensualidad(r: ReciboGuardado & { tipo: "mensualidad" }, config: PrinterConfig): Linea[] {
  const c: ContenidoMensualidad = r.contenido;
  const m = new Maqueta();
  cabecera(m, config, r, c.esRenovacion ? "RENOVACIÓN DE MENSUALIDAD" : "RECIBO DE MENSUALIDAD", true);
  m.sep();
  m.izq(labelValue("Cliente", c.cliente, COLUMNAS));
  if (c.celular && limpiar(c.celular)) m.izq(labelValue("Celular", c.celular, COLUMNAS));
  const [tipo, placa] = datosVehiculo(c.tipoVehiculo, c.placa);
  m.izq(labelValuePair(tipo, placa, COLUMNAS));
  if (c.placaAlterna) m.izq(labelValue("Placa alt.", limpiar(c.placaAlterna).toUpperCase(), COLUMNAS));
  if (c.tarjeta && limpiar(c.tarjeta)) m.izq(labelValue("Tarjeta", c.tarjeta, COLUMNAS));
  m.sep();
  m.izq(labelValue("Periodo", NOMBRE_PERIODO[c.periodo] ?? c.periodo, COLUMNAS));
  m.izq(labelValue("Jornada", NOMBRE_JORNADA[c.jornada] ?? c.jornada, COLUMNAS));
  m.izq(labelValue("Desde", formatearDia(c.fechaInicio), COLUMNAS));
  m.izq(labelValue("Hasta", formatearDia(c.fechaFin), COLUMNAS));
  m.izq(labelValue("Cajero", c.operador, COLUMNAS));
  medioDePago(m, c.medioPago, c.referencia);
  m.sep();
  m.total(c.valor);
  m.sep();
  pie(m, config, r);
  return m.lineas;
}

// ------------------------------------------------------------------ cierre de caja
function cierre(r: ReciboGuardado & { tipo: "cierre_caja" }, config: PrinterConfig): Linea[] {
  const c: ContenidoCierre = r.contenido;
  const m = new Maqueta();
  cabecera(m, config, r, "CIERRE DE CAJA");
  m.sep();
  m.izq(labelValue("Abrió", c.abiertoPor, COLUMNAS, 8));
  m.izq(labelValuePair(["Apertura", formatearFecha(c.fechaApertura)], ["Hora", formatearHora24(c.fechaApertura)], COLUMNAS));
  if (c.cerradoPor) m.izq(labelValue("Cerró", c.cerradoPor, COLUMNAS, 8));
  if (c.fechaCierre) {
    m.izq(labelValuePair(["Cierre", formatearFecha(c.fechaCierre)], ["Hora", formatearHora24(c.fechaCierre)], COLUMNAS));
  }

  m.sep();
  m.centro("BASES INICIALES", true);
  m.izq(twoColumns("Efectivo", formatearCOP(c.baseEfectivo), COLUMNAS));
  m.izq(twoColumns("Transferencias", formatearCOP(c.baseTransferencia), COLUMNAS));

  m.sep();
  m.centro("COBRADO EN EL TURNO", true);
  m.izq(twoColumns(`Efectivo (${c.movimientosEfectivo} mov.)`, formatearCOP(c.efectivo), COLUMNAS));
  m.izq(twoColumns(`Transferencia (${c.movimientosTransferencia} mov.)`, formatearCOP(c.transferencia), COLUMNAS));
  m.izq(twoColumns(`TOTAL (${c.totalTransacciones} movimientos)`, formatearCOP(c.totalRecaudado), COLUMNAS), true);

  m.sep();
  m.centro("EFECTIVO EN CAJA", true);
  m.izq(twoColumns("Esperado (base + cobrado)", formatearCOP(c.esperadoEfectivo), COLUMNAS), true);
  if (c.efectivoContado != null) {
    m.izq(twoColumns("Contado", formatearCOP(c.efectivoContado), COLUMNAS));
    const d = c.diferenciaEfectivo ?? c.efectivoContado - c.esperadoEfectivo;
    const etiqueta = d === 0 ? "CUADRADO" : d > 0 ? "SOBRANTE" : "FALTANTE";
    m.izq(twoColumns(etiqueta, formatearCOP(Math.abs(d)), COLUMNAS), true);
  }
  m.izq(twoColumns("Transferencias esperadas", formatearCOP(c.esperadoTransferencia), COLUMNAS));

  if (c.movimientos.length > 0) {
    m.sep();
    m.centro("DETALLE DE MOVIMIENTOS", true);
    for (const mov of c.movimientos) {
      const placa = mov.placa ? limpiar(mov.placa).toUpperCase() : "-";
      const tipo = mov.operacion === "mensualidad" ? "Mens." : "Horas";
      const medio = mov.medio === "efectivo" ? "Ef." : "Tr.";
      m.izq(twoColumns(`${formatearHora24(mov.fecha)} ${placa} ${tipo} ${medio}`, formatearCOP(mov.monto), COLUMNAS));
    }
  }

  if (c.notas && limpiar(c.notas)) {
    m.sep();
    m.izq(["Notas:"], true);
    m.izq(envolver(c.notas, COLUMNAS));
  }

  m.sep();
  m.vacia();
  m.vacia();
  m.izq(["-".repeat(30)]);
  m.centro("Firma de quien cierra");
  pie(m, config, r);
  return m.lineas;
}

/** Maqueta de cualquier recibo guardado como lista de líneas. Pura (sin ESC/POS): fácil de probar. */
export function componerTicket(r: ReciboGuardado, config: PrinterConfig): Linea[] {
  switch (r.tipo) {
    case "ingreso":
      return ingreso(r, config);
    case "pago":
      return pago(r, config);
    case "mensualidad":
      return mensualidad(r, config);
    case "cierre_caja":
      return cierre(r, config);
  }
}
