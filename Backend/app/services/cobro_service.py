"""Cálculo del cobro por horas. FUNCIONES PURAS: sin base de datos, sin reloj, sin HTTP.

Reglas (defaults aprobados en la auditoría; los parámetros salen de `configuracion`):

1. Gracia: si la estadía dura `gracia_minutos` o menos, no se cobra nada.
2. Fracciones: pasada la gracia, toda hora iniciada se cobra completa (desde el minuto 1).
   La gracia se aplica una sola vez sobre la estadía total, no en cada hora.
3. Tarifa de cada hora = la de la franja donde CAE EL INSTANTE EN QUE LA HORA EMPIEZA
   (contada desde la entrada). Así una estadía que cruza franjas se cobra por tramos.
   Prioridad de franjas:  domingo/festivo  >  nocturna (si está activa)  >  normal.
4. Tope diario: la estadía se parte en periodos consecutivos de 24 h contados desde la entrada.
   Cada periodo cobra como máximo el valor del día (`valor_dia`, o `valor_dia_festivo` si el
   periodo empieza en domingo/festivo).
5. Dinero en `Decimal`; las fechas deben traer zona horaria. La hora local es la de Colombia.
"""
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from math import ceil
from zoneinfo import ZoneInfo

TZ_COLOMBIA = ZoneInfo("America/Bogota")

NORMAL = "normal"
NOCTURNA = "nocturna"
FESTIVO = "festivo"  # domingo o festivo

_UN_DIA = timedelta(hours=24)
_UNA_HORA = timedelta(hours=1)


@dataclass(frozen=True)
class TarifaCobro:
    """Snapshot de una `TarifaVersion` con lo que necesita el cálculo."""

    valor_hora: Decimal
    valor_dia: Decimal
    valor_hora_festivo: Decimal
    valor_dia_festivo: Decimal
    nocturna_activa: bool = False
    valor_hora_nocturna: Decimal | None = None


@dataclass(frozen=True)
class ParametrosCobro:
    gracia_minutos: int = 5
    nocturna_inicio: time = time(19, 0)
    nocturna_fin: time = time(6, 0)
    festivos: frozenset[date] = frozenset()


@dataclass(frozen=True)
class TramoCobro:
    """Horas cobradas con una misma tarifa dentro de un periodo."""

    tipo: str  # normal | nocturna | festivo
    horas: int
    valor_hora: Decimal
    subtotal: Decimal


@dataclass(frozen=True)
class PeriodoCobro:
    """Un periodo de hasta 24 h contado desde la entrada."""

    inicio: datetime
    fin: datetime
    tramos: tuple[TramoCobro, ...]
    subtotal: Decimal  # suma de tramos, antes del tope
    tope: Decimal  # valor del día aplicable
    total: Decimal  # min(subtotal, tope)
    tope_aplicado: bool


@dataclass(frozen=True)
class ResultadoCobro:
    minutos_totales: int
    minutos_cobrados: int
    horas_cobradas: int
    total: Decimal
    tope_aplicado: bool
    periodos: tuple[PeriodoCobro, ...]

    def detalle(self) -> dict:
        """Desglose serializable a JSON (se guarda en salidas.detalle_cobro y en el recibo)."""
        return {
            "minutosTotales": self.minutos_totales,
            "minutosCobrados": self.minutos_cobrados,
            "horasCobradas": self.horas_cobradas,
            "total": _pesos(self.total),
            "topeAplicado": self.tope_aplicado,
            "periodos": [
                {
                    "inicio": p.inicio.isoformat(),
                    "fin": p.fin.isoformat(),
                    "subtotal": _pesos(p.subtotal),
                    "tope": _pesos(p.tope),
                    "total": _pesos(p.total),
                    "topeAplicado": p.tope_aplicado,
                    "tramos": [
                        {
                            "tipo": t.tipo,
                            "horas": t.horas,
                            "valorHora": _pesos(t.valor_hora),
                            "subtotal": _pesos(t.subtotal),
                        }
                        for t in p.tramos
                    ],
                }
                for p in self.periodos
            ],
        }


def _pesos(valor: Decimal) -> int:
    return int(valor)


