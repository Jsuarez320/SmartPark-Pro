"""Reglas puras de Operaciones: vigencia/jornada de mensualidades, snapshot de recibos y schema de entrada."""
from datetime import date, datetime, time, timezone
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.catalogos import TarifaVersion
from app.schemas.operacion import RegistrarRequest
from app.services.cobro_service import TZ_COLOMBIA
from app.services.recibo_service import contenido_ingreso, contenido_pago, datos_mensualidad, snapshot_tarifa
from app.services.vigencia import HorarioJornadas, dentro_de_jornada, estado_vigencia, hoy_en_colombia


def co(h, m=0, dia=23):
    return datetime(2026, 11, dia, h, m, tzinfo=TZ_COLOMBIA)


# ------------------------------------------------------------------ vigencia
@pytest.mark.parametrize(
    "hoy, esperado",
    [
        (date(2026, 11, 9), "futura"),
        (date(2026, 11, 10), "vigente"),   # el primer día cuenta
        (date(2026, 11, 20), "vigente"),
        (date(2026, 11, 30), "vigente"),   # el último día cuenta
        (date(2026, 12, 1), "vencida"),
    ],
)
def test_estado_de_vigencia_incluye_primer_y_ultimo_dia(hoy, esperado):
    assert estado_vigencia(date(2026, 11, 10), date(2026, 11, 30), hoy) == esperado


def test_mensualidad_de_un_dia_es_vigente_ese_dia():
    assert estado_vigencia(date(2026, 11, 23), date(2026, 11, 23), date(2026, 11, 23)) == "vigente"


# ------------------------------------------------------------------ jornada
@pytest.mark.parametrize(
    "jornada, hora, minuto, esperado",
    [
        ("completa", 3, 0, True),
        ("completa", 23, 59, True),
        ("manana", 5, 59, False),
        ("manana", 6, 0, True),
        ("manana", 13, 59, True),
        ("manana", 14, 0, False),   # el fin es exclusivo: a las 14:00 empieza la tarde
        ("tarde", 13, 59, False),
        ("tarde", 14, 0, True),
        ("tarde", 21, 59, True),
        ("tarde", 22, 0, False),
    ],
)
def test_jornada_con_horario_por_defecto(jornada, hora, minuto, esperado):
    assert dentro_de_jornada(jornada, co(hora, minuto)) is esperado


def test_horario_de_jornada_configurable():
    h = HorarioJornadas(manana_inicio=time(5, 0), manana_fin=time(12, 0))
    assert dentro_de_jornada("manana", co(5, 0), h)
    assert not dentro_de_jornada("manana", co(12, 0), h)


def test_la_jornada_se_evalua_en_hora_de_colombia():
    # 11:30 UTC = 06:30 en Colombia → dentro de la mañana aunque en UTC sea mediodía
    utc = datetime(2026, 11, 23, 11, 30, tzinfo=timezone.utc)
    assert dentro_de_jornada("manana", utc)


def test_jornada_desconocida_es_error():
    with pytest.raises(ValueError):
        dentro_de_jornada("noche", co(10))


def test_hoy_en_colombia_no_es_el_dia_utc():
    utc = datetime(2026, 11, 24, 2, 0, tzinfo=timezone.utc)  # 21:00 del 23 en Colombia
    assert hoy_en_colombia(utc) == date(2026, 11, 23)


# ------------------------------------------------------------------ recibos (snapshot)
def version(**kw) -> TarifaVersion:
    base = dict(
        id=7, tipo_vehiculo_id=1, valor_hora=Decimal("4000.00"), valor_dia=Decimal("25000.00"),
        valor_hora_festivo=Decimal("5000.00"), valor_dia_festivo=Decimal("30000.00"),
        mensualidad_1_dia=Decimal(1), mensualidad_15_dias=Decimal(1), mensualidad_1_mes=Decimal(1),
        nocturna_activa=False, valor_hora_nocturna=None,
    )
    base.update(kw)
    return TarifaVersion(**base)


