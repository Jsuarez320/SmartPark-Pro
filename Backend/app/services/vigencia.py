"""Reglas puras de vigencia y jornada de las mensualidades (sin BD ni reloj).

* Vigencia: una mensualidad está vigente de `fecha_inicio` a `fecha_fin`, ambos días incluidos.
* Jornada: `completa` no restringe; `manana` y `tarde` solo permiten entrar en su horario
  (configurable en `configuracion`; la hora es la de Colombia).
"""
import calendar
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Literal

from app.services.cobro_service import TZ_COLOMBIA

Jornada = Literal["manana", "tarde", "completa"]
Vigencia = Literal["vigente", "vencida", "futura"]
Periodo = Literal["1_dia", "15_dias", "1_mes"]
EstadoMensualidad = Literal["vigente", "por_vencer", "vencida"]

_CAMPO_PRECIO = {"1_dia": "mensualidad_1_dia", "15_dias": "mensualidad_15_dias", "1_mes": "mensualidad_1_mes"}


@dataclass(frozen=True)
class HorarioJornadas:
    manana_inicio: time = time(6, 0)
    manana_fin: time = time(14, 0)
    tarde_inicio: time = time(14, 0)
    tarde_fin: time = time(22, 0)


def estado_vigencia(fecha_inicio: date, fecha_fin: date, hoy: date) -> Vigencia:
    if hoy < fecha_inicio:
        return "futura"
    if hoy > fecha_fin:
        return "vencida"
    return "vigente"


def dentro_de_jornada(jornada: str, instante: datetime, horario: HorarioJornadas = HorarioJornadas()) -> bool:
    """¿El instante (hora de Colombia) cae dentro de la jornada contratada?"""
    if jornada == "completa":
        return True
    hora = instante.astimezone(TZ_COLOMBIA).time()
    if jornada == "manana":
        return horario.manana_inicio <= hora < horario.manana_fin
    if jornada == "tarde":
        return horario.tarde_inicio <= hora < horario.tarde_fin
    raise ValueError(f"Jornada desconocida: {jornada}")


def hoy_en_colombia(instante: datetime) -> date:
    return instante.astimezone(TZ_COLOMBIA).date()


# ------------------------------------------------------------------ periodos de mensualidad
def _sumar_meses(d: date, meses: int) -> date:
    """Suma meses calendario; si el día no existe en el mes destino, usa el último (31-ene + 1 mes = 28-feb)."""
    indice = d.year * 12 + (d.month - 1) + meses
    anio, mes = divmod(indice, 12)
    mes += 1
    return date(anio, mes, min(d.day, calendar.monthrange(anio, mes)[1]))


def calcular_fin(inicio: date, periodo: str) -> date:
    """Último día (incluido) del periodo que empieza en `inicio`.

    1 día  → el mismo día.   15 días → 15 días corridos contando el de inicio.
    1 mes  → mes calendario: hasta la víspera de la misma fecha del mes siguiente.
    """
    if periodo == "1_dia":
        return inicio
    if periodo == "15_dias":
        return inicio + timedelta(days=14)
    if periodo == "1_mes":
        return _sumar_meses(inicio, 1) - timedelta(days=1)
    raise ValueError(f"Periodo desconocido: {periodo}")


def inicio_renovacion(ultimo_fin: date | None, hoy: date) -> date:
    """Una renovación empieza el día siguiente al vencimiento si aún está vigente (sin perder ni solapar
    días); si ya venció, empieza hoy."""
    if ultimo_fin is None:
        return hoy
    return max(hoy, ultimo_fin + timedelta(days=1))


def estado_mensualidad(fecha_fin: date, hoy: date, umbral_dias: int = 3) -> EstadoMensualidad:
    """vencida si ya pasó; por_vencer si faltan `umbral_dias` o menos (el último día cuenta); si no, vigente."""
    if hoy > fecha_fin:
        return "vencida"
    if (fecha_fin - hoy).days <= umbral_dias:
        return "por_vencer"
    return "vigente"


def valor_periodo(version, periodo: str) -> Decimal:
    """Precio de la mensualidad para el periodo, tomado de una versión de tarifa."""
    try:
        return getattr(version, _CAMPO_PRECIO[periodo])
    except KeyError:
        raise ValueError(f"Periodo desconocido: {periodo}") from None
