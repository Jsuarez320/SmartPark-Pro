from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.base import CamelModel
from app.schemas.caja import MedioPago
from app.schemas.recibo import ReciboOut
from app.schemas.tarifa import SimularResponse
from app.schemas.vehiculo import TipoVehiculo, normalizar_placa

# Desglose del cobro por horas: mismo formato que la simulación de tarifas.
CobroOut = SimularResponse


class RegistrarRequest(CamelModel):
    """Una sola operación para entrada y salida: el sistema decide cuál según la placa."""

    placa: str
    # Obligatorio solo si la placa es nueva. Si ya existe y se envía, debe coincidir con el registrado.
    tipo_vehiculo: TipoVehiculo | None = None
    # Solo se usa en una salida con valor a cobrar. Sin él, la salida queda pendiente de pago.
    medio_pago: MedioPago | None = None
    referencia: str | None = Field(default=None, max_length=100)
    # Total que vio el empleado al confirmar. Si el valor cambió (pasó a otra hora), se rechaza.
    total_confirmado: int | None = Field(default=None, ge=0)

    @field_validator("placa")
    @classmethod
    def _placa(cls, v: str) -> str:
        return normalizar_placa(v)

    @field_validator("referencia")
    @classmethod
    def _referencia(cls, v: str | None) -> str | None:
        v = v.strip() if v else None
        return v or None


class RegistrarResponse(CamelModel):
    tipo: Literal["entrada", "salida"]
    # False solo en una salida con valor a cobrar a la que aún le falta el medio de pago (no se guardó nada).
    registrado: bool
    requiere_pago: bool = False
    mensaje: str
    aviso: str | None = None

    placa: str
    tipo_vehiculo: TipoVehiculo
    es_mensualidad: bool
    ingreso_id: str
    salida_id: str | None = None
    hora_entrada: datetime
    hora_salida: datetime | None = None

    cobro: CobroOut | None = None
    medio_pago: MedioPago | None = None
    recibo: ReciboOut | None = None


class PatioItem(CamelModel):
    ingreso_id: str
    placa: str
    tipo_vehiculo: TipoVehiculo
    hora_entrada: datetime
    minutos: int
    es_mensualidad: bool
    # Número del recibo de ingreso (el "tiquete" que se le entregó al cliente).
    tiquete: int | None = None
    cliente: str | None = None
    # Lo que se cobraría si saliera ahora (0 para mensualidades; null si no hay tarifa configurada).
    valor_estimado: int | None = None
