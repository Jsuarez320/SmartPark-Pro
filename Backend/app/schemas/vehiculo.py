"""Tipos y validaciones de vehículo compartidos por los schemas de operaciones, mensualidades y tarifas."""
import re
from typing import Literal

TipoVehiculo = Literal["carro", "moto"]
MetodoPago = Literal["efectivo", "transferencia"]

_PLACA = re.compile(r"^[A-Z0-9]{3,10}$")


def normalizar_placa(v: str) -> str:
    """Mayúsculas, sin espacios ni guiones ("abc-123" y "ABC 123" → "ABC123"), y validada."""
    v = re.sub(r"[\s\-]+", "", v).upper()
    if not _PLACA.match(v):
        raise ValueError("La placa debe tener entre 3 y 10 letras o números")
    return v
