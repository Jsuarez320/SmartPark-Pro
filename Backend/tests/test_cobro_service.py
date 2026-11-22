"""Tests de la función pura de cobro. Calendario usado (hora de Colombia):
  lun 2026-11-16 = festivo (Independencia de Cartagena), vie 20, sáb 28, dom 29 de noviembre,
  lun 23 y mar 24 = días normales.
"""
import json
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

import pytest

from app.services.cobro_service import (
    FESTIVO,
    NOCTURNA,
    NORMAL,
    TZ_COLOMBIA,
    ParametrosCobro,
    TarifaCobro,
    calcular_cobro,
    es_domingo_o_festivo,
)

FESTIVOS = frozenset({date(2026, 11, 16)})
TARIFA = TarifaCobro(
    valor_hora=Decimal(4000),
    valor_dia=Decimal(25000),
    valor_hora_festivo=Decimal(5000),
    valor_dia_festivo=Decimal(30000),
)
TARIFA_NOCTURNA = TarifaCobro(
    valor_hora=Decimal(4000),
    valor_dia=Decimal(25000),
    valor_hora_festivo=Decimal(5000),
    valor_dia_festivo=Decimal(30000),
    nocturna_activa=True,
    valor_hora_nocturna=Decimal(3000),
)
PARAMS = ParametrosCobro(gracia_minutos=5, festivos=FESTIVOS)


def co(dia: int, hora: int, minuto: int = 0, segundo: int = 0, mes: int = 11) -> datetime:
    return datetime(2026, mes, dia, hora, minuto, segundo, tzinfo=TZ_COLOMBIA)


def cobrar(entrada, salida, tarifa=TARIFA, params=PARAMS):
    return calcular_cobro(entrada, salida, tarifa, params)


# ------------------------------------------------------------------ horas y fracciones
def test_horas_exactas():
    r = cobrar(co(23, 10), co(23, 12))
    assert r.horas_cobradas == 2
    assert r.total == 8000
    assert r.minutos_totales == 120
    assert r.minutos_cobrados == 120
    assert not r.tope_aplicado


def test_una_hora_exacta_no_cobra_la_siguiente():
    assert cobrar(co(23, 10), co(23, 11)).total == 4000


def test_fraccion_se_cobra_hora_completa_desde_el_minuto_uno():
    r = cobrar(co(23, 10), co(23, 11, 1))
    assert r.horas_cobradas == 2
    assert r.total == 8000
    assert r.minutos_totales == 61
    assert r.minutos_cobrados == 120


def test_un_segundo_pasada_la_hora_cobra_la_siguiente():
    assert cobrar(co(23, 10), co(23, 11, 0, 1)).total == 8000


# ------------------------------------------------------------------ gracia
def test_dentro_de_la_gracia_no_cobra():
    r = cobrar(co(23, 10), co(23, 10, 5))
    assert r.total == 0
    assert r.horas_cobradas == 0
    assert r.minutos_totales == 5
    assert r.periodos == ()


def test_pasada_la_gracia_cobra_una_hora():
    assert cobrar(co(23, 10), co(23, 10, 5, 1)).total == 4000


def test_gracia_cero_cobra_desde_el_primer_segundo():
    p = ParametrosCobro(gracia_minutos=0, festivos=FESTIVOS)
    assert cobrar(co(23, 10), co(23, 10, 0, 1), params=p).total == 4000
    assert cobrar(co(23, 10), co(23, 10), params=p).total == 0


def test_la_gracia_se_aplica_una_sola_vez():
    # 1 h 03 min: la gracia no perdona los 3 min de la segunda hora
    assert cobrar(co(23, 10), co(23, 11, 3)).total == 8000


# ------------------------------------------------------------------ medianoche, domingo, festivo
def test_cruce_de_medianoche_en_dias_normales():
    r = cobrar(co(23, 22), co(24, 2))
    assert r.horas_cobradas == 4
    assert r.total == 16000
    assert [t.tipo for t in r.periodos[0].tramos] == [NORMAL]


def test_domingo_usa_tarifa_festiva():
    r = cobrar(co(29, 10), co(29, 12))
    assert r.total == 10000
    assert r.periodos[0].tramos[0].tipo == FESTIVO


def test_festivo_entre_semana_usa_tarifa_festiva():
    assert cobrar(co(16, 10), co(16, 11)).total == 5000


def test_cruce_sabado_a_domingo_cobra_por_tramos():
    r = cobrar(co(28, 22), co(29, 2))
    tramos = {t.tipo: (t.horas, t.subtotal) for t in r.periodos[0].tramos}
    assert tramos == {NORMAL: (2, 8000), FESTIVO: (2, 10000)}
    assert r.total == 18000


def test_cruce_domingo_a_lunes_normal():
    r = cobrar(co(29, 22), co(30, 2))
    tramos = {t.tipo: t.horas for t in r.periodos[0].tramos}
    assert tramos == {FESTIVO: 2, NORMAL: 2}
    assert r.total == 2 * 5000 + 2 * 4000


def test_la_franja_se_evalua_en_hora_de_colombia_no_utc():
    # 03:00 UTC del lunes 30 = 22:00 del domingo 29 en Colombia → festivo
    entrada = datetime(2026, 11, 30, 3, 0, tzinfo=timezone.utc)
    assert cobrar(entrada, entrada + timedelta(hours=1)).total == 5000


