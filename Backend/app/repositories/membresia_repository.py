"""Acceso a datos de mensualidades. Solo consultas; sin reglas de negocio.

Una "mensualidad" es la cadena de periodos pagados de un vehículo: cada renovación inserta una
fila en `membresias`. La fila con mayor `fecha_fin` (entre las no canceladas) es la actual.
"""
import uuid
from dataclasses import dataclass
from datetime import date
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.catalogos import TipoVehiculo
from app.models.clientes import Cliente, Membresia, Vehiculo
from app.models.operaciones import Pago, Recibo


@dataclass(frozen=True)
class FilaMensualidad:
    membresia: Membresia  # periodo actual (el de mayor fecha_fin)
    placa: str
    tipo_vehiculo: str
    cliente: Cliente


@dataclass(frozen=True)
class FilaPeriodo:
    membresia: Membresia
    medio_pago: str | None
    recibo_numero: int | None


# ------------------------------------------------------------------ lectura para Operaciones
def buscar_vigente_por_placa(db: Session, placa: str, hoy: date) -> Membresia | None:
    """Mensualidad activa y vigente hoy, por placa principal o alterna."""
    return db.scalar(
        select(Membresia)
        .join(Vehiculo, Vehiculo.id == Membresia.vehiculo_id)
        .where(
            or_(Vehiculo.placa == placa, Membresia.placa_alterna == placa),
            Membresia.estado == "activa",
            Membresia.fecha_inicio <= hoy,
            Membresia.fecha_fin >= hoy,
        )
        .order_by(Membresia.fecha_fin.desc())
        .limit(1)
    )


def buscar_ultima_por_placa(db: Session, placa: str) -> Membresia | None:
    """Última mensualidad activa (no cancelada) de la placa, vigente o no. Sirve para avisar de vencidas."""
    return db.scalar(
        select(Membresia)
        .join(Vehiculo, Vehiculo.id == Membresia.vehiculo_id)
        .where(or_(Vehiculo.placa == placa, Membresia.placa_alterna == placa), Membresia.estado == "activa")
        .order_by(Membresia.fecha_fin.desc())
        .limit(1)
    )


def placa_principal(db: Session, membresia: Membresia) -> str:
    return db.scalar(select(Vehiculo.placa).where(Vehiculo.id == membresia.vehiculo_id))  # type: ignore[return-value]


def nombre_cliente(db: Session, membresia: Membresia) -> str | None:
    c = db.get(Cliente, membresia.cliente_id)
    return None if c is None else nombre_completo(c)


def nombre_completo(c: Cliente) -> str:
    return f"{c.nombres} {c.apellidos}".strip() if c.apellidos else c.nombres


# ------------------------------------------------------------------ consulta
def listar_mensualidades(db: Session, q: str | None = None) -> list[FilaMensualidad]:
    """Una fila por vehículo con mensualidad: su periodo actual. Más próximas a vencer primero."""
    consulta = (
        select(Membresia, Vehiculo.placa, func.lower(TipoVehiculo.nombre), Cliente)
        .join(Vehiculo, Vehiculo.id == Membresia.vehiculo_id)
        .join(TipoVehiculo, TipoVehiculo.id == Vehiculo.tipo_vehiculo_id)
        .join(Cliente, Cliente.id == Membresia.cliente_id)
        .where(Membresia.estado == "activa")
        .distinct(Membresia.vehiculo_id)
        .order_by(Membresia.vehiculo_id, Membresia.fecha_fin.desc())
    )
    if q:
        like = f"%{q}%"
        consulta = consulta.where(
            or_(
                Vehiculo.placa.ilike(like),
                Membresia.placa_alterna.ilike(like),
                Membresia.tarjeta_codigo.ilike(like),
                Cliente.nombres.ilike(like),
                Cliente.apellidos.ilike(like),
                Cliente.telefono.ilike(like),
            )
        )
    filas = [FilaMensualidad(m, p, t, c) for m, p, t, c in db.execute(consulta)]
    return sorted(filas, key=lambda f: (f.membresia.fecha_fin, f.placa))


def obtener(db: Session, membresia_id: uuid.UUID) -> Membresia | None:
    return db.get(Membresia, membresia_id)


