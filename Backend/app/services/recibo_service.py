"""Contenido (snapshot) de los recibos. Constructores PUROS: reciben datos ya resueltos y devuelven el
dict que se guarda en `recibos.contenido`. Lo guardado es lo que se imprime y reimprime: nunca se
recalcula con tarifas o parámetros vigentes en ese momento.

Convenciones: claves en camelCase, dinero en pesos enteros, fechas en ISO 8601 con zona horaria.
"""
from datetime import date, datetime

from app.core.dinero import entero
from app.models.catalogos import TarifaVersion
from app.models.operaciones import Recibo
from app.schemas.recibo import ReciboOut


def snapshot_tarifa(version: TarifaVersion, gracia_minutos: int) -> dict:
    """Precios y reglas con los que se cobra, tal como estaban en ese momento."""
    return {
        "versionId": version.id,
        "valorHora": entero(version.valor_hora),
        "valorDia": entero(version.valor_dia),
        "valorHoraFestivo": entero(version.valor_hora_festivo),
        "valorDiaFestivo": entero(version.valor_dia_festivo),
        "nocturnaActiva": version.nocturna_activa,
        "valorHoraNocturna": None if version.valor_hora_nocturna is None else entero(version.valor_hora_nocturna),
        "graciaMinutos": gracia_minutos,
    }


def contenido_ingreso(
    *,
    placa: str,
    tipo_vehiculo: str,
    hora_entrada: datetime,
    operador: str,
    tarifa: dict | None,
    mensualidad: dict | None,
    aviso: str | None,
) -> dict:
    return {
        "tipo": "ingreso",
        "placa": placa,
        "tipoVehiculo": tipo_vehiculo,
        "horaEntrada": hora_entrada.isoformat(),
        "operador": operador,
        "esMensualidad": mensualidad is not None,
        "mensualidad": mensualidad,
        "tarifa": tarifa,
        "aviso": aviso,
    }


def datos_mensualidad(jornada: str, fecha_fin: date, cliente: str | None) -> dict:
    return {"jornada": jornada, "fechaFin": fecha_fin.isoformat(), "cliente": cliente}


def contenido_pago(
    *,
    placa: str,
    tipo_vehiculo: str,
    hora_entrada: datetime,
    hora_salida: datetime,
    tiquete: int | None,
    operador: str,
    es_mensualidad: bool,
    medio_pago: str | None,
    referencia: str | None,
    total: int,
    minutos_totales: int,
    cobro: dict | None,
    tarifa: dict | None,
) -> dict:
    """`cobro` es `ResultadoCobro.detalle()` (None en la salida de un cliente mensual)."""
    return {
        "tipo": "pago",
        "placa": placa,
        "tipoVehiculo": tipo_vehiculo,
        "horaEntrada": hora_entrada.isoformat(),
        "horaSalida": hora_salida.isoformat(),
        "tiquete": tiquete,
        "operador": operador,
        "esMensualidad": es_mensualidad,
        "medioPago": medio_pago,
        "referencia": referencia,
        "total": total,
        "minutosTotales": minutos_totales,
        "minutosCobrados": 0 if cobro is None else cobro["minutosCobrados"],
        "horasCobradas": 0 if cobro is None else cobro["horasCobradas"],
        "topeAplicado": False if cobro is None else cobro["topeAplicado"],
        "periodos": [] if cobro is None else cobro["periodos"],
        "tarifa": tarifa,
    }


def contenido_mensualidad(
    *,
    placa: str,
    placa_alterna: str | None,
    tipo_vehiculo: str,
    cliente: str,
    celular: str | None,
    tarjeta: str | None,
    periodo: str,
    jornada: str,
    fecha_inicio: date,
    fecha_fin: date,
    valor: int,
    medio_pago: str,
    referencia: str | None,
    operador: str,
    es_renovacion: bool,
    tarifa_version_id: int,
) -> dict:
    return {
        "tipo": "mensualidad",
        "esRenovacion": es_renovacion,
        "placa": placa,
        "placaAlterna": placa_alterna,
        "tipoVehiculo": tipo_vehiculo,
        "cliente": cliente,
        "celular": celular,
        "tarjeta": tarjeta,
        "periodo": periodo,
        "jornada": jornada,
        "fechaInicio": fecha_inicio.isoformat(),
        "fechaFin": fecha_fin.isoformat(),
        "valor": valor,
        "medioPago": medio_pago,
        "referencia": referencia,
        "operador": operador,
        "tarifaVersionId": tarifa_version_id,
    }


def a_recibo_out(r: Recibo) -> ReciboOut:
    return ReciboOut(
        id=str(r.id),
        numero=r.numero,
        tipo=r.tipo,  # type: ignore[arg-type]
        placa=r.placa,
        creado_en=r.created_at,
        reimpresiones=r.reimpresiones,
        ultima_reimpresion=r.ultima_reimpresion,
        contenido=r.contenido,  # type: ignore[arg-type]
    )
