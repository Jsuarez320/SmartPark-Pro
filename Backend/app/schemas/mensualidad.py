import re
from datetime import date
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.schemas.base import CamelModel
from app.schemas.caja import MedioPago
from app.schemas.recibo import ReciboOut
from app.schemas.vehiculo import TipoVehiculo, normalizar_placa

PeriodoMensualidad = Literal["1_dia", "15_dias", "1_mes"]
Jornada = Literal["manana", "tarde", "completa"]
EstadoMensualidad = Literal["vigente", "por_vencer", "vencida"]

_CELULAR = re.compile(r"^[0-9+\-\s]{7,20}$")


def _tarjeta(v: str | None) -> str | None:
    v = v.strip().upper() if v else None
    return v or None


def _celular(v: str | None) -> str | None:
    v = v.strip() if v else None
    if not v:
        return None
    if not _CELULAR.match(v):
        raise ValueError("El celular solo puede tener números, espacios, + y -")
    return v


def _nombre(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("No puede estar vacío")
    return v


class MensualidadCrear(CamelModel):
    """Registrar una mensualidad. Incluye el pago del primer periodo (entra a la caja abierta)."""

    nombre: str = Field(min_length=1, max_length=100)
    celular: str | None = Field(default=None, max_length=20)
    placa: str
    placa_alterna: str | None = None
    tipo_vehiculo: TipoVehiculo
    tarjeta: str | None = Field(default=None, max_length=32)
    periodo: PeriodoMensualidad
    jornada: Jornada = "completa"
    medio_pago: MedioPago
    referencia: str | None = Field(default=None, max_length=100)

    @field_validator("nombre")
    @classmethod
    def _v_nombre(cls, v: str) -> str:
        return _nombre(v)

    @field_validator("celular")
    @classmethod
    def _v_celular(cls, v: str | None) -> str | None:
        return _celular(v)

    @field_validator("placa")
    @classmethod
    def _v_placa(cls, v: str) -> str:
        return normalizar_placa(v)

    @field_validator("placa_alterna")
    @classmethod
    def _v_alterna(cls, v: str | None) -> str | None:
        return normalizar_placa(v) if v and v.strip() else None

    @field_validator("tarjeta")
    @classmethod
    def _v_tarjeta(cls, v: str | None) -> str | None:
        return _tarjeta(v)

    @field_validator("referencia")
    @classmethod
    def _v_ref(cls, v: str | None) -> str | None:
        v = v.strip() if v else None
        return v or None

    @model_validator(mode="after")
    def _alterna_distinta(self):
        if self.placa_alterna and self.placa_alterna == self.placa:
            raise ValueError("La placa alterna debe ser distinta de la principal")
        return self


class MensualidadEditar(CamelModel):
    """Edición parcial: solo cambian los campos enviados. Enviar `null` en placaAlterna, tarjeta o
    celular los borra. Cambiar la placa principal solo lo puede hacer un administrador."""

    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    celular: str | None = Field(default=None, max_length=20)
    placa: str | None = None
    placa_alterna: str | None = None
    tarjeta: str | None = Field(default=None, max_length=32)
    jornada: Jornada | None = None

    @field_validator("nombre")
    @classmethod
    def _v_nombre(cls, v: str | None) -> str | None:
        return None if v is None else _nombre(v)

    @field_validator("celular")
    @classmethod
    def _v_celular(cls, v: str | None) -> str | None:
        return _celular(v)

    @field_validator("placa")
    @classmethod
    def _v_placa(cls, v: str | None) -> str | None:
        return None if v is None else normalizar_placa(v)

    @field_validator("placa_alterna")
    @classmethod
    def _v_alterna(cls, v: str | None) -> str | None:
        return normalizar_placa(v) if v and v.strip() else None

    @field_validator("tarjeta")
    @classmethod
    def _v_tarjeta(cls, v: str | None) -> str | None:
        return _tarjeta(v)


class RenovarRequest(CamelModel):
    """Renovar: registra un pago nuevo y extiende la vigencia. Sin `periodo`/`jornada` repite los actuales."""

    periodo: PeriodoMensualidad | None = None
    jornada: Jornada | None = None
    medio_pago: MedioPago
    referencia: str | None = Field(default=None, max_length=100)

    @field_validator("referencia")
    @classmethod
    def _v_ref(cls, v: str | None) -> str | None:
        v = v.strip() if v else None
        return v or None


class MensualidadOut(CamelModel):
    # id del periodo actual. Sirve en /{id} (editar, renovar, detalle) mientras no se renueve.
    id: str
    cliente: str
    celular: str | None
    placa: str
    placa_alterna: str | None
    tipo_vehiculo: TipoVehiculo
    tarjeta: str | None
    periodo: PeriodoMensualidad
    jornada: Jornada
    fecha_inicio: date
    fecha_fin: date
    # Días que faltan para el vencimiento (negativo si ya venció).
    dias_restantes: int
    estado: EstadoMensualidad
    valor_pagado: int


class PeriodoPagadoOut(CamelModel):
    id: str
    periodo: PeriodoMensualidad
    jornada: Jornada
    fecha_inicio: date
    fecha_fin: date
    valor_pagado: int
    medio_pago: MedioPago | None
    recibo_numero: int | None


class MensualidadDetalle(MensualidadOut):
    periodos: list[PeriodoPagadoOut]


class MensualidadResponse(CamelModel):
    """Respuesta de registrar y renovar: la mensualidad actualizada y el recibo del pago."""

    mensaje: str
    mensualidad: MensualidadOut
    recibo: ReciboOut


class ResumenMensualidades(CamelModel):
    """Contadores para la alerta de vencimientos."""

    vigentes: int
    por_vencer: int
    vencidas: int
    umbral_dias: int
