from app.schemas.base import CamelModel
from app.schemas.caja import Transaccion


class DashboardOut(CamelModel):
    vehiculos_en_patio: int
    carros_en_patio: int
    motos_en_patio: int
    ingresos_hoy: int
    clientes_mensuales: int
    tiempo_promedio_min: int | None = None
    recientes: list[Transaccion]
