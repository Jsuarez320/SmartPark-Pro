import type {
  ContenidoCierre,
  ContenidoIngreso,
  ContenidoMensualidad,
  ContenidoPago,
  MovimientoCierre,
  PeriodoCobro,
  ReciboGuardado,
  TarifaSnapshot,
  TramoCobro,
} from "./types.js";

/**
 * Validación del recibo que llega al main por IPC. Nunca se confía en el renderer: se revisan
 * tipos, rangos y largos de todo lo que las plantillas van a leer. Lanza Error en español.
 */

type Obj = Record<string, unknown>;

const MAX_TEXTO = 120;
const MAX_MOVIMIENTOS = 1000;
const MAX_PERIODOS = 100;
const DINERO_MAX = 1_000_000_000;

function esObjeto(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function objeto(v: unknown, ruta: string): Obj {
  if (!esObjeto(v)) throw new Error(`"${ruta}" debe ser un objeto.`);
  return v;
}

function texto(o: Obj, campo: string, ruta: string, max = MAX_TEXTO): string {
  const v = o[campo];
  if (typeof v !== "string") throw new Error(`"${ruta}${campo}" debe ser texto.`);
  if (v.length > max) throw new Error(`"${ruta}${campo}" supera ${max} caracteres.`);
  return v;
}

function textoNoVacio(o: Obj, campo: string, ruta: string, max = MAX_TEXTO): string {
  const v = texto(o, campo, ruta, max);
  if (v.trim() === "") throw new Error(`"${ruta}${campo}" no puede estar vacío.`);
  return v;
}

function textoONulo(o: Obj, campo: string, ruta: string, max = MAX_TEXTO): string | null {
  return o[campo] == null ? null : texto(o, campo, ruta, max);
}

function entero(o: Obj, campo: string, ruta: string, min: number, max: number): number {
  const v = o[campo];
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new Error(`"${ruta}${campo}" debe ser un entero entre ${min} y ${max}.`);
  }
  return v;
}

function enteroONulo(o: Obj, campo: string, ruta: string, min: number, max: number): number | null {
  return o[campo] == null ? null : entero(o, campo, ruta, min, max);
}

const dinero = (o: Obj, campo: string, ruta: string): number => entero(o, campo, ruta, 0, DINERO_MAX);

function numero(o: Obj, campo: string, ruta: string, min: number, max: number): number {
  const v = o[campo];
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
    throw new Error(`"${ruta}${campo}" debe ser un número entre ${min} y ${max}.`);
  }
  return v;
}

function booleano(o: Obj, campo: string, ruta: string): boolean {
  if (typeof o[campo] !== "boolean") throw new Error(`"${ruta}${campo}" debe ser verdadero o falso.`);
  return o[campo] as boolean;
}

function fecha(o: Obj, campo: string, ruta: string): string {
  const v = textoNoVacio(o, campo, ruta, 40);
  if (Number.isNaN(new Date(v).getTime())) throw new Error(`"${ruta}${campo}" no es una fecha válida.`);
  return v;
}

function fechaONula(o: Obj, campo: string, ruta: string): string | null {
  return o[campo] == null ? null : fecha(o, campo, ruta);
}

function opcion<T extends string>(o: Obj, campo: string, ruta: string, validas: readonly T[]): T {
  const v = o[campo];
  if (typeof v !== "string" || !(validas as readonly string[]).includes(v)) {
    throw new Error(`"${ruta}${campo}" debe ser uno de: ${validas.join(", ")}.`);
  }
  return v as T;
}

function lista(o: Obj, campo: string, ruta: string, max: number): unknown[] {
  const v = o[campo];
  if (!Array.isArray(v)) throw new Error(`"${ruta}${campo}" debe ser una lista.`);
  if (v.length > max) throw new Error(`"${ruta}${campo}" tiene más de ${max} elementos.`);
  return v;
}

const VEHICULOS = ["carro", "moto"] as const;