def obtener_fila(db: Session, vehiculo_id: uuid.UUID) -> FilaMensualidad | None:
    """Periodo actual de un vehículo, con su placa, tipo y cliente."""
    ultima = ultima_activa_del_vehiculo(db, vehiculo_id)
    if ultima is None:
        return None
    placa, tipo = db.execute(
        select(Vehiculo.placa, func.lower(TipoVehiculo.nombre))
        .join(TipoVehiculo, TipoVehiculo.id == Vehiculo.tipo_vehiculo_id)
        .where(Vehiculo.id == vehiculo_id)
    ).one()
    return FilaMensualidad(ultima, placa, tipo, db.get(Cliente, ultima.cliente_id))  # type: ignore[arg-type]


def ultima_activa_del_vehiculo(db: Session, vehiculo_id: uuid.UUID) -> Membresia | None:
    return db.scalar(
        select(Membresia)
        .where(Membresia.vehiculo_id == vehiculo_id, Membresia.estado == "activa")
        .order_by(Membresia.fecha_fin.desc())
        .limit(1)
    )


def periodos_a_editar(db: Session, vehiculo_id: uuid.UUID, hoy: date) -> list[Membresia]:
    """Periodos que una edición debe actualizar: los vigentes y los pagados por adelantado.
    Si ya todos vencieron, solo el último."""
    vivos = list(
        db.scalars(
            select(Membresia).where(
                Membresia.vehiculo_id == vehiculo_id, Membresia.estado == "activa", Membresia.fecha_fin >= hoy
            )
        )
    )
    if vivos:
        return vivos
    ultima = ultima_activa_del_vehiculo(db, vehiculo_id)
    return [] if ultima is None else [ultima]


def historial(db: Session, vehiculo_id: uuid.UUID) -> list[FilaPeriodo]:
    """Todos los periodos del vehículo (más reciente primero) con su pago y número de recibo."""
    consulta = (
        select(Membresia, Pago.metodo, Recibo.numero)
        .outerjoin(Pago, Pago.membresia_id == Membresia.id)
        .outerjoin(Recibo, (Recibo.membresia_id == Membresia.id) & (Recibo.tipo == "mensualidad"))
        .where(Membresia.vehiculo_id == vehiculo_id)
        .order_by(Membresia.fecha_fin.desc())
    )
    return [FilaPeriodo(m, metodo, numero) for m, metodo, numero in db.execute(consulta)]


# ------------------------------------------------------------------ conflictos
def bloquear_vehiculo(db: Session, vehiculo_id: uuid.UUID) -> Vehiculo | None:
    """Toma FOR UPDATE sobre el vehículo: serializa renovaciones y ediciones de una misma mensualidad."""
    return db.scalar(select(Vehiculo).where(Vehiculo.id == vehiculo_id).with_for_update())


def vehiculo_tiene_mensualidad(db: Session, vehiculo_id: uuid.UUID) -> bool:
    return ultima_activa_del_vehiculo(db, vehiculo_id) is not None


def placas_en_uso(db: Session, placas: list[str], hoy: date, excluir_vehiculo_id: uuid.UUID | None) -> list[str]:
    """Placas de la lista que ya pertenecen (como principal o alterna) a OTRA mensualidad vigente o futura."""
    consulta = (
        select(Vehiculo.placa, Membresia.placa_alterna)
        .join(Vehiculo, Vehiculo.id == Membresia.vehiculo_id)
        .where(
            Membresia.estado == "activa",
            Membresia.fecha_fin >= hoy,
            or_(Vehiculo.placa.in_(placas), Membresia.placa_alterna.in_(placas)),
        )
    )
    if excluir_vehiculo_id is not None:
        consulta = consulta.where(Membresia.vehiculo_id != excluir_vehiculo_id)
    ocupadas: set[str] = set()
    for principal, alterna in db.execute(consulta):
        ocupadas.update(p for p in (principal, alterna) if p in placas)
    return sorted(ocupadas)


def tarjeta_en_uso(db: Session, tarjeta: str, hoy: date, excluir_vehiculo_id: uuid.UUID | None) -> bool:
    consulta = select(Membresia.id).where(
        Membresia.estado == "activa", Membresia.fecha_fin >= hoy, Membresia.tarjeta_codigo == tarjeta
    )
    if excluir_vehiculo_id is not None:
        consulta = consulta.where(Membresia.vehiculo_id != excluir_vehiculo_id)
    return db.scalar(consulta.limit(1)) is not None


# ------------------------------------------------------------------ escritura (sin commit)
def crear_cliente(db: Session, nombre: str, celular: str | None) -> Cliente:
    c = Cliente(tipo="mensual", nombres=nombre, telefono=celular)
    db.add(c)
    db.flush()
    return c


def crear(db: Session, **valores: Any) -> Membresia:
    m = Membresia(**valores)
    db.add(m)
    db.flush()
    db.refresh(m)
    return m