def es_domingo_o_festivo(dia: date, festivos: frozenset[date] | set[date]) -> bool:
    return dia.weekday() == 6 or dia in festivos


def _en_franja_nocturna(hora: time, inicio: time, fin: time) -> bool:
    if inicio == fin:
        return False
    if inicio > fin:  # cruza la medianoche (ej. 19:00 → 06:00)
        return hora >= inicio or hora < fin
    return inicio <= hora < fin


def franja_de(instante: datetime, tarifa: TarifaCobro, parametros: ParametrosCobro) -> str:
    """Franja tarifaria de un instante (en hora de Colombia)."""
    local = instante.astimezone(TZ_COLOMBIA)
    if es_domingo_o_festivo(local.date(), parametros.festivos):
        return FESTIVO
    if tarifa.nocturna_activa and _en_franja_nocturna(
        local.time(), parametros.nocturna_inicio, parametros.nocturna_fin
    ):
        return NOCTURNA
    return NORMAL


def _valor_hora(franja: str, tarifa: TarifaCobro) -> Decimal:
    if franja == FESTIVO:
        return tarifa.valor_hora_festivo
    if franja == NOCTURNA:
        return tarifa.valor_hora_nocturna  # type: ignore[return-value]  # validado en calcular_cobro
    return tarifa.valor_hora


def calcular_cobro(
    entrada: datetime,
    salida: datetime,
    tarifa: TarifaCobro,
    parametros: ParametrosCobro = ParametrosCobro(),
) -> ResultadoCobro:
    """Cobro de una estadía por horas. Ver las reglas en la cabecera del módulo."""
    if entrada.tzinfo is None or salida.tzinfo is None:
        raise ValueError("Las fechas deben incluir zona horaria")
    if salida < entrada:
        raise ValueError("La salida no puede ser anterior a la entrada")
    if tarifa.nocturna_activa and tarifa.valor_hora_nocturna is None:
        raise ValueError("La tarifa nocturna está activa pero no tiene valor")

    segundos = (salida - entrada).total_seconds()
    minutos_totales = int(segundos // 60)

    if segundos <= parametros.gracia_minutos * 60:
        return ResultadoCobro(minutos_totales, 0, 0, Decimal(0), False, ())

    horas = ceil(segundos / 3600)
    periodos: list[PeriodoCobro] = []

    for n in range(ceil(horas / 24)):
        inicio = entrada + n * _UN_DIA
        horas_periodo = min(24, horas - n * 24)

        horas_por_franja: dict[str, int] = {}
        for h in range(horas_periodo):
            franja = franja_de(inicio + h * _UNA_HORA, tarifa, parametros)
            horas_por_franja[franja] = horas_por_franja.get(franja, 0) + 1

        tramos = tuple(
            TramoCobro(f, cant, _valor_hora(f, tarifa), cant * _valor_hora(f, tarifa))
            for f, cant in horas_por_franja.items()
        )
        subtotal = sum((t.subtotal for t in tramos), Decimal(0))
        festivo_al_inicio = franja_de_dia_festivo(inicio, parametros)
        tope = tarifa.valor_dia_festivo if festivo_al_inicio else tarifa.valor_dia
        periodos.append(
            PeriodoCobro(
                inicio=inicio,
                fin=min(salida, inicio + _UN_DIA),
                tramos=tramos,
                subtotal=subtotal,
                tope=tope,
                total=min(subtotal, tope),
                tope_aplicado=subtotal > tope,
            )
        )

    return ResultadoCobro(
        minutos_totales=minutos_totales,
        minutos_cobrados=horas * 60,
        horas_cobradas=horas,
        total=sum((p.total for p in periodos), Decimal(0)),
        tope_aplicado=any(p.tope_aplicado for p in periodos),
        periodos=tuple(periodos),
    )


def franja_de_dia_festivo(instante: datetime, parametros: ParametrosCobro) -> bool:
    """¿El instante cae en domingo o festivo (hora de Colombia)?"""
    return es_domingo_o_festivo(instante.astimezone(TZ_COLOMBIA).date(), parametros.festivos)
