"""Consultas del panel de control (administrador). Solo lectura; sin reglas de negocio."""
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.caja import CajaTransaccion
from app.models.catalogos import TipoVehiculo
from app.models.clientes import Vehiculo
from app.models.operaciones import Ingreso, Salida


def patio_por_tipo(db: Session) -> tuple[int, int, int]:
    """(total, carros, motos) con ingreso activo."""
    filas = db.execute(
        select(func.lower(TipoVehiculo.nombre), func.count(Ingreso.id))
        .join(Vehiculo, Vehiculo.id == Ingreso.vehiculo_id)
        .join(TipoVehiculo, TipoVehiculo.id == Vehiculo.tipo_vehiculo_id)
        .where(Ingreso.estado == "activo")
        .group_by(func.lower(TipoVehiculo.nombre))
    )
    por_tipo = {tipo: n for tipo, n in filas}
    return sum(por_tipo.values()), por_tipo.get("carro", 0), por_tipo.get("moto", 0)


def ingresos_de_hoy(db: Session) -> Decimal:
    return db.scalar(
        select(func.coalesce(func.sum(CajaTransaccion.monto), 0)).where(
            CajaTransaccion.tipo == "ingreso", CajaTransaccion.created_at >= func.date_trunc("day", func.now())
        )
    )  # type: ignore[return-value]


def promedio_minutos_de_hoy(db: Session) -> Decimal | None:
    return db.scalar(select(func.avg(Salida.minutos_totales)).where(Salida.fecha_salida >= func.date_trunc("day", func.now())))
