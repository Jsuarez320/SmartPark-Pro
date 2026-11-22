"""Acceso a datos de recibos. Solo consultas; sin reglas de negocio."""
import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.operaciones import Recibo, ReciboReimpresion
from app.models.usuario import Usuario


def crear(
    db: Session,
    *,
    tipo: str,
    operador_id: uuid.UUID,
    contenido: dict,
    ingreso_id: uuid.UUID | None = None,
    salida_id: uuid.UUID | None = None,
    membresia_id: uuid.UUID | None = None,
    turno_id: uuid.UUID | None = None,
    placa: str | None = None,
) -> Recibo:
    """Inserta un recibo (el consecutivo `numero` lo asigna la BD). No hace commit."""
    recibo = Recibo(
        tipo=tipo,
        operador_id=operador_id,
        contenido=contenido,
        ingreso_id=ingreso_id,
        salida_id=salida_id,
        membresia_id=membresia_id,
        turno_id=turno_id,
        placa=placa,
    )
    db.add(recibo)
    db.flush()
    db.refresh(recibo)
    return recibo


def obtener_de_turno(db: Session, turno_id: uuid.UUID) -> Recibo | None:
    return db.scalar(select(Recibo).where(Recibo.turno_id == turno_id, Recibo.tipo == "cierre_caja"))


def obtener_de_ingreso(db: Session, ingreso_id: uuid.UUID) -> Recibo | None:
    return db.scalar(select(Recibo).where(Recibo.ingreso_id == ingreso_id, Recibo.tipo == "ingreso"))


def obtener_de_salida(db: Session, salida_id: uuid.UUID) -> Recibo | None:
    return db.scalar(select(Recibo).where(Recibo.salida_id == salida_id, Recibo.tipo == "pago"))


# ------------------------------------------------------------------ búsqueda y reimpresión
def obtener(db: Session, recibo_id: uuid.UUID, *, bloquear: bool = False) -> Recibo | None:
    consulta = select(Recibo).where(Recibo.id == recibo_id)
    if bloquear:
        consulta = consulta.with_for_update()
    return db.scalar(consulta)


def buscar(
    db: Session,
    *,
    numero: int | None = None,
    placa: str | None = None,
    tipo: str | None = None,
    desde: datetime | None = None,
    hasta: datetime | None = None,
    ingreso_id: uuid.UUID | None = None,
    salida_id: uuid.UUID | None = None,
    membresia_id: uuid.UUID | None = None,
    turno_id: uuid.UUID | None = None,
    limite: int = 50,
    offset: int = 0,
) -> list[Recibo]:
    """Recibos más recientes primero. `desde` incluido, `hasta` excluido. `placa` busca por coincidencia parcial."""
    consulta = select(Recibo)
    if numero is not None:
        consulta = consulta.where(Recibo.numero == numero)
    if placa:
        consulta = consulta.where(Recibo.placa.ilike(f"%{placa}%"))
    if tipo:
        consulta = consulta.where(Recibo.tipo == tipo)
    if desde is not None:
        consulta = consulta.where(Recibo.created_at >= desde)
    if hasta is not None:
        consulta = consulta.where(Recibo.created_at < hasta)
    for columna, valor in (
        (Recibo.ingreso_id, ingreso_id),
        (Recibo.salida_id, salida_id),
        (Recibo.membresia_id, membresia_id),
        (Recibo.turno_id, turno_id),
    ):
        if valor is not None:
            consulta = consulta.where(columna == valor)
    return list(db.scalars(consulta.order_by(Recibo.created_at.desc(), Recibo.numero.desc()).limit(limite).offset(offset)))


def registrar_reimpresion(db: Session, recibo: Recibo, usuario_id: uuid.UUID) -> None:
    """Cuenta la copia y deja el rastro de quién la sacó. Sin commit. El `recibo` debe estar bloqueado
    (obtener(..., bloquear=True)) para que el contador no se pise entre reimpresiones simultáneas."""
    db.add(ReciboReimpresion(recibo_id=recibo.id, usuario_id=usuario_id))
    recibo.reimpresiones = recibo.reimpresiones + 1
    recibo.ultima_reimpresion = func.now()
    db.flush()
    db.refresh(recibo)


def listar_reimpresiones(db: Session, recibo_id: uuid.UUID) -> list[tuple[str, datetime]]:
    filas = db.execute(
        select(Usuario.nombre + " " + Usuario.apellido, ReciboReimpresion.created_at)
        .join(Usuario, Usuario.id == ReciboReimpresion.usuario_id)
        .where(ReciboReimpresion.recibo_id == recibo_id)
        .order_by(ReciboReimpresion.created_at.desc())
    )
    return [(nombre, fecha) for nombre, fecha in filas]
