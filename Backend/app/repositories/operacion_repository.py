"""Acceso a datos de ingresos, salidas, pagos y vehículos. Solo consultas; sin reglas de negocio."""
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.models.clientes import Cliente, Membresia, Vehiculo
from app.models.catalogos import TipoVehiculo
from app.models.operaciones import Ingreso, Recibo, Salida
from app.models.usuario import Usuario


@dataclass(frozen=True)
class FilaPatio:
    ingreso: Ingreso
    placa: str
    tipo_vehiculo: str
    cliente: str | None
    tiquete: int | None  # número del recibo de ingreso


def ahora_del_servidor(db: Session) -> datetime:
    """Hora del servidor de BD (constante durante la transacción). Nunca la del cliente."""
    return db.scalar(select(func.now()))  # type: ignore[return-value]


def nombre_usuario(db: Session, usuario_id: uuid.UUID) -> str:
    u = db.get(Usuario, usuario_id)
    return f"{u.nombre} {u.apellido}" if u else ""


# ------------------------------------------------------------------ vehículos
def obtener_vehiculo_por_placa(db: Session, placa: str, *, bloquear: bool = False) -> Vehiculo | None:
    consulta = select(Vehiculo).where(Vehiculo.placa == placa)
    if bloquear:
        consulta = consulta.with_for_update()
    return db.scalar(consulta)


def nombre_tipo_vehiculo(db: Session, tipo_vehiculo_id: int) -> str:
    return db.scalar(select(func.lower(TipoVehiculo.nombre)).where(TipoVehiculo.id == tipo_vehiculo_id))  # type: ignore[return-value]


def crear_vehiculo(db: Session, placa: str, tipo_vehiculo_id: int) -> Vehiculo:
    v = Vehiculo(placa=placa, tipo_vehiculo_id=tipo_vehiculo_id)
    db.add(v)
    db.flush()
    return v


# ------------------------------------------------------------------ ingresos
def obtener_ingreso_activo(db: Session, vehiculo_id: uuid.UUID, *, bloquear: bool = False) -> Ingreso | None:
    consulta = select(Ingreso).where(Ingreso.vehiculo_id == vehiculo_id, Ingreso.estado == "activo")
    if bloquear:
        consulta = consulta.with_for_update()
    return db.scalar(consulta)


def placas_dentro(db: Session, placas: list[str]) -> list[str]:
    """Placas de la lista que tienen un ingreso activo."""
    return list(
        db.scalars(
            select(Vehiculo.placa)
            .join(Ingreso, Ingreso.vehiculo_id == Vehiculo.id)
            .where(Ingreso.estado == "activo", Vehiculo.placa.in_(placas))
        )
    )


def crear_ingreso(
    db: Session,
    *,
    vehiculo_id: uuid.UUID,
    operador_id: uuid.UUID,
    placa: str,
    membresia_id: uuid.UUID | None,
    tarjeta_codigo: str | None,
) -> Ingreso:
    """Inserta el ingreso con la hora del servidor (default now() de la BD). No hace commit."""
    ing = Ingreso(
        vehiculo_id=vehiculo_id,
        operador_id=operador_id,
        placa_capturada=placa,
        membresia_id=membresia_id,
        tarjeta_codigo=tarjeta_codigo,
    )
    db.add(ing)
    db.flush()
    db.refresh(ing)
    return ing


def obtener_membresia(db: Session, membresia_id: uuid.UUID) -> Membresia | None:
    return db.get(Membresia, membresia_id)


# ------------------------------------------------------------------ salidas
def crear_salida(db: Session, **valores: Any) -> Salida:
    salida = Salida(**valores)
    db.add(salida)
    db.flush()
    db.refresh(salida)
    return salida


# ------------------------------------------------------------------ patio
def listar_patio(db: Session, q: str | None) -> list[FilaPatio]:
    """Vehículos dentro del parqueadero (ingreso activo), del que lleva más tiempo al más reciente."""
    consulta = (
        select(
            Ingreso,
            Vehiculo.placa,
            func.lower(TipoVehiculo.nombre),
            Cliente.nombres,
            Cliente.apellidos,
            Recibo.numero,
        )
        .join(Vehiculo, Vehiculo.id == Ingreso.vehiculo_id)
        .join(TipoVehiculo, TipoVehiculo.id == Vehiculo.tipo_vehiculo_id)
        .outerjoin(Membresia, Membresia.id == Ingreso.membresia_id)
        .outerjoin(Cliente, Cliente.id == Membresia.cliente_id)
        .outerjoin(Recibo, (Recibo.ingreso_id == Ingreso.id) & (Recibo.tipo == "ingreso"))
        .where(Ingreso.estado == "activo")
        .order_by(Ingreso.fecha_ingreso)
    )
    if q:
        like = f"%{q}%"
        consulta = consulta.where(or_(Vehiculo.placa.ilike(like), cast(Recibo.numero, String).ilike(like)))
    filas = []
    for ing, placa, tipo, nombres, apellidos, numero in db.execute(consulta):
        cliente = None if nombres is None else (f"{nombres} {apellidos}".strip() if apellidos else nombres)
        filas.append(FilaPatio(ing, placa, tipo, cliente, numero))
    return filas

