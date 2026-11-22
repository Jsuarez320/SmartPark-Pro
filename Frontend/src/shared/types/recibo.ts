/**
 * Recibo guardado por el backend (GET/POST /recibos, y dentro de las respuestas de operaciones,
 * mensualidades y cierre de caja). `contenido` es el snapshot que se imprime y reimprime: no se
 * recalcula. Espejo del contenido que valida electron/printing/validarRecibo.ts.
 */

export type TipoRecibo = "ingreso" | "pago" | "mensualidad" | "cierre_caja";
export type TipoVehiculo = "carro" | "moto";
export type MedioPago = "efectivo" | "transferencia";
export type PeriodoMensualidad = "1_dia" | "15_dias" | "1_mes";
export type Jornada = "manana" | "tarde" | "completa";

/** Precios y reglas con los que se cobró, tal como estaban en ese momento. */
export interface TarifaSnapshot {
  versionId: number;
  valorHora: number;
  valorDia: number;
  valorHoraFestivo: number;
  valorDiaFestivo: number;
  nocturnaActiva: boolean;
  valorHoraNocturna: number | null;
  graciaMinutos: number;
}

export interface ContenidoIngreso {
  tipo: "ingreso";
  placa: string;
  tipoVehiculo: TipoVehiculo;
  horaEntrada: string;
  operador: string;
  esMensualidad: boolean;
  mensualidad: { jornada: Jornada; fechaFin: string; cliente: string | null } | null;
  tarifa: TarifaSnapshot | null;
  aviso: string | null;
}

export interface TramoCobro {
  tipo: "normal" | "nocturna" | "festivo";
  horas: number;
  valorHora: number;
  subtotal: number;
}

export interface PeriodoCobro {
  inicio: string;
  fin: string;
  subtotal: number;
  tope: number;
  total: number;
  topeAplicado: boolean;
  tramos: TramoCobro[];
}

export interface ContenidoPago {
  tipo: "pago";
  placa: string;
  tipoVehiculo: TipoVehiculo;
  horaEntrada: string;
  horaSalida: string;
  /** Número del recibo de ingreso (el tiquete entregado al cliente). */
  tiquete: number | null;
  operador: string;
  esMensualidad: boolean;
  medioPago: MedioPago | null;
  referencia: string | null;
  total: number;
  minutosTotales: number;
  minutosCobrados: number;
  horasCobradas: number;
  topeAplicado: boolean;
  periodos: PeriodoCobro[];
  tarifa: TarifaSnapshot | null;
}

export interface ContenidoMensualidad {
  tipo: "mensualidad";
  esRenovacion: boolean;
  placa: string;
  placaAlterna: string | null;
  tipoVehiculo: TipoVehiculo;
  cliente: string;
  celular: string | null;
  tarjeta: string | null;
  periodo: PeriodoMensualidad;
  jornada: Jornada;
  fechaInicio: string;
  fechaFin: string;
  valor: number;
  medioPago: MedioPago;
  referencia: string | null;
  operador: string;
  tarifaVersionId: number;
}

export interface MovimientoCierre {
  id: string;
  fecha: string;
  operacion: "horas" | "mensualidad";
  concepto: string;
  placa: string | null;
  medio: MedioPago;
  monto: number;
}

export interface ContenidoCierre {
  turnoId: string;
  abiertoPor: string;
  cerradoPor: string | null;
  fechaApertura: string;
  fechaCierre: string | null;
  horasTurno: number;
  baseEfectivo: number;
  baseTransferencia: number;
  efectivo: number;
  transferencia: number;
  totalRecaudado: number;
  movimientosEfectivo: number;
  movimientosTransferencia: number;
  totalTransacciones: number;
  esperadoEfectivo: number;
  esperadoTransferencia: number;
  efectivoContado: number | null;
  diferenciaEfectivo: number | null;
  notas: string | null;
  movimientos: MovimientoCierre[];
}

interface ReciboBase {
  id: string;
  /** Consecutivo del recibo. */
  numero: number;
  placa?: string | null;
  creadoEn: string;
  /** Copias ya sacadas; si es mayor que 0 el ticket dice COPIA. */
  reimpresiones: number;
  ultimaReimpresion?: string | null;
}

export type ReciboApi =
  | (ReciboBase & { tipo: "ingreso"; contenido: ContenidoIngreso })
  | (ReciboBase & { tipo: "pago"; contenido: ContenidoPago })
  | (ReciboBase & { tipo: "mensualidad"; contenido: ContenidoMensualidad })
  | (ReciboBase & { tipo: "cierre_caja"; contenido: ContenidoCierre });

/** Fila del buscador de recibos (GET /recibos). */
export interface ReciboResumen {
  id: string;
  numero: number;
  tipo: TipoRecibo;
  placa?: string | null;
  creadoEn: string;
  reimpresiones: number;
  total?: number | null;
  medioPago?: MedioPago | null;
  operador?: string | null;
}

export const NOMBRE_TIPO_RECIBO: Record<TipoRecibo, string> = {
  ingreso: "Entrada",
  pago: "Pago por horas",
  mensualidad: "Mensualidad",
  cierre_caja: "Cierre de caja",
};

/** Número con ceros a la izquierda: 123 → "000123" (igual que el ticket impreso). */
export const numeroRecibo = (numero: number): string => String(numero).padStart(6, "0");
