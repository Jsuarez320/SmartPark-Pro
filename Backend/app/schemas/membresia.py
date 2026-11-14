from datetime import date
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.base import CamelModel
from app.schemas.vehiculo import MetodoPago, TipoVehiculo, normalizar_placa


class MembresiaRequest(CamelModel):
    nombres: str = Field(min_length=1, max_length=100)
    apellidos: str = Field(min_length=1, max_length=100)
    documento: str = Field(min_length=3, max_length=20)
    tipo_documento: Literal["CC", "CE", "NIT", "PAS", "TI"] = "CC"
    telefono: str | None = Field(default=None, max_length=20)
    placa: str
    tipo: TipoVehiculo = "carro"
    marca: str | None = Field(default=None, max_length=50)
    plan: Literal["mensual", "medio_tiempo"] = "mensual"
    metodo_pago: MetodoPago
    referencia: str | None = Field(default=None, max_length=100)

    @field_validator("placa")
    @classmethod
    def _placa(cls, v: str) -> str:
        return normalizar_placa(v)

    @field_validator("nombres", "apellidos", "documento")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("No puede estar vacío")
        return v


class MembresiaResponse(CamelModel):
    id: str
    placa: str
    plan: str
    fecha_inicio: date
    fecha_fin: date
    valor: int
    factura: str
