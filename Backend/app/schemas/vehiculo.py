import re
from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.base import CamelModel

TipoVehiculo = Literal["carro", "moto"]
PlanIngreso = Literal["bloque_15min", "medio_dia", "dia_completo"]
PlanPrecio = Literal["bloque_15min", "medio_dia", "dia_completo", "medio_tiempo", "mensual"]
MetodoPago = Literal["efectivo", "tarjeta", "nequi", "transferencia"]

_PLACA = re.compile(r"^[A-Z0-9]{3,10}$")


def normalizar_placa(v: str) -> str:
    v = v.strip().upper()
    if not _PLACA.match(v):
        raise ValueError("La placa debe tener entre 3 y 10 letras o números")
    return v


class PrecioRequest(CamelModel):
    tipo: TipoVehiculo = "carro"
    plan: PlanPrecio = "bloque_15min"


class PrecioResponse(CamelModel):
    monto: int
    concepto: str


class MembresiaVigente(CamelModel):
    plan: str
    fecha_fin: date


class ConsultaResponse(CamelModel):
    placa: str
    registrado: bool
    tipo: TipoVehiculo | None = None
    membresia: MembresiaVigente | None = None


class EntradaRequest(CamelModel):
    tarjeta: str = Field(min_length=1, max_length=32)
    placa: str
    tipo: TipoVehiculo = "carro"
    marca: str | None = Field(default=None, max_length=50)
    plan: PlanIngreso = "bloque_15min"

    @field_validator("tarjeta")
    @classmethod
    def _tarjeta(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("La tarjeta no puede estar vacía")
        return v

    @field_validator("placa")
    @classmethod
    def _placa(cls, v: str) -> str:
        return normalizar_placa(v)

    @field_validator("marca")
    @classmethod
    def _marca(cls, v: str | None) -> str | None:
        v = v.strip() if v else None
        return v or None


class EntradaResponse(CamelModel):
    id: str
    estado: str
    tarjeta: str
    placa: str
    tipo: TipoVehiculo
    plan: str
    membresia: bool
    hora_ingreso: datetime
    mensaje: str


class PatioItem(CamelModel):
    ingreso_id: str
    tarjeta: str
    placa: str
    tipo: TipoVehiculo
    plan: str
    membresia: bool
    cliente: str | None = None
    fecha_ingreso: datetime
    minutos: int
    bloques: int
    valor: int


class SalidaRequest(CamelModel):
    ingreso_id: str
    metodo_pago: MetodoPago | None = None
    referencia: str | None = Field(default=None, max_length=100)
    convenio_id: str | None = None


class SalidaResponse(CamelModel):
    ticket: str
    placa: str
    tarjeta: str
    tipo: TipoVehiculo
    plan: str
    hora_ingreso: datetime
    hora_salida: datetime
    minutos: int
    bloques: int
    valor_bloque: int
    tope_aplicado: bool
    total: int
    metodo_pago: str | None = None


class VehiculoOut(CamelModel):
    placa: str
    propietario: str
    tipo: TipoVehiculo
    marca: str
    mensualidad: bool
    fecha_registro: str


class MensualOut(CamelModel):
    placa: str
    propietario: str
    plan: str
    vencimiento: str
    estado: Literal["vencido", "por_vencer", "alerta", "activo"]


class StatsOut(CamelModel):
    total_placas: int
    total_mensuales: int
