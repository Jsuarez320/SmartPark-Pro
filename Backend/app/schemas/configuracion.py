from pydantic import Field

from app.schemas.base import CamelModel
from app.schemas.vehiculo import TipoVehiculo


class TarifaOut(CamelModel):
    id: int
    plan: str
    label: str
    value: int


class ConfiguracionOut(CamelModel):
    tarifas: dict[TipoVehiculo, list[TarifaOut]]


class TarifaUpdate(CamelModel):
    id: int
    value: int = Field(gt=0, le=100_000_000)


class ActualizarTarifasRequest(CamelModel):
    tarifas: list[TarifaUpdate] = Field(min_length=1, max_length=50)
