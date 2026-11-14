from contextlib import contextmanager

from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session


class NegocioError(Exception):
    """Error de regla de negocio que se devuelve al cliente como {detail}."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


# Mensajes para las restricciones únicas más comunes
_CONSTRAINTS = {
    "uq_ingresos_tarjeta_activa": "La tarjeta ya está asignada a un vehículo dentro del parqueadero",
    "uq_ingresos_vehiculo_activo": "El vehículo ya tiene un ingreso activo",
    "uq_turno_abierto": "Ya hay un turno de caja abierto",
    "ex_membresias_solape": "El vehículo ya tiene una membresía vigente en esas fechas",
    "uq_pagos_salida": "Esta salida ya fue cobrada",
}


@contextmanager
def traducir_errores(db: Session):
    """Convierte errores de la BD (restricciones, RAISE EXCEPTION de triggers) en NegocioError."""
    try:
        yield
    except IntegrityError as exc:
        db.rollback()
        nombre = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        raise NegocioError(
            409,
            _CONSTRAINTS.get(nombre, "Los datos entran en conflicto con un registro existente"),
        ) from exc
    except DBAPIError as exc:
        db.rollback()
        msg = getattr(getattr(exc.orig, "diag", None), "message_primary", None)
        if msg:
            raise NegocioError(409, msg) from exc
        raise