def test_snapshot_de_tarifa_en_pesos_enteros():
    s = snapshot_tarifa(version(nocturna_activa=True, valor_hora_nocturna=Decimal("3500.00")), 5)
    assert s == {
        "versionId": 7, "valorHora": 4000, "valorDia": 25000, "valorHoraFestivo": 5000,
        "valorDiaFestivo": 30000, "nocturnaActiva": True, "valorHoraNocturna": 3500, "graciaMinutos": 5,
    }


def test_snapshot_sin_nocturna():
    assert snapshot_tarifa(version(), 0)["valorHoraNocturna"] is None


def test_contenido_de_ingreso_es_json_serializable():
    import json

    c = contenido_ingreso(
        placa="ABC123", tipo_vehiculo="carro", hora_entrada=co(10), operador="Ana Pérez",
        tarifa=snapshot_tarifa(version(), 5), mensualidad=None, aviso=None,
    )
    assert json.loads(json.dumps(c))["horaEntrada"].startswith("2026-11-23T10:00")
    assert c["esMensualidad"] is False


def test_contenido_de_ingreso_de_mensualidad():
    c = contenido_ingreso(
        placa="ABC123", tipo_vehiculo="carro", hora_entrada=co(10), operador="Ana", tarifa=None,
        mensualidad=datos_mensualidad("manana", date(2026, 12, 5), "Luis Gómez"), aviso=None,
    )
    assert c["esMensualidad"] is True
    assert c["mensualidad"] == {"jornada": "manana", "fechaFin": "2026-12-05", "cliente": "Luis Gómez"}


def test_contenido_de_pago_copia_el_desglose_del_cobro():
    cobro = {"minutosCobrados": 120, "horasCobradas": 2, "topeAplicado": False, "periodos": [{"total": 8000}]}
    c = contenido_pago(
        placa="ABC123", tipo_vehiculo="carro", hora_entrada=co(10), hora_salida=co(11, 50), tiquete=42,
        operador="Ana", es_mensualidad=False, medio_pago="efectivo", referencia=None, total=8000,
        minutos_totales=110, cobro=cobro, tarifa=snapshot_tarifa(version(), 5),
    )
    assert (c["tiquete"], c["total"], c["horasCobradas"], c["minutosTotales"]) == (42, 8000, 2, 110)
    assert c["periodos"] == [{"total": 8000}]
    assert c["tarifa"]["valorHora"] == 4000


def test_contenido_de_pago_de_mensualidad_no_tiene_cobro():
    c = contenido_pago(
        placa="ABC123", tipo_vehiculo="moto", hora_entrada=co(10), hora_salida=co(12), tiquete=None,
        operador="Ana", es_mensualidad=True, medio_pago=None, referencia=None, total=0,
        minutos_totales=120, cobro=None, tarifa=None,
    )
    assert c["total"] == 0 and c["horasCobradas"] == 0 and c["periodos"] == [] and c["esMensualidad"]


# ------------------------------------------------------------------ schema de la operación
def test_la_placa_se_normaliza_en_la_operacion():
    assert RegistrarRequest(placa=" abc-123 ").placa == "ABC123"


def test_el_medio_de_pago_solo_acepta_efectivo_o_transferencia():
    assert RegistrarRequest(placa="ABC123", medioPago="transferencia").medio_pago == "transferencia"
    with pytest.raises(ValidationError):
        RegistrarRequest(placa="ABC123", medioPago="nequi")


def test_tipo_de_vehiculo_invalido():
    with pytest.raises(ValidationError):
        RegistrarRequest(placa="ABC123", tipoVehiculo="bus")


def test_referencia_vacia_es_none():
    assert RegistrarRequest(placa="ABC123", referencia="   ").referencia is None


def test_total_confirmado_no_puede_ser_negativo():
    with pytest.raises(ValidationError):
        RegistrarRequest(placa="ABC123", totalConfirmado=-1)