// ------------------------------------------------------------------ piezas del contenido
function tarifa(raw: unknown, ruta: string): TarifaSnapshot | null {
  if (raw == null) return null;
  const t = objeto(raw, ruta);
  const p = `${ruta}.`;
  return {
    versionId: entero(t, "versionId", p, 0, 1_000_000_000),
    valorHora: dinero(t, "valorHora", p),
    valorDia: dinero(t, "valorDia", p),
    valorHoraFestivo: dinero(t, "valorHoraFestivo", p),
    valorDiaFestivo: dinero(t, "valorDiaFestivo", p),
    nocturnaActiva: booleano(t, "nocturnaActiva", p),
    valorHoraNocturna: t.valorHoraNocturna == null ? null : dinero(t, "valorHoraNocturna", p),
    graciaMinutos: entero(t, "graciaMinutos", p, 0, 600),
  };
}

function tramo(raw: unknown, ruta: string): TramoCobro {
  const t = objeto(raw, ruta);
  const p = `${ruta}.`;
  return {
    tipo: opcion(t, "tipo", p, ["normal", "nocturna", "festivo"] as const),
    horas: entero(t, "horas", p, 0, 10_000),
    valorHora: dinero(t, "valorHora", p),
    subtotal: dinero(t, "subtotal", p),
  };
}

function periodo(raw: unknown, ruta: string): PeriodoCobro {
  const o = objeto(raw, ruta);
  const p = `${ruta}.`;
  return {
    inicio: fecha(o, "inicio", p),
    fin: fecha(o, "fin", p),
    subtotal: dinero(o, "subtotal", p),
    tope: dinero(o, "tope", p),
    total: dinero(o, "total", p),
    topeAplicado: booleano(o, "topeAplicado", p),
    tramos: lista(o, "tramos", p, 10).map((t, n) => tramo(t, `${p}tramos[${n}]`)),
  };
}

function movimiento(raw: unknown, ruta: string): MovimientoCierre {
  const o = objeto(raw, ruta);
  const p = `${ruta}.`;
  return {
    id: textoNoVacio(o, "id", p, 64),
    fecha: fecha(o, "fecha", p),
    operacion: opcion(o, "operacion", p, ["horas", "mensualidad"] as const),
    concepto: texto(o, "concepto", p, 150),
    placa: textoONulo(o, "placa", p, 12),
    medio: opcion(o, "medio", p, ["efectivo", "transferencia"] as const),
    monto: dinero(o, "monto", p),
  };
}

// ------------------------------------------------------------------ contenido por tipo
function ingreso(o: Obj): ContenidoIngreso {
  const p = "contenido.";
  let mensualidad: ContenidoIngreso["mensualidad"] = null;
  if (o.mensualidad != null) {
    const m = objeto(o.mensualidad, "contenido.mensualidad");
    mensualidad = {
      jornada: textoNoVacio(m, "jornada", "contenido.mensualidad.", 20),
      fechaFin: textoNoVacio(m, "fechaFin", "contenido.mensualidad.", 12),
      cliente: textoONulo(m, "cliente", "contenido.mensualidad.", 120),
    };
  }
  return {
    tipo: "ingreso",
    placa: textoNoVacio(o, "placa", p, 12),
    tipoVehiculo: opcion(o, "tipoVehiculo", p, VEHICULOS),
    horaEntrada: fecha(o, "horaEntrada", p),
    operador: texto(o, "operador", p, 120),
    esMensualidad: booleano(o, "esMensualidad", p),
    mensualidad,
    tarifa: tarifa(o.tarifa, "contenido.tarifa"),
    aviso: textoONulo(o, "aviso", p, 300),
  };
}

function pago(o: Obj): ContenidoPago {
  const p = "contenido.";
  return {
    tipo: "pago",
    placa: textoNoVacio(o, "placa", p, 12),
    tipoVehiculo: opcion(o, "tipoVehiculo", p, VEHICULOS),
    horaEntrada: fecha(o, "horaEntrada", p),
    horaSalida: fecha(o, "horaSalida", p),
    tiquete: enteroONulo(o, "tiquete", p, 1, 999_999_999),
    operador: texto(o, "operador", p, 120),
    esMensualidad: booleano(o, "esMensualidad", p),
    medioPago: textoONulo(o, "medioPago", p, 32),
    referencia: textoONulo(o, "referencia", p, 100),
    total: dinero(o, "total", p),
    minutosTotales: entero(o, "minutosTotales", p, 0, 10_000_000),
    minutosCobrados: entero(o, "minutosCobrados", p, 0, 10_000_000),
    horasCobradas: entero(o, "horasCobradas", p, 0, 1_000_000),
    topeAplicado: booleano(o, "topeAplicado", p),
    periodos: lista(o, "periodos", p, MAX_PERIODOS).map((x, n) => periodo(x, `contenido.periodos[${n}]`)),
    tarifa: tarifa(o.tarifa, "contenido.tarifa"),
  };
}