# ------------------------------------------------------------------ nocturna
def test_nocturna_cobra_las_horas_de_la_franja_con_su_tarifa():
    r = cobrar(co(23, 17), co(23, 21), TARIFA_NOCTURNA)
    tramos = {t.tipo: (t.horas, t.valor_hora) for t in r.periodos[0].tramos}
    assert tramos == {NORMAL: (2, 4000), NOCTURNA: (2, 3000)}
    assert r.total == 2 * 4000 + 2 * 3000


def test_nocturna_desactivada_cobra_tarifa_normal():
    assert cobrar(co(23, 17), co(23, 21), TARIFA).total == 16000


def test_festivo_tiene_prioridad_sobre_nocturna():
    r = cobrar(co(29, 20), co(29, 21), TARIFA_NOCTURNA)
    assert r.total == 5000
    assert r.periodos[0].tramos[0].tipo == FESTIVO


def test_nocturna_cruza_medianoche_y_termina_a_las_seis():
    # 23:00 → 07:00: las horas que empiezan 23,0,1,2,3,4,5 son nocturnas; la de las 06:00 es normal
    r = cobrar(co(23, 23), co(24, 7), TARIFA_NOCTURNA)
    tramos = {t.tipo: t.horas for t in r.periodos[0].tramos}
    assert tramos == {NOCTURNA: 7, NORMAL: 1}
    assert r.total == 7 * 3000 + 4000  # 25.000: justo el tope, no lo supera
    assert not r.tope_aplicado


def test_franja_nocturna_configurable():
    p = ParametrosCobro(nocturna_inicio=time(20, 0), nocturna_fin=time(5, 0), festivos=FESTIVOS)
    r = cobrar(co(23, 19), co(23, 21), TARIFA_NOCTURNA, p)  # 19:00 normal, 20:00 nocturna
    assert r.total == 4000 + 3000


def test_nocturna_activa_sin_valor_es_error():
    mala = TarifaCobro(Decimal(1), Decimal(1), Decimal(1), Decimal(1), nocturna_activa=True)
    with pytest.raises(ValueError):
        cobrar(co(23, 10), co(23, 12), mala)


# ------------------------------------------------------------------ tope diario
def test_bajo_el_tope_no_se_aplica():
    r = cobrar(co(23, 8), co(23, 14))  # 6 h = 24.000
    assert r.total == 24000
    assert not r.tope_aplicado


def test_sobre_el_tope_cobra_el_valor_del_dia():
    r = cobrar(co(23, 8), co(23, 15))  # 7 h = 28.000 → 25.000
    assert r.total == 25000
    assert r.tope_aplicado
    assert r.periodos[0].subtotal == 28000


def test_24_horas_exactas_es_un_solo_periodo_con_tope():
    r = cobrar(co(23, 8), co(24, 8))
    assert len(r.periodos) == 1
    assert r.total == 25000
    assert r.horas_cobradas == 24


def test_mas_de_24_horas_abre_un_segundo_periodo():
    r = cobrar(co(23, 8), co(24, 9))  # 25 h
    assert len(r.periodos) == 2
    assert [p.total for p in r.periodos] == [25000, 4000]
    assert r.total == 29000


def test_dos_dias_exactos():
    r = cobrar(co(23, 8), co(25, 8))
    assert len(r.periodos) == 2
    assert r.total == 50000


def test_dos_dias_y_un_minuto_abre_tercer_periodo():
    r = cobrar(co(23, 8), co(25, 8, 1))
    assert len(r.periodos) == 3
    assert r.total == 54000


def test_tope_festivo_en_domingo():
    r = cobrar(co(29, 8), co(29, 18))  # 10 h * 5.000 = 50.000 → 30.000
    assert r.total == 30000
    assert r.periodos[0].tope == 30000


def test_el_tope_depende_del_dia_en_que_empieza_el_periodo():
    # Empieza sábado 20:00 (tope normal 25.000) y la mayor parte cae en domingo
    r = cobrar(co(28, 20), co(29, 12))
    assert r.periodos[0].tope == 25000
    assert r.total == 25000
    assert r.tope_aplicado


def test_tope_aplicado_global_si_algun_periodo_lo_aplica():
    r = cobrar(co(23, 8), co(24, 9))
    assert r.tope_aplicado
    assert [p.tope_aplicado for p in r.periodos] == [True, False]


# ------------------------------------------------------------------ validaciones y utilidades
def test_fecha_sin_zona_horaria_es_error():
    with pytest.raises(ValueError):
        calcular_cobro(datetime(2026, 11, 23, 10), co(23, 12), TARIFA, PARAMS)


def test_salida_anterior_a_la_entrada_es_error():
    with pytest.raises(ValueError):
        cobrar(co(23, 12), co(23, 10))


def test_el_cobro_es_decimal():
    assert isinstance(cobrar(co(23, 10), co(23, 12)).total, Decimal)


def test_detalle_es_serializable_a_json():
    detalle = cobrar(co(28, 22), co(29, 2), TARIFA_NOCTURNA).detalle()
    texto = json.dumps(detalle)
    assert json.loads(texto)["total"] == 16000  # 2 h nocturnas (sáb) + 2 h festivas (dom)
    assert detalle["periodos"][0]["tramos"][0]["tipo"] in {NORMAL, NOCTURNA, FESTIVO}


def test_es_domingo_o_festivo():
    assert es_domingo_o_festivo(date(2026, 11, 29), frozenset())
    assert es_domingo_o_festivo(date(2026, 11, 16), FESTIVOS)
    assert not es_domingo_o_festivo(date(2026, 11, 23), FESTIVOS)
