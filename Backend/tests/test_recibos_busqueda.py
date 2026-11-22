"""Funciones puras del buscador de recibos: placa, rango de fechas (hora de Colombia) y resumen del snapshot."""
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest

from app.models.operaciones import Recibo
from app.services.cobro_service import TZ_COLOMBIA
from app.services.recibo_consulta_service import normalizar_placa_busqueda, rango_fechas, resumen_de


# ------------------------------------------------------------------ placa
@pytest.mark.parametrize(
    "texto, esperado",
    [("abc-123", "ABC123"), (" ab c 1 ", "ABC1"), ("A", "A"), ("xyz", "XYZ"), ("", None), ("  - ", None), (None, None)],
)
def test_normaliza_la_placa_de_busqueda(texto, esperado):
    assert normalizar_placa_busqueda(texto) == esperado


# ------------------------------------------------------------------ fechas
def test_sin_fechas_no_filtra():
    assert rango_fechas(None, None, None) == (None, None)


def test_un_dia_va_de_medianoche_a_medianoche_en_colombia():
    inicio, fin = rango_fechas(date(2026, 11, 23), None, None)
    assert inicio == datetime(2026, 11, 23, 0, 0, tzinfo=TZ_COLOMBIA)
    assert fin == datetime(2026, 11, 24, 0, 0, tzinfo=TZ_COLOMBIA)
    assert fin - inicio == timedelta(hours=24)


def test_el_dia_se_mide_en_hora_de_colombia_no_utc():
    inicio, fin = rango_fechas(date(2026, 11, 23), None, None)
    # 23:30 en Colombia del 23 = 04:30 UTC del 24: pertenece al día 23
    recibo = datetime(2026, 11, 24, 4, 30, tzinfo=timezone.utc)
    assert inicio <= recibo < fin
    # 00:30 en Colombia del 24 = 05:30 UTC del 24: ya es el día 24
    assert not (inicio <= datetime(2026, 11, 24, 5, 30, tzinfo=timezone.utc) < fin)


def test_el_rango_incluye_ambos_dias():
    inicio, fin = rango_fechas(None, date(2026, 11, 20), date(2026, 11, 22))
    assert inicio == datetime(2026, 11, 20, tzinfo=TZ_COLOMBIA)
    assert fin == datetime(2026, 11, 23, tzinfo=TZ_COLOMBIA)  # el 22 entra completo


def test_solo_desde_o_solo_hasta():
    assert rango_fechas(None, date(2026, 11, 20), None) == (datetime(2026, 11, 20, tzinfo=TZ_COLOMBIA), None)
    assert rango_fechas(None, None, date(2026, 11, 20)) == (None, datetime(2026, 11, 21, tzinfo=TZ_COLOMBIA))


def test_mismo_dia_en_desde_y_hasta_es_un_dia():
    assert rango_fechas(None, date(2026, 11, 20), date(2026, 11, 20)) == rango_fechas(date(2026, 11, 20), None, None)


def test_fecha_con_rango_es_error():
    with pytest.raises(ValueError):
        rango_fechas(date(2026, 11, 20), date(2026, 11, 1), None)


def test_desde_posterior_a_hasta_es_error():
    with pytest.raises(ValueError):
        rango_fechas(None, date(2026, 11, 22), date(2026, 11, 20))


# ------------------------------------------------------------------ resumen del snapshot
def recibo(tipo, contenido, placa="ABC123", reimpresiones=0, numero=7) -> Recibo:
    return Recibo(
        id=uuid.uuid4(), numero=numero, tipo=tipo, placa=placa, operador_id=uuid.uuid4(), contenido=contenido,
        reimpresiones=reimpresiones, created_at=datetime(2026, 11, 23, 10, 0, tzinfo=TZ_COLOMBIA),
    )


def test_resumen_de_pago():
    r = resumen_de(recibo("pago", {"total": 12000, "medioPago": "efectivo", "operador": "Ana Pérez"}, reimpresiones=2))
    assert (r.total, r.medio_pago, r.operador, r.reimpresiones, r.numero) == (12000, "efectivo", "Ana Pérez", 2, 7)


def test_resumen_de_ingreso_no_tiene_total():
    r = resumen_de(recibo("ingreso", {"operador": "Ana", "tarifa": {"valorHora": 4000}}))
    assert r.total is None and r.medio_pago is None and r.operador == "Ana"


def test_resumen_de_mensualidad():
    r = resumen_de(recibo("mensualidad", {"valor": 160000, "medioPago": "transferencia", "operador": "Luis"}))
    assert (r.total, r.medio_pago) == (160000, "transferencia")


def test_resumen_de_cierre_de_caja():
    r = resumen_de(recibo("cierre_caja", {"totalRecaudado": 185000, "cerradoPor": "Ana Pérez"}, placa=None))
    assert (r.total, r.operador, r.placa, r.medio_pago) == (185000, "Ana Pérez", None, None)


def test_resumen_de_pago_sin_cobro():
    r = resumen_de(recibo("pago", {"total": 0, "medioPago": None, "operador": "Ana"}))
    assert r.total == 0 and r.medio_pago is None
