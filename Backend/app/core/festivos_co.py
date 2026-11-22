"""Festivos de Colombia (Ley Emiliani) calculados por año. Función pura.

La migración g2c8e4b05d16 trae una copia congelada de este algoritmo para su seed
(una migración no debe depender del código de la app); un test verifica que coinciden.
"""
from datetime import date, timedelta


def pascua(anio: int) -> date:
    """Domingo de Pascua (algoritmo gregoriano anónimo)."""
    a, b, c = anio % 19, anio // 100, anio % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    ele = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * ele) // 451
    mes = (h + ele - 7 * m + 114) // 31
    dia = (h + ele - 7 * m + 114) % 31 + 1
    return date(anio, mes, dia)


def _lunes(d: date) -> date:
    """Lunes siguiente (o el mismo día si ya es lunes): regla de traslado de la Ley Emiliani."""
    return d + timedelta(days=(7 - d.weekday()) % 7)


def festivos_colombia(anio: int) -> dict[date, str]:
    """{fecha: nombre}. Si dos festivos caen el mismo día, el nombre une ambos con " / "."""
    p = pascua(anio)
    lista = [
        (date(anio, 1, 1), "Año Nuevo"),
        (_lunes(date(anio, 1, 6)), "Reyes Magos"),
        (_lunes(date(anio, 3, 19)), "San José"),
        (p - timedelta(days=3), "Jueves Santo"),
        (p - timedelta(days=2), "Viernes Santo"),
        (date(anio, 5, 1), "Día del Trabajo"),
        (_lunes(p + timedelta(days=39)), "Ascensión del Señor"),
        (_lunes(p + timedelta(days=60)), "Corpus Christi"),
        (_lunes(p + timedelta(days=68)), "Sagrado Corazón"),
        (_lunes(date(anio, 6, 29)), "San Pedro y San Pablo"),
        (date(anio, 7, 20), "Día de la Independencia"),
        (date(anio, 8, 7), "Batalla de Boyacá"),
        (_lunes(date(anio, 8, 15)), "Asunción de la Virgen"),
        (_lunes(date(anio, 10, 12)), "Día de la Raza"),
        (_lunes(date(anio, 11, 1)), "Todos los Santos"),
        (_lunes(date(anio, 11, 11)), "Independencia de Cartagena"),
        (date(anio, 12, 8), "Inmaculada Concepción"),
        (date(anio, 12, 25), "Navidad"),
    ]
    resultado: dict[date, str] = {}
    for fecha, nombre in sorted(lista):
        resultado[fecha] = f"{resultado[fecha]} / {nombre}" if fecha in resultado else nombre
    return resultado
