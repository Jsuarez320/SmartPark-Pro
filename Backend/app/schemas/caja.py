from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel

Periodo = Literal["Día", "Semana", "Mes", "Año"]
MedioPago = Literal["efectivo", "transferencia"]


# ------------------------------------------------------------------ apertura / cierre
class AbrirTurnoRequest(CamelModel):
    base_efectivo: int = Field(ge=0, le=100_000_000)
    base_transferencia: int = Field(default=0, ge=0, le=100_000_000)


class CerrarTurnoRequest(CamelModel):
    # Efectivo contado físicamente al cerrar.
    efectivo_contado: int = Field(ge=0, le=1_000_000_000)
    notas: str | None = Field(default=None, max_length=500)


# ------------------------------------------------------------------ resumen
class Movimiento(CamelModel):
    id: str
    fecha: datetime
    operacion: Literal["horas", "mensualidad"]
    concepto: str
    placa: str | None
    medio: MedioPago
    monto: int


class ResumenTurno(CamelModel):
    """Resumen de un turno de caja, abierto (en vivo) o cerrado."""

    turno_id: str
    estado: Literal["abierta", "cerrada"]
    abierto_por: str
    cerrado_por: str | None = None
    fecha_apertura: datetime
    fecha_cierre: datetime | None = None
    horas_turno: float

    base_efectivo: int
    base_transferencia: int

    # Cobrado en el turno, separado por medio de pago
    efectivo: int
    transferencia: int
    total_recaudado: int
    movimientos_efectivo: int
    movimientos_transferencia: int
    total_transacciones: int

    # Lo que debería haber: base + cobrado, por medio
    esperado_efectivo: int
    esperado_transferencia: int

    # Solo en turnos cerrados
    efectivo_contado: int | None = None
    diferencia_efectivo: int | None = None  # contado - esperado (negativo = faltante)
    notas: str | None = None
    recibo_id: str | None = None
    recibo_numero: int | None = None

    # Detalle (solo en el turno actual, en el detalle de un turno y en el cierre)
    movimientos: list[Movimiento] | None = None


# ------------------------------------------------------------------ reportes por periodo (admin)
class PorConcepto(CamelModel):
    tiempo: int
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