function mensualidad(o: Obj): ContenidoMensualidad {
  const p = "contenido.";
  return {
    tipo: "mensualidad",
    esRenovacion: booleano(o, "esRenovacion", p),
    placa: textoNoVacio(o, "placa", p, 12),
    placaAlterna: textoONulo(o, "placaAlterna", p, 12),
    tipoVehiculo: opcion(o, "tipoVehiculo", p, VEHICULOS),
    cliente: textoNoVacio(o, "cliente", p, 120),
    celular: textoONulo(o, "celular", p, 20),
    tarjeta: textoONulo(o, "tarjeta", p, 32),
    periodo: opcion(o, "periodo", p, ["1_dia", "15_dias", "1_mes"] as const),
    jornada: opcion(o, "jornada", p, ["manana", "tarde", "completa"] as const),
    fechaInicio: textoNoVacio(o, "fechaInicio", p, 12),
    fechaFin: textoNoVacio(o, "fechaFin", p, 12),
    valor: dinero(o, "valor", p),
    medioPago: textoNoVacio(o, "medioPago", p, 32),
    referencia: textoONulo(o, "referencia", p, 100),
    operador: texto(o, "operador", p, 120),
    tarifaVersionId: entero(o, "tarifaVersionId", p, 0, 1_000_000_000),
  };
}

function cierre(o: Obj): ContenidoCierre {
  const p = "contenido.";
  return {
    turnoId: textoNoVacio(o, "turnoId", p, 64),
    abiertoPor: texto(o, "abiertoPor", p, 120),
    cerradoPor: textoONulo(o, "cerradoPor", p, 120),
    fechaApertura: fecha(o, "fechaApertura", p),
    fechaCierre: fechaONula(o, "fechaCierre", p),
    horasTurno: numero(o, "horasTurno", p, 0, 100_000),
    baseEfectivo: dinero(o, "baseEfectivo", p),
    baseTransferencia: dinero(o, "baseTransferencia", p),
    efectivo: dinero(o, "efectivo", p),
    transferencia: dinero(o, "transferencia", p),
    totalRecaudado: dinero(o, "totalRecaudado", p),
    movimientosEfectivo: entero(o, "movimientosEfectivo", p, 0, 10_000_000),
    movimientosTransferencia: entero(o, "movimientosTransferencia", p, 0, 10_000_000),
    totalTransacciones: entero(o, "totalTransacciones", p, 0, 10_000_000),
    esperadoEfectivo: dinero(o, "esperadoEfectivo", p),
    esperadoTransferencia: dinero(o, "esperadoTransferencia", p),
    efectivoContado: enteroONulo(o, "efectivoContado", p, 0, DINERO_MAX),
    diferenciaEfectivo: enteroONulo(o, "diferenciaEfectivo", p, -DINERO_MAX, DINERO_MAX),
    notas: textoONulo(o, "notas", p, 500),
    movimientos: lista(o, "movimientos", p, MAX_MOVIMIENTOS).map((m, n) =>
      movimiento(m, `contenido.movimientos[${n}]`),
    ),
  };
}

// ------------------------------------------------------------------ entrada pública
export function validarRecibo(raw: unknown): ReciboGuardado {
  const r = objeto(raw, "recibo");
  const base = {
    numero: entero(r, "numero", "", 1, 999_999_999),
    creadoEn: fecha(r, "creadoEn", ""),
    reimpresiones: entero(r, "reimpresiones", "", 0, 9999),
    placa: textoONulo(r, "placa", "", 12),
  };
  const contenido = objeto(r.contenido, "contenido");
  const tipo = opcion(r, "tipo", "", ["ingreso", "pago", "mensualidad", "cierre_caja"] as const);

  switch (tipo) {
    case "ingreso":
      return { ...base, tipo, contenido: ingreso(contenido) };
    case "pago":
      return { ...base, tipo, contenido: pago(contenido) };
    case "mensualidad":
      return { ...base, tipo, contenido: mensualidad(contenido) };
    case "cierre_caja":
      return { ...base, tipo, contenido: cierre(contenido) };
  }
}
