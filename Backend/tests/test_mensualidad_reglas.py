"""Reglas puras de mensualidades: fin de periodo, inicio de renovación, estado, precio y schemas."""
from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.catalogos import TarifaVersion
from app.schemas.mensualidad import MensualidadCrear, MensualidadEditar, RenovarRequest
from app.services.vigencia import calcular_fin, estado_mensualidad, inicio_renovacion, valor_periodo


# ------------------------------------------------------------------ fin del periodo
@pytest.mark.parametrize(
    "inicio, periodo, fin",
    [
        (date(2026, 11, 23), "1_dia", date(2026, 11, 23)),       # el mismo día
        (date(2026, 11, 23), "15_dias", date(2026, 12, 7)),      # 15 días contando el de inicio
        (date(2026, 11, 20), "15_dias", date(2026, 12, 4)),
        (date(2026, 12, 25), "15_dias", date(2027, 1, 8)),       # cruza el año
        (date(2026, 11, 1), "1_mes", date(2026, 11, 30)),
        (date(2026, 11, 23), "1_mes", date(2026, 12, 22)),       # víspera de la misma fecha del mes siguiente
        (date(2026, 12, 15), "1_mes", date(2027, 1, 14)),        # cruza el año
        (date(2027, 1, 31), "1_mes", date(2027, 2, 27)),         # 31-ene + 1 mes = 28-feb (se ajusta) − 1 día
        (date(2027, 2, 1), "1_mes", date(2027, 2, 28)),
        (date(2028, 1, 31), "1_mes", date(2028, 2, 28)),         # año bisiesto: 29-feb − 1 día
        (date(2028, 2, 1), "1_mes", date(2028, 2, 29)),
        (date(2026, 3, 31), "1_mes", date(2026, 4, 29)),         # abril tiene 30 → 30-abr − 1 día
    ],
)
def test_calcular_fin(inicio, periodo, fin):
    assert calcular_fin(inicio, periodo) == fin


def test_periodo_desconocido_es_error():
    with pytest.raises(ValueError):
        calcular_fin(date(2026, 11, 23), "2_meses")


def test_el_periodo_de_un_dia_cumple_el_check_fin_mayor_o_igual_que_inicio():
    d = date(2026, 11, 23)
    assert calcular_fin(d, "1_dia") >= d


# ------------------------------------------------------------------ renovación
HOY = date(2026, 11, 23)


@pytest.mark.parametrize(
    "ultimo_fin, esperado",
    [
        (date(2026, 12, 5), date(2026, 12, 6)),    # vigente: sigue al día siguiente (sin perder días)
        (date(2026, 11, 23), date(2026, 11, 24)),  # vence hoy: mañana
        (date(2026, 11, 22), HOY),                 # venció ayer: empieza hoy (sin cobrar días ya pasados)
        (date(2026, 10, 1), HOY),
        (None, HOY),
    ],
)
def test_inicio_de_la_renovacion(ultimo_fin, esperado):
    assert inicio_renovacion(ultimo_fin, HOY) == esperado


def test_renovar_vigente_no_solapa_ni_deja_huecos():
    fin_actual = date(2026, 12, 5)
    nuevo_inicio = inicio_renovacion(fin_actual, HOY)
    assert (nuevo_inicio - fin_actual).days == 1


# ------------------------------------------------------------------ estado
@pytest.mark.parametrize(
    "fecha_fin, esperado",
    [
        (date(2026, 11, 22), "vencida"),      # ayer
        (date(2026, 11, 23), "por_vencer"),   # vence hoy: último día vigente
        (date(2026, 11, 26), "por_vencer"),   # faltan 3 = umbral
        (date(2026, 11, 27), "vigente"),      # faltan 4
        (date(2027, 1, 1), "vigente"),
    ],
)
def test_estado_con_umbral_por_defecto(fecha_fin, esperado):
    assert estado_mensualidad(fecha_fin, HOY) == esperado


def test_umbral_configurable():
    assert estado_mensualidad(date(2026, 11, 30), HOY, umbral_dias=7) == "por_vencer"
    assert estado_mensualidad(date(2026, 11, 30), HOY, umbral_dias=3) == "vigente"
    assert estado_mensualidad(date(2026, 11, 23), HOY, umbral_dias=0) == "por_vencer"
    assert estado_mensualidad(date(2026, 11, 24), HOY, umbral_dias=0) == "vigente"


# ------------------------------------------------------------------ precio por periodo
def test_valor_por_periodo():
    v = TarifaVersion(
        id=1, tipo_vehiculo_id=1, valor_hora=Decimal(1), valor_dia=Decimal(1), valor_hora_festivo=Decimal(1),
        valor_dia_festivo=Decimal(1), mensualidad_1_dia=Decimal(25000), mensualidad_15_dias=Decimal(90000),
        mensualidad_1_mes=Decimal(160000), nocturna_activa=False,
    )
    assert valor_periodo(v, "1_dia") == 25000
    assert valor_periodo(v, "15_dias") == 90000
    assert valor_periodo(v, "1_mes") == 160000
    with pytest.raises(ValueError):
        valor_periodo(v, "1_semana")


# ------------------------------------------------------------------ schemas
BASE = dict(nombre="Ana Gómez", placa="abc-123", tipoVehiculo="carro", periodo="1_mes", medioPago="efectivo")


def test_crear_normaliza_placas_tarjeta_y_celular():
    m = MensualidadCrear(**BASE, placaAlterna="xy z 98", tarjeta=" t-9 ", celular="300 123 4567")
    assert (m.placa, m.placa_alterna, m.tarjeta, m.celular) == ("ABC123", "XYZ98", "T-9", "300 123 4567")
    assert m.jornada == "completa"


def test_crear_sin_opcionales():
    m = MensualidadCrear(**BASE)
    assert m.placa_alterna is None and m.tarjeta is None and m.celular is None


def test_crear_rechaza_alterna_igual_a_la_principal():
    with pytest.raises(ValidationError):
        MensualidadCrear(**BASE, placaAlterna="ABC 123")


@pytest.mark.parametrize(
    "cambio",
    [{"periodo": "2_meses"}, {"jornada": "noche"}, {"medioPago": "nequi"}, {"celular": "abc"}, {"nombre": "   "}, {"placa": "a"}],
)
def test_crear_rechaza_valores_invalidos(cambio):
    with pytest.raises(ValidationError):
        MensualidadCrear(**{**BASE, **cambio})


def test_editar_distingue_no_enviado_de_null():
    solo_nombre = MensualidadEditar(nombre="Luis")
    assert solo_nombre.model_fields_set == {"nombre"}

    borra_alterna = MensualidadEditar.model_validate({"placaAlterna": None})
    assert borra_alterna.model_fields_set == {"placa_alterna"} and borra_alterna.placa_alterna is None


def test_editar_normaliza():
    e = MensualidadEditar.model_validate({"placa": "xyz-987", "placaAlterna": "ab 12 c", "tarjeta": "k1"})
    assert (e.placa, e.placa_alterna, e.tarjeta) == ("XYZ987", "AB12C", "K1")


def test_editar_vacio_no_tiene_campos():
    assert MensualidadEditar().model_fields_set == set()


def test_renovar_solo_exige_medio_de_pago():
    r = RenovarRequest(medioPago="transferencia")
    assert r.periodo is None and r.jornada is None
    with pytest.raises(ValidationError):
        RenovarRequest()
