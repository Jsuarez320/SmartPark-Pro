import pytest
from pydantic import ValidationError

from app.schemas.mensualidad import MensualidadCrear
from app.schemas.operacion import RegistrarRequest
from app.schemas.vehiculo import normalizar_placa


@pytest.mark.parametrize(
    "entrada, esperado",
    [
        ("abc123", "ABC123"),
        ("ABC 123", "ABC123"),
        ("abc-123", "ABC123"),
        ("  ab c-1 2 3 ", "ABC123"),
        ("xyz98a", "XYZ98A"),
    ],
)
def test_normaliza_mayusculas_sin_espacios_ni_guiones(entrada, esperado):
    assert normalizar_placa(entrada) == esperado


@pytest.mark.parametrize("invalida", ["", "  ", "AB", "ABC_123", "ABC123456789", "AB@123"])
def test_rechaza_placas_invalidas(invalida):
    with pytest.raises(ValueError):
        normalizar_placa(invalida)


def test_schema_de_la_operacion_normaliza_la_placa():
    assert RegistrarRequest(placa="abc-123").placa == "ABC123"


def test_schema_de_mensualidad_normaliza_la_placa():
    m = MensualidadCrear(nombre="Ana", placa="xy z-123", tipoVehiculo="carro", periodo="1_mes", medioPago="efectivo")
    assert m.placa == "XYZ123"


def test_schema_rechaza_placa_invalida():
    with pytest.raises(ValidationError):
        RegistrarRequest(placa="a-b")
