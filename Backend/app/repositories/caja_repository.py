"""Acceso a datos de caja (turnos y movimientos). Solo consultas; sin reglas de negocio."""
import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models.caja import CajaTransaccion, TurnoCaja
from app.models.clientes import Membresia, Vehiculo
from app.models.operaciones import Ingreso, Pago, Salida
from app.models.usuario import Usuario


@dataclass(frozen=True)
class TotalesTurno:
    efectivo: Decimal = Decimal(0)
    transferencia: Decimal = Decimal(0)
    movimientos_efectivo: int = 0
    movimientos_transferencia: int = 0


@dataclass(frozen=True)
class FilaTurno:
    turno: TurnoCaja
    abierto_por: str
    cerrado_por: str | None


@dataclass(frozen=True)
class FilaMovimiento:
    movimiento: CajaTransaccion
    placa: str | None
    es_mensualidad: bool


# ------------------------------------------------------------------ turnos
def obtener_turno_abierto(db: Session, bloqueo: Literal["update", "share"] | None = None) -> TurnoCaja | None:
    consulta = select(TurnoCaja).where(TurnoCaja.estado == "abierta")
    if bloqueo == "update":
        consulta = consulta.with_for_update()
    elif bloqueo == "share":
        consulta = consulta.with_for_update(read=True)
    return db.scalar(consulta)


def obtener_turno(db: Session, turno_id: uuid.UUID) -> TurnoCaja | None:
    return db.get(TurnoCaja, turno_id)


def crear_turno(db: Session, usuario_id: uuid.UUID, base_efectivo: int, base_transferencia: int) -> TurnoCaja:
    turno = TurnoCaja(
        usuario_id=usuario_id, base_efectivo=base_efectivo, base_transferencia=base_transferencia
    )
    db.add(turno)
    db.flush()
    db.refresh(turno)
    return turno


def cerrar_turno(
    db: Session, turno: TurnoCaja, cerrado_por: uuid.UUID, efectivo_contado: int, notas: str | None
) -> None:
    """Marca el turno como cerrado con la hora del servidor. No hace commit."""
    turno.estado = "cerrada"
    turno.fecha_cierre = func.now()
    turno.cerrado_por = cerrado_por
    turno.monto_cierre = efectivo_contado
    turno.notas = notas
    db.flush()
    db.refresh(turno)


def _nombre(u) -> Any:
    return u.nombre + " " + u.apellido


def listar_turnos(db: Session, limite: int, turno_id: uuid.UUID | None = None) -> list[FilaTurno]:
    """Turnos con el nombre de quien abrió y de quien cerró (más recientes primero)."""
    cerrador = aliased(Usuario)
    consulta = (
        select(TurnoCaja, _nombre(Usuario), _nombre(cerrador))
        .join(Usuario, Usuario.id == TurnoCaja.usuario_id)
        .outerjoin(cerrador, cerrador.id == TurnoCaja.cerrado_por)
        .order_by(TurnoCaja.fecha_apertura.desc())
        .limit(limite)
    )
    if turno_id is not None:
        consulta = consulta.where(TurnoCaja.id == turno_id)
    return [FilaTurno(t, ab, ce) for t, ab, ce in db.execute(consulta)]


def totales_por_turno(db: Session, turno_ids: list[uuid.UUID]) -> dict[uuid.UUID, TotalesTurno]:
    """Cobrado por medio de pago (solo movimientos de tipo ingreso)."""
    if not turno_ids:
        return {}
    c = CajaTransaccion
    filas = db.execute(
        select(c.turno_id, c.metodo, func.coalesce(func.sum(c.monto), 0), func.count(c.id))
        .where(c.turno_id.in_(turno_ids), c.tipo == "ingreso")
        .group_by(c.turno_id, c.metodo)
    )
    acumulado: dict[uuid.UUID, dict[str, tuple[Decimal, int]]] = {}
    for turno_id, metodo, suma, cuenta in filas:
        acumulado.setdefault(turno_id, {})[metodo] = (suma, cuenta)
    resultado: dict[uuid.UUID, TotalesTurno] = {}
    for tid in turno_ids:
        por_medio = acumulado.get(tid, {})
        ef, tr = por_medio.get("efectivo", (Decimal(0), 0)), por_medio.get("transferencia", (Decimal(0), 0))
        resultado[tid] = TotalesTurno(ef[0], tr[0], ef[1], tr[1])
    return resultado


# ------------------------------------------------------------------ movimientos
def listar_movimientos(db: Session, turno_id: uuid.UUID) -> list[FilaMovimiento]:
    """Movimientos de ingreso del turno con la placa del vehículo (por salida o por mensualidad)."""
    c = CajaTransaccion
    consulta = (
        select(c, Vehiculo.placa, Pago.membresia_id.is_not(None))
        .join(Pago, Pago.id == c.pago_id)
        .outerjoin(Salida, Salida.id == Pago.salida_id)
        .outerjoin(Ingreso, Ingreso.id == Salida.ingreso_id)
        .outerjoin(Membresia, Membresia.id == Pago.membresia_id)
        .outerjoin(Vehiculo, Vehiculo.id == func.coalesce(Ingreso.vehiculo_id, Membresia.vehiculo_id))
        .where(c.turno_id == turno_id, c.tipo == "ingreso")
        .order_by(c.created_at)
    )
    return [FilaMovimiento(m, placa, es_mens) for m, placa, es_mens in db.execute(consulta)]


def crear_movimiento(
    db: Session, turno_id: uuid.UUID, pago_id: uuid.UUID, concepto: str, metodo: str, monto: int | Decimal
) -> CajaTransaccion:
    mov = CajaTransaccion(
        turno_id=turno_id, pago_id=pago_id, tipo="ingreso", concepto=concepto, metodo=metodo, monto=monto
    )
    db.add(mov)
    db.flush()
    return mov


# ------------------------------------------------------------------ reportes por periodo
@dataclass(frozen=True)
class FilaPeriodo:
    id: uuid.UUID
    monto: Decimal
    metodo: str
    concepto: str
    fecha: Any
    placa: str
    tipo_vehiculo: str
    es_mensualidad: bool


def movimientos_periodo(db: Session, unidad: str | None, limite: int | None = None) -> list[FilaPeriodo]:
    """Cobros desde el inicio del día/semana/mes/año (hora de Colombia), los más recientes primero.
    `unidad` es de date_trunc: day | week | month | year; None = sin filtro de fecha."""
    from app.models.catalogos import TipoVehiculo  # import local: evita ciclos entre modelos

    c = CajaTransaccion
    consulta = (
        select(c.id, c.monto, c.metodo, c.concepto, c.created_at, Vehiculo.placa, func.lower(TipoVehiculo.nombre), Pago.membresia_id.is_not(None))
        .join(Pago, Pago.id == c.pago_id)
        .outerjoin(Salida, Salida.id == Pago.salida_id)
        .outerjoin(Ingreso, Ingreso.id == Salida.ingreso_id)
        .outerjoin(Membresia, Membresia.id == Pago.membresia_id)
        .join(Vehiculo, Vehiculo.id == func.coalesce(Ingreso.vehiculo_id, Membresia.vehiculo_id))
        .join(TipoVehiculo, TipoVehiculo.id == Vehiculo.tipo_vehiculo_id)
        .where(c.tipo == "ingreso")
        .order_by(c.created_at.desc())
    )
    if unidad is not None:
        consulta = consulta.where(c.created_at >= func.date_trunc(unidad, func.now()))
    if limite is not None:
        consulta = consulta.limit(limite)
    return [FilaPeriodo(*fila) for fila in db.execute(consulta)]
