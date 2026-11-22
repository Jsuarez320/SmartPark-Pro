"""La migración g2c8e4b05d16 precarga festivos calculados (Ley Emiliani). Se contrasta con el calendario oficial 2026."""
import importlib.util
from datetime import date
from pathlib import Path

RUTA = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "g2c8e4b05d16_esquema_v5_tarifas_recibos.py"


def _migracion():
    spec = importlib.util.spec_from_file_location("mig_g2c8", RUTA)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_festivos_2026_coinciden_con_el_calendario_oficial():
    esperado = {
        date(2026, 1, 1), date(2026, 1, 12), date(2026, 3, 23), date(2026, 4, 2), date(2026, 4, 3),
        date(2026, 5, 1), date(2026, 5, 18), date(2026, 6, 8), date(2026, 6, 15), date(2026, 6, 29),
        date(2026, 7, 20), date(2026, 8, 7), date(2026, 8, 17), date(2026, 10, 12), date(2026, 11, 2),
        date(2026, 11, 16), date(2026, 12, 8), date(2026, 12, 25),
    }
    assert {f for f, _ in _migracion()._festivos_colombia(2026)} == esperado


def test_pascua_conocida():
    m = _migracion()
    assert m._pascua(2026) == date(2026, 4, 5)
    assert m._pascua(2027) == date(2027, 3, 28)


def test_calendario_de_la_app_coincide_con_el_de_la_migracion():
    from app.core.festivos_co import festivos_colombia

    m = _migracion()
    for anio in range(2026, 2031):
        assert {f for f, _ in m._festivos_colombia(anio)} == set(festivos_colombia(anio))


def test_festivos_que_caen_el_mismo_dia_unen_los_nombres():
    from app.core.festivos_co import festivos_colombia

    assert festivos_colombia(2030)[date(2030, 7, 1)] == "Sagrado Corazón / San Pedro y San Pablo"
