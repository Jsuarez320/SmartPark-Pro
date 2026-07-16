from datetime import datetime
from pydantic import BaseModel


class AbrirCajaRequest(BaseModel):
    monto_inicial: float = 0


class CerrarCajaRequest(BaseModel):
    monto_cierre: float
    notas: str | None = None


class TransaccionRequest(BaseModel):
    tipo: str
    concepto: str
    metodo: str
    monto: float
    pago_id: str | None = None


class TransaccionResponse(BaseModel):
    id: str
    turno_id: str
    tipo: str
    concepto: str
    metodo: str
    monto: float
    pago_id: str | None = None
    created_at: datetime


class TurnoCajaResponse(BaseModel):
    id: str
    admin_id: str
    admin_nombre: str
    fecha_apertura: datetime
    monto_inicial: float
    fecha_cierre: datetime | None = None
    monto_cierre: float | None = None
    estado: str
    notas: str | None = None


class MovimientosResponse(BaseModel):
    transacciones: list[TransaccionResponse]
    total_ingresos: float
    total_egresos: float
    saldo_actual: float
