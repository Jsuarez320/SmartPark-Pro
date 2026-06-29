from datetime import datetime
from pydantic import BaseModel


class RegistrarIngresoRequest(BaseModel):
    placa: str
    tipo_vehiculo_id: int
    plan_id: int
    operador_id: str
    notas: str | None = None


class VehiculoResponse(BaseModel):
    id: str
    placa: str
    marca: str | None = None
    color: str | None = None
    tipo_vehiculo_id: int


class TarifaResponse(BaseModel):
    id: int
    plan_id: int
    tipo_vehiculo_id: int
    valor: float
    vigente_desde: str
    vigente_hasta: str | None = None


class TarifaOut(BaseModel):
    id: int
    plan_id: int
    plan_nombre: str
    tipo_vehiculo_id: int
    tipo_vehiculo_nombre: str
    valor: float
    vigente_desde: str
    vigente_hasta: str | None = None


class IngresoResponse(BaseModel):
    mensaje: str
    id: str
    vehiculo_id: str
    placa_capturada: str
    plan_id: int
    tarifa_id: int
    tarifa_valor: float
    operador_id: str
    fecha_ingreso: datetime
    estado: str
    notas: str | None = None
