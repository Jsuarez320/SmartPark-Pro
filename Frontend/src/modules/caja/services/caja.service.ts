import { api } from "@/shared/api/api";
import type { ReciboApi } from "@/shared/types/recibo";
import type {
  AbrirCajaDatos,
  CerrarCajaDatos,
  DesgloseIngresos,
  PeriodoFiltro,
  ResumenTurno,
  Transaccion,
} from "../caja.types";

/** Caja abierta con su resumen en vivo, o null si no hay ninguna. */
export async function obtenerTurnoActual(): Promise<ResumenTurno | null> {
  const { data } = await api.get<ResumenTurno | null>("/caja/turno");
  return data;
}

export async function abrirTurno(datos: AbrirCajaDatos): Promise<ResumenTurno> {
  const { data } = await api.post<ResumenTurno>("/caja/turno/abrir", datos);
  return data;
}

/** Cierra la caja y devuelve el resumen del día (el backend lo guarda también como recibo de cierre). */
export async function cerrarTurno(datos: CerrarCajaDatos): Promise<ResumenTurno> {
  const { data } = await api.post<ResumenTurno>("/caja/turno/cerrar", datos);
  return data;
}

export async function obtenerDetalleTurno(turnoId: string): Promise<ResumenTurno> {
  const { data } = await api.get<ResumenTurno>(`/caja/turnos/${turnoId}`);
  return data;
}

/** Historial de turnos (administrador). */
export async function obtenerHistorial(limit = 20): Promise<ResumenTurno[]> {
  const { data } = await api.get<ResumenTurno[]>("/caja/turnos", { params: { limit } });
  return data;
}

export async function obtenerIngresos(periodo: PeriodoFiltro): Promise<DesgloseIngresos> {
  const { data } = await api.get<DesgloseIngresos>("/caja/ingresos", { params: { periodo } });
  return data;
}

export async function obtenerTransacciones(periodo: PeriodoFiltro): Promise<Transaccion[]> {
  const { data } = await api.get<Transaccion[]>("/caja/transacciones", { params: { periodo } });
  return data;
}

/**
 * Recibo del cierre listo para imprimir, armado con la respuesta del cierre (es el mismo resumen que
 * el backend guardó como snapshot). Null si el turno aún no tiene recibo (sigue abierto).
 */
export function reciboDeCierre(r: ResumenTurno): ReciboApi | null {
  if (!r.reciboId || r.reciboNumero == null) return null;
  return {
    id: r.reciboId,
    numero: r.reciboNumero,
    tipo: "cierre_caja",
    placa: null,
    creadoEn: r.fechaCierre ?? new Date().toISOString(),
    reimpresiones: 0,
    contenido: {
      turnoId: r.turnoId,
      abiertoPor: r.abiertoPor,
      cerradoPor: r.cerradoPor,
      fechaApertura: r.fechaApertura,
      fechaCierre: r.fechaCierre,
      horasTurno: r.horasTurno,
      baseEfectivo: r.baseEfectivo,
      baseTransferencia: r.baseTransferencia,
      efectivo: r.efectivo,
      transferencia: r.transferencia,
      totalRecaudado: r.totalRecaudado,
      movimientosEfectivo: r.movimientosEfectivo,
      movimientosTransferencia: r.movimientosTransferencia,
      totalTransacciones: r.totalTransacciones,
      esperadoEfectivo: r.esperadoEfectivo,
      esperadoTransferencia: r.esperadoTransferencia,
      efectivoContado: r.efectivoContado,
      diferenciaEfectivo: r.diferenciaEfectivo,
      notas: r.notas,
      movimientos: r.movimientos ?? [],
    },
  };
}
