"""Aritmética del resumen de caja: esperado por medio, diferencia y compatibilidad con el contrato anterior."""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.caja import TurnoCaja
from app.repositories.caja_repository import TotalesTurno
from app.schemas.caja import AbrirTurnoRequest, CerrarTurnoRequest
from app.services.caja_service import construir_resumen

APERTURA = datetime(2026, 11, 23, 7, 0, tzinfo=timezone.utc)
AHORA = APERTURA + timedelta(hours=9, minutes=30)


def turno(**kw) -> TurnoCaja:
    base = dict(
        id=uuid.uuid4(), usuario_id=uuid.uuid4(), estado="abierta", fecha_apertura=APERTURA,
        base_efectivo=Decimal(50000), base_transferencia=Decimal(20000),
        fecha_cierre=None, monto_cierre=None, notas=None,
    )
    base.update(kw)
    return TurnoCaja(**base)


TOTALES = TotalesTurno(
    efectivo=Decimal(130000), transferencia=Decimal(45000), movimientos_efectivo=11, movimientos_transferencia=4
)


def test_esperado_es_base_mas_cobrado_por_medio():
    r = construir_resumen(turno(), "Ana Pérez", None, TOTALES, None, AHORA)
    assert r.esperado_efectivo == 50000 + 130000
    assert r.esperado_transferencia == 20000 + 45000
    assert r.total_recaudado == 175000
    assert r.total_transacciones == 15
    assert (r.movimientos_efectivo, r.movimientos_transferencia) == (11, 4)


def test_turno_abierto_no_tiene_contado_ni_diferencia():
    r = construir_resumen(turno(), "Ana", None, TOTALES, None, AHORA)
    assert r.estado == "abierta"
    assert r.efectivo_contado is None and r.diferencia_efectivo is None
    assert r.horas_turno == 9.5


@pytest.mark.parametrize("contado, diferencia", [(180000, 0), (178000, -2000), (181500, 1500)])
def test_diferencia_es_contado_menos_esperado(contado, diferencia):
    t = turno(estado="cerrada", fecha_cierre=AHORA, monto_cierre=Decimal(contado), cerrado_por=uuid.uuid4())
    r = construir_resumen(t, "Ana", "Luis", TOTALES, None, AHORA)
    assert r.efectivo_contado == contado
    assert r.diferencia_efectivo == diferencia
    assert r.cerrado_por == "Luis"


def test_turno_sin_movimientos():
    r = construir_resumen(turno(base_transferencia=Decimal(0)), "Ana", None, TotalesTurno(), None, AHORA)
    assert (r.efectivo, r.transferencia, r.total_transacciones) == (0, 0, 0)
    assert r.esperado_efectivo == 50000 and r.esperado_transferencia == 0


def test_serializa_en_camel_case_con_los_campos_del_contrato():
    t = turno(estado="cerrada", fecha_cierre=AHORA, monto_cierre=Decimal(178000), cerrado_por=uuid.uuid4())
    d = construir_resumen(t, "Ana", "Luis", TOTALES, None, AHORA).model_dump(by_alias=True)
    assert d["baseEfectivo"] == 50000
    assert d["baseTransferencia"] == 20000
    assert d["esperadoEfectivo"] == 180000
    assert d["efectivoContado"] == 178000
    assert d["diferenciaEfectivo"] == -2000
    # los alias del contrato anterior ya no existen
    for viejo in ("montoInicial", "otrosMetodos", "totalEsperadoCaja", "montoContado", "diferenciaCaja"):
        assert viejo not in d


def test_el_resumen_del_cierre_es_json_serializable_para_el_recibo():
    import json

    t = turno(estado="cerrada", fecha_cierre=AHORA, monto_cierre=Decimal(180000), cerrado_por=uuid.uuid4())
    contenido = construir_resumen(t, "Ana", "Luis", TOTALES, [], AHORA).model_dump(mode="json", by_alias=True)
    assert json.loads(json.dumps(contenido))["esperadoEfectivo"] == 180000


# ------------------------------------------------------------------ requests
def test_apertura_con_las_dos_bases():
    a = AbrirTurnoRequest.model_validate({"baseEfectivo": 50000, "baseTransferencia": 1000})
    assert (a.base_efectivo, a.base_transferencia) == (50000, 1000)
    assert AbrirTurnoRequest.model_validate({"baseEfectivo": 50000}).base_transferencia == 0


def test_cierre_con_efectivo_contado():
    assert CerrarTurnoRequest.model_validate({"efectivoContado": 10}).efectivo_contado == 10


def test_los_nombres_anteriores_ya_no_se_aceptan():
    with pytest.raises(ValidationError):
        AbrirTurnoRequest.model_validate({"montoInicial": 50000})
    with pytest.raises(ValidationError):
        CerrarTurnoRequest.model_validate({"montoContado": 10})


@pytest.mark.parametrize("cuerpo", [{"baseEfectivo": -1}, {"baseEfectivo": 1, "baseTransferencia": -5}, {}])
def test_apertura_rechaza_valores_invalidos(cuerpo):
    with pytest.raises(ValidationError):
        AbrirTurnoRequest.model_validate(cuerpo)
