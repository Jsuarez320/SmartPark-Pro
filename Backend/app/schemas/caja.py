from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel

Periodo = Literal["Día", "Semana", "Mes", "Año"]


class AbrirTurnoRequest(CamelModel):
    monto_inicial: int = Field(ge=0, le=100_000_000)


class CerrarTurnoRequest(CamelModel):
    monto_contado: int = Field(ge=0, le=1_000_000_000)
    notas: str | None = Field(default=None, max_length=500)


class TurnoActual(CamelModel):
    turno_id: str
    abierto_por: str
    fecha_apertura: datetime
    monto_inicial: int
    total_transacciones: int
    total_recaudado: int
    efectivo: int
    otros_metodos: int
    total_esperado_caja: int


class TurnoHistorial(CamelModel):
    turno_id: str
    abierto_por: str
    cerrado_por: str
    fecha_apertura: datetime
    fecha_cierre: datetime
    horas_turno: float
    monto_inicial: int
    total_recaudado: int
    efectivo: int
    otros_metodos: int
    monto_contado: int
    diferencia_caja: int
    notas: str | None = None


class PorConcepto(CamelModel):
    tiempo: int
    medio_dia: int
    dia_completo: int
    membresia: int


class Desglose(CamelModel):
    total: int
    por_carros: int
    por_motos: int
    por_concepto: PorConcepto
    transacciones: int


class Transaccion(CamelModel):
    id: str
    placa: str
    tipo: str
    concepto: str
    monto: int
    metodo_pago: str
    fecha: datetime
