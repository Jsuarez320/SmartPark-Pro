/**
 * Tipos del subsistema de impresión (proceso main).
 *
 * Fuente de verdad. El renderer tiene un espejo en src/shared/types/recibo.ts (recibos) y
 * src/shared/printing/types.ts (configuración); los dos tsconfig son proyectos separados:
 * si cambias uno, cambia el otro.
 *
 * Se imprime SIEMPRE el recibo GUARDADO por el backend (`contenido`): nunca se recalcula nada.
 */

export type TipoVehiculo = "carro" | "moto";
export type ModoImpresion = "usb" | "dump";

// ------------------------------------------------------------------ recibo guardado (API del backend)

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
  mensualidad: { jornada: string; fechaFin: string; cliente: string | null } | null;
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
  medioPago: string | null;
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
  periodo: "1_dia" | "15_dias" | "1_mes";
  jornada: "manana" | "tarde" | "completa";
  fechaInicio: string;
  fechaFin: string;
  valor: number;
  medioPago: string;
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
  medio: "efectivo" | "transferencia";
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
  /** Consecutivo del recibo. */
  numero: number;
  creadoEn: string;
  /** Copias ya sacadas; si es mayor que 0 el ticket dice COPIA. */
  reimpresiones: number;
  placa?: string | null;
}

export type ReciboGuardado =
  | (ReciboBase & { tipo: "ingreso"; contenido: ContenidoIngreso })
  | (ReciboBase & { tipo: "pago"; contenido: ContenidoPago })
  | (ReciboBase & { tipo: "mensualidad"; contenido: ContenidoMensualidad })
  | (ReciboBase & { tipo: "cierre_caja"; contenido: ContenidoCierre });

// ------------------------------------------------------------------ configuración de la impresora

export interface EncabezadoParqueadero {
  nombre: string;
  nit: string;
  /** Varias líneas (una por renglón), ej. "LUNES A VIERNES 6 AM A 8 PM". */
  horario: string;
  direccion: string;
  telefono: string;
  /** Resolución de numeración DIAN (opcional, varias líneas). */
  resolucionDian: string;
}

export interface PrinterConfig {
  modo: ModoImpresion;
  /** Nombre de la impresora instalada en Windows (cola de impresión), ej. "STAR-TP80NC-M". */
  impresora: string;
  /** Clave de CharacterSet de node-thermal-printer, ej. "PC858_EURO". */
  characterSet: string;
  abrirCajon: boolean;
  encabezado: EncabezadoParqueadero;
  piePagina: string;
}

/**
 * Destino físico (o simulado) de un buffer ESC/POS.
 * El ticketBuilder no sabe nada de esto: un futuro EscPosRedProvider (TCP 9100)
 * solo necesita implementar esta interfaz.
 */
export interface PrinterProvider {
  imprimir(buffer: Buffer): Promise<void>;
}

export type Resultado = { ok: true } | { ok: false; error: string };
