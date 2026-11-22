"""Caja: apertura con bases, movimientos por medio de pago y cierre con resumen.

Reglas (aprobadas en la auditoría):
* Una sola caja abierta a la vez (también garantizado por el índice único parcial uq_turno_abierto).
* No se cobra sin caja abierta: `registrar_cobro` falla con 409.
* Cada cobro (por horas o mensualidad/renovación) genera UN movimiento de ingreso con su medio de pago.
* El cierre calcula, por medio de pago, lo cobrado y lo esperado (base + cobrado) y guarda un
  recibo `cierre_caja` con el resumen completo, para imprimirlo y reimprimirlo sin recalcular.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.dinero import entero
from app.core.errors import NegocioError, traducir_errores
from app.models.caja import CajaTransaccion, TurnoCaja
from app.repositories import caja_repository as repo
from app.repositories import recibo_repository
from app.repositories.caja_repository import FilaMovimiento, FilaPeriodo, TotalesTurno
from app.schemas.caja import (
    AbrirTurnoRequest,
    CerrarTurnoRequest,
    Desglose,
    Movimiento,
    PorConcepto,
    ResumenTurno,
    Transaccion,
)

_UNIDADES = {"Día": "day", "Semana": "week", "Mes": "month", "Año": "year"}

CONCEPTO_HORAS = "Cobro por horas"
CONCEPTO_MENSUALIDAD = "Mensualidad"


# ------------------------------------------------------------------ cobros (lo usan operaciones y mensualidades)
def exigir_turno_abierto(db: Session, *, bloqueo: str | None = None) -> TurnoCaja:
    turno = repo.obtener_turno_abierto(db, bloqueo)  # type: ignore[arg-type]
    if turno is None:
        raise NegocioError(409, "No hay una caja abierta. Abre la caja primero.")
    return turno


def registrar_cobro(
    db: Session, *, pago_id: uuid.UUID, metodo: str, monto: int | Decimal, concepto: str
) -> CajaTransaccion:
    """Suma un cobro a la caja abierta, separado por medio. No hace commit: va en la misma
    transacción que el pago. El bloqueo FOR SHARE hace que un cierre concurrente espere a este cobro."""
    turno = exigir_turno_abierto(db, bloqueo="share")
    return repo.crear_movimiento(db, turno.id, pago_id, concepto, metodo, monto)


# ------------------------------------------------------------------ resumen
def _movimiento(f: FilaMovimiento) -> Movimiento:
    m = f.movimiento
    return Movimiento(
        id=str(m.id),
        fecha=m.created_at,
        operacion="mensualidad" if f.es_mensualidad else "horas",
        concepto=m.concepto,
        placa=f.placa,
        medio=m.metodo,  # type: ignore[arg-type]
        monto=entero(m.monto),
    )


def construir_resumen(
    turno: TurnoCaja,
    abierto_por: str,
    cerrado_por: str | None,
    totales: TotalesTurno,
    movimientos: list[FilaMovimiento] | None,
    ahora: datetime,
    recibo_id: uuid.UUID | None = None,
    recibo_numero: int | None = None,
) -> ResumenTurno:
    """Arma el resumen. Esperado por medio = base inicial + cobrado en ese medio."""
    base_ef, base_tr = entero(turno.base_efectivo), entero(turno.base_transferencia)
    efectivo, transferencia = entero(totales.efectivo), entero(totales.transferencia)
    esperado_ef = base_ef + efectivo
    contado = None if turno.monto_cierre is None else entero(turno.monto_cierre)
    fin = turno.fecha_cierre or ahora
    horas = round((fin - turno.fecha_apertura).total_seconds() / 3600, 1)

    return ResumenTurno(
        turno_id=str(turno.id),
        estado=turno.estado,  # type: ignore[arg-type]
        abierto_por=abierto_por,
        cerrado_por=cerrado_por,
        fecha_apertura=turno.fecha_apertura,
        fecha_cierre=turno.fecha_cierre,
        horas_turno=horas,
        base_efectivo=base_ef,
        base_transferencia=base_tr,
        efectivo=efectivo,
        transferencia=transferencia,
        total_recaudado=efectivo + transferencia,
        movimientos_efectivo=totales.movimientos_efectivo,
        movimientos_transferencia=totales.movimientos_transferencia,
        total_transacciones=totales.movimientos_efectivo + totales.movimientos_transferencia,
        esperado_efectivo=esperado_ef,
        esperado_transferencia=base_tr + transferencia,
        efectivo_contado=contado,
        diferencia_efectivo=None if contado is None else contado - esperado_ef,
        notas=turno.notas,
        recibo_id=None if recibo_id is None else str(recibo_id),
        recibo_numero=recibo_numero,
        movimientos=None if movimientos is None else [_movimiento(f) for f in movimientos],
    )


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


def _resumen_de(db: Session, turno_id: uuid.UUID, *, con_detalle: bool) -> ResumenTurno:
    fila = repo.listar_turnos(db, 1, turno_id)[0]
    totales = repo.totales_por_turno(db, [turno_id])[turno_id]
    movimientos = repo.listar_movimientos(db, turno_id) if con_detalle else None
    recibo = recibo_repository.obtener_de_turno(db, turno_id) if fila.turno.estado == "cerrada" else None
    return construir_resumen(
        fila.turno, fila.abierto_por, fila.cerrado_por, totales, movimientos, _ahora(),
        recibo.id if recibo else None, recibo.numero if recibo else None,
    )


# ------------------------------------------------------------------ turnos
def turno_actual(db: Session) -> ResumenTurno | None:
    turno = repo.obtener_turno_abierto(db)
    return None if turno is None else _resumen_de(db, turno.id, con_detalle=True)


def abrir_turno(db: Session, data: AbrirTurnoRequest, usuario_id: uuid.UUID) -> ResumenTurno:
    with traducir_errores(db):
        if repo.obtener_turno_abierto(db) is not None:
            raise NegocioError(409, "Ya hay una caja abierta. Ciérrala antes de abrir otra.")
        turno = repo.crear_turno(db, usuario_id, data.base_efectivo, data.base_transferencia)
        db.commit()
    return _resumen_de(db, turno.id, con_detalle=True)


def cerrar_turno(db: Session, data: CerrarTurnoRequest, usuario_id: uuid.UUID) -> ResumenTurno:
    """Cierra la caja abierta y guarda el recibo del cierre (snapshot del resumen)."""
    with traducir_errores(db):
        turno = repo.obtener_turno_abierto(db, "update")
        if turno is None:
            raise NegocioError(409, "No hay una caja abierta")
        turno_id = turno.id
        repo.cerrar_turno(db, turno, usuario_id, data.efectivo_contado, data.notas)

        # Se calcula DESPUÉS de tomar el bloqueo: incluye cualquier cobro que estuviera en vuelo.
        fila = repo.listar_turnos(db, 1, turno_id)[0]
        totales = repo.totales_por_turno(db, [turno_id])[turno_id]
        movimientos = repo.listar_movimientos(db, turno_id)
        resumen = construir_resumen(
            fila.turno, fila.abierto_por, fila.cerrado_por, totales, movimientos, _ahora()
        )
        recibo = recibo_repository.crear(
            db,
            tipo="cierre_caja",
            operador_id=usuario_id,
            turno_id=turno_id,
            contenido=resumen.model_dump(mode="json", by_alias=True),
        )
        db.commit()
    return resumen.model_copy(update={"recibo_id": str(recibo.id), "recibo_numero": recibo.numero})


def obtener_turno(db: Session, turno_id: uuid.UUID) -> ResumenTurno:
    if repo.obtener_turno(db, turno_id) is None:
        raise NegocioError(404, "El turno no existe")
    return _resumen_de(db, turno_id, con_detalle=True)


def historial_turnos(db: Session, limite: int) -> list[ResumenTurno]:
    """Turnos cerrados y abierto, del más reciente al más antiguo (sin detalle de movimientos)."""
    filas = repo.listar_turnos(db, limite)
    totales = repo.totales_por_turno(db, [f.turno.id for f in filas])
    ahora = _ahora()
    return [
        construir_resumen(f.turno, f.abierto_por, f.cerrado_por, totales[f.turno.id], None, ahora)
        for f in filas
    ]


# ------------------------------------------------------------------ reportes por periodo (admin)
def _unidad(periodo: str) -> str:
    unidad = _UNIDADES.get(periodo)
    if unidad is None:
        raise NegocioError(422, "Periodo inválido")
    return unidad


def _transaccion(f: FilaPeriodo) -> Transaccion:
    return Transaccion(
        id=str(f.id), placa=f.placa, tipo=f.tipo_vehiculo, concepto=f.concepto,
        monto=entero(f.monto), metodo_pago=f.metodo, fecha=f.fecha,
    )


def ingresos_periodo(db: Session, periodo: str) -> Desglose:
    """Cobrado en el periodo: total, por tipo de vehículo y por concepto (horas / mensualidades)."""
    filas = repo.movimientos_periodo(db, _unidad(periodo))
    total = sum(entero(f.monto) for f in filas)
    por_tipo = lambda tipo: sum(entero(f.monto) for f in filas if f.tipo_vehiculo == tipo)  # noqa: E731
    return Desglose(
        total=total,
        por_carros=por_tipo("carro"),
        por_motos=por_tipo("moto"),
        por_concepto=PorConcepto(
            tiempo=sum(entero(f.monto) for f in filas if not f.es_mensualidad),
            membresia=sum(entero(f.monto) for f in filas if f.es_mensualidad),
        ),
        transacciones=len(filas),
    )


def transacciones_periodo(db: Session, periodo: str, limite: int) -> list[Transaccion]:
    return [_transaccion(f) for f in repo.movimientos_periodo(db, _unidad(periodo), limite)]


def movimientos_recientes(db: Session, limite: int) -> list[Transaccion]:
    """Últimos cobros, de cualquier día (panel de control)."""
    return [_transaccion(f) for f in repo.movimientos_periodo(db, None, limite)]
