"""Acceso a datos de tarifas, parámetros de cobro y festivos. Solo consultas; sin reglas de negocio."""
from datetime import date, datetime
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.catalogos import Configuracion, Festivo, TarifaVersion, TipoVehiculo


# ------------------------------------------------------------------ tipos de vehículo
def obtener_tipo_vehiculo(db: Session, nombre: str) -> TipoVehiculo | None:
    return db.scalar(select(TipoVehiculo).where(func.lower(TipoVehiculo.nombre) == nombre.lower()))


def listar_tipos_vehiculo(db: Session) -> list[TipoVehiculo]:
    return list(db.scalars(select(TipoVehiculo).order_by(TipoVehiculo.id)))


# ------------------------------------------------------------------ versiones de tarifa
def version_vigente(
    db: Session, tipo_vehiculo_id: int, momento: datetime | None = None, *, bloquear: bool = False
) -> TarifaVersion | None:
    """Versión en vigor en `momento` (por defecto, ahora). `bloquear` toma FOR UPDATE sobre la fila."""
    cuando = momento if momento is not None else func.now()
    consulta = select(TarifaVersion).where(
        TarifaVersion.tipo_vehiculo_id == tipo_vehiculo_id,
        TarifaVersion.vigente_desde <= cuando,
        (TarifaVersion.vigente_hasta.is_(None)) | (TarifaVersion.vigente_hasta > cuando),
    )
    if bloquear:
        consulta = consulta.with_for_update()
    return db.scalar(consulta)


def listar_versiones_vigentes(db: Session) -> list[TarifaVersion]:
    return list(
        db.scalars(
            select(TarifaVersion)
            .where(TarifaVersion.vigente_hasta.is_(None))
            .order_by(TarifaVersion.tipo_vehiculo_id)
        )
    )


def listar_historial(db: Session, tipo_vehiculo_id: int, limite: int) -> list[TarifaVersion]:
    return list(
        db.scalars(
            select(TarifaVersion)
            .where(TarifaVersion.tipo_vehiculo_id == tipo_vehiculo_id)
            .order_by(TarifaVersion.vigente_desde.desc())
            .limit(limite)
        )
    )


def cerrar_version(db: Session, version: TarifaVersion) -> None:
    """Cierra la vigencia con la hora del servidor. No hace commit."""
    version.vigente_hasta = func.now()
    db.flush()


def crear_version(db: Session, **valores: Any) -> TarifaVersion:
    """Inserta una versión nueva (vigente desde ahora, hora del servidor). No hace commit."""
    version = TarifaVersion(**valores)
    db.add(version)
    db.flush()
    db.refresh(version)
    return version


# ------------------------------------------------------------------ parámetros (configuracion)
def obtener_configuracion(db: Session) -> dict[str, Any]:
    return {c.clave: c.valor for c in db.scalars(select(Configuracion))}


def guardar_configuracion(db: Session, clave: str, valor: Any, usuario_id) -> None:
    fila = db.get(Configuracion, clave)
    if fila is None:
        db.add(Configuracion(clave=clave, valor=valor, actualizado_por=usuario_id))
    else:
        fila.valor = valor
        fila.actualizado_por = usuario_id
        fila.updated_at = func.now()


# ------------------------------------------------------------------ festivos
def listar_festivos(db: Session, desde: date, hasta: date) -> list[Festivo]:
    return list(
        db.scalars(
            select(Festivo).where(Festivo.fecha >= desde, Festivo.fecha <= hasta).order_by(Festivo.fecha)
        )
    )


def obtener_festivo(db: Session, fecha: date) -> Festivo | None:
    return db.get(Festivo, fecha)


def agregar_festivo(db: Session, fecha: date, nombre: str) -> Festivo:
    festivo = Festivo(fecha=fecha, nombre=nombre)
    db.add(festivo)
    db.flush()
    return festivo


def eliminar_festivo(db: Session, fecha: date) -> int:
    return db.execute(delete(Festivo).where(Festivo.fecha == fecha)).rowcount
