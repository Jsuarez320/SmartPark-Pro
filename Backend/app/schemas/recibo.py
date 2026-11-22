from datetime import datetime
from typing import Literal

from app.schemas.base import CamelModel

TipoRecibo = Literal["ingreso", "pago", "mensualidad", "cierre_caja"]


class ReciboOut(CamelModel):
    """Recibo guardado. `contenido` es el snapshot con el que se imprime y reimprime: no se recalcula.

    `reimpresiones` es cuántas copias se han sacado: al imprimir con `reimpresiones > 0` el ticket debe
    decir COPIA.
    """

    id: str
    numero: int
    tipo: TipoRecibo
    placa: str | None = None
    creado_en: datetime
    reimpresiones: int = 0
    ultima_reimpresion: datetime | None = None
    contenido: dict


class ReciboResumen(CamelModel):
    """Fila del buscador: lo justo para identificar el recibo. El contenido completo está en GET /recibos/{id}."""

    id: str
    numero: int
    tipo: TipoRecibo
    placa: str | None = None
    creado_en: datetime
    reimpresiones: int = 0
    # Pago: total cobrado. Mensualidad: valor del periodo. Cierre de caja: total recaudado. Ingreso: null.
    total: int | None = None
    medio_pago: Literal["efectivo", "transferencia"] | None = None
    operador: str | None = None


class ReimpresionOut(CamelModel):
    usuario: str
    fecha: datetime
