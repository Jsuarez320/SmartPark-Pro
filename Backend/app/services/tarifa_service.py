"""Tarifas versionadas, parámetros de cobro, festivos y simulación de cobro.

Los cambios de precio NUNCA hacen UPDATE: cierran la versión vigente y crean otra, así los
cobros históricos (que guardan `tarifa_version_id` y su snapshot en el recibo) no cambian.
"""
import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.errors import NegocioError, traducir_errores
from app.core.festivos_co import festivos_colombia
from app.models.catalogos import TarifaVersion
from app.repositories import tarifa_repository as repo
from app.schemas.tarifa import (
    ConfiguracionCobroIn,
    ConfiguracionCobroOut,
    FestivoIn,
    FestivoOut,
    PrecargaFestivosOut,
    SimularRequest,
    SimularResponse,
    TarifaIn,
    TarifaOut,
)
from app.services.cobro_service import TZ_COLOMBIA, ParametrosCobro, TarifaCobro, calcular_cobro
from app.services.vigencia import HorarioJornadas

# Defaults si falta la clave en `configuracion` (la migración las siembra; esto es una red de seguridad).
_DEFAULTS = {
    "gracia_minutos": 5,
    "umbral_vencimiento_dias": 3,
    "nocturna_inicio": "19:00",
    "nocturna_fin": "06:00",
    "jornada_manana_inicio": "06:00",
    "jornada_manana_fin": "14:00",
    "jornada_tarde_inicio": "14:00",
    "jornada_tarde_fin": "22:00",
}

_CAMPOS_PRECIO = (
    "valor_hora",
    "valor_dia",
    "valor_hora_festivo",
    "valor_dia_festivo",
    "mensualidad_1_dia",
    "mensualidad_15_dias",
    "mensualidad_1_mes",
)


def _hora(texto: str) -> time:
    h, m = texto.split(":")
    return time(int(h), int(m))


def _int(valor: Decimal | None) -> int | None:
    return None if valor is None else int(valor)


def _tarifa_out(v: TarifaVersion, tipo: str) -> TarifaOut:
    return TarifaOut(
        id=v.id,
        tipo=tipo,  # type: ignore[arg-type]
        valor_hora=int(v.valor_hora),
        valor_dia=int(v.valor_dia),
        valor_hora_festivo=int(v.valor_hora_festivo),
        valor_dia_festivo=int(v.valor_dia_festivo),
        mensualidad_1_dia=int(v.mensualidad_1_dia),
        mensualidad_15_dias=int(v.mensualidad_15_dias),
        mensualidad_1_mes=int(v.mensualidad_1_mes),
        nocturna_activa=v.nocturna_activa,
        valor_hora_nocturna=_int(v.valor_hora_nocturna),
        vigente_desde=v.vigente_desde,
        vigente_hasta=v.vigente_hasta,
    )


def _tipo_o_error(db: Session, nombre: str):
    tipo = repo.obtener_tipo_vehiculo(db, nombre)
    if tipo is None:
        raise NegocioError(404, f"El tipo de vehículo «{nombre}» no existe")
    return tipo


def version_vigente_o_error(db: Session, tipo_vehiculo: str, momento: datetime) -> TarifaVersion:
    """Tarifa en vigor en `momento` para el tipo de vehículo; 422 si no hay."""
    t = repo.obtener_tipo_vehiculo(db, tipo_vehiculo)
    if t is None:
        raise NegocioError(422, f"El tipo de vehículo «{tipo_vehiculo}» no existe")
    version = repo.version_vigente(db, t.id, momento)
    if version is None:
        raise NegocioError(422, f"No hay tarifa configurada para {tipo_vehiculo}. Pídele al administrador que la cargue.")
    return version


def a_tarifa_cobro(v: TarifaVersion) -> TarifaCobro:
    """Convierte una versión de BD al snapshot que usa la función pura de cobro."""
    return TarifaCobro(
        valor_hora=v.valor_hora,
        valor_dia=v.valor_dia,
        valor_hora_festivo=v.valor_hora_festivo,
        valor_dia_festivo=v.valor_dia_festivo,
        nocturna_activa=v.nocturna_activa,
        valor_hora_nocturna=v.valor_hora_nocturna,
    )


# ------------------------------------------------------------------ tarifas
def listar_vigentes(db: Session) -> list[TarifaOut]:
    nombres = {t.id: t.nombre.lower() for t in repo.listar_tipos_vehiculo(db)}
    return [_tarifa_out(v, nombres[v.tipo_vehiculo_id]) for v in repo.listar_versiones_vigentes(db)]


def listar_historial(db: Session, tipo: str, limite: int) -> list[TarifaOut]:
    t = _tipo_o_error(db, tipo)
    return [_tarifa_out(v, t.nombre.lower()) for v in repo.listar_historial(db, t.id, limite)]


def actualizar_tarifa(db: Session, tipo: str, data: TarifaIn, usuario_id: uuid.UUID) -> TarifaOut:
    """Crea una nueva versión vigente. Si los valores no cambian, devuelve la vigente sin crear nada."""
    t = _tipo_o_error(db, tipo)
    nuevos = data.model_dump()

    with traducir_errores(db):
        actual = repo.version_vigente(db, t.id, bloquear=True)

        if actual is not None:
            iguales = all(Decimal(nuevos[c]) == getattr(actual, c) for c in _CAMPOS_PRECIO)
            iguales = (
                iguales
                and nuevos["nocturna_activa"] == actual.nocturna_activa
                and (None if nuevos["valor_hora_nocturna"] is None else Decimal(nuevos["valor_hora_nocturna"]))
                == actual.valor_hora_nocturna
            )
            if iguales:
                return _tarifa_out(actual, t.nombre.lower())
            repo.cerrar_version(db, actual)

        nueva = repo.crear_version(db, tipo_vehiculo_id=t.id, creado_por=usuario_id, **nuevos)
        db.commit()
        db.refresh(nueva)
    return _tarifa_out(nueva, t.nombre.lower())


# ------------------------------------------------------------------ parámetros de cobro
def obtener_configuracion(db: Session) -> ConfiguracionCobroOut:
    valores = {**_DEFAULTS, **repo.obtener_configuracion(db)}
    return ConfiguracionCobroOut(
        gracia_minutos=int(valores["gracia_minutos"]),
        umbral_vencimiento_dias=int(valores["umbral_vencimiento_dias"]),
        nocturna_inicio=str(valores["nocturna_inicio"]),
        nocturna_fin=str(valores["nocturna_fin"]),
        jornada_manana_inicio=str(valores["jornada_manana_inicio"]),
        jornada_manana_fin=str(valores["jornada_manana_fin"]),
        jornada_tarde_inicio=str(valores["jornada_tarde_inicio"]),
        jornada_tarde_fin=str(valores["jornada_tarde_fin"]),
    )


def actualizar_configuracion(
    db: Session, data: ConfiguracionCobroIn, usuario_id: uuid.UUID
) -> ConfiguracionCobroOut:
    cambios = data.model_dump(exclude_none=True)
    if not cambios:
        raise NegocioError(422, "No hay ningún valor para actualizar")

    final = {**obtener_configuracion(db).model_dump(), **cambios}
    if final["nocturna_inicio"] == final["nocturna_fin"]:
        raise NegocioError(422, "El inicio y el fin de la franja nocturna no pueden ser iguales")
    for jornada in ("manana", "tarde"):
        if _hora(final[f"jornada_{jornada}_inicio"]) >= _hora(final[f"jornada_{jornada}_fin"]):
            raise NegocioError(422, f"La jornada de {'mañana' if jornada == 'manana' else 'tarde'} debe terminar después de empezar")

    for clave, valor in cambios.items():
        repo.guardar_configuracion(db, clave, valor, usuario_id)
    db.commit()
    return obtener_configuracion(db)


def parametros_cobro(db: Session, desde: date, hasta: date) -> ParametrosCobro:
    """Parámetros para `calcular_cobro` con los festivos del rango [desde, hasta]."""
    cfg = obtener_configuracion(db)
    festivos = frozenset(f.fecha for f in repo.listar_festivos(db, desde, hasta))
    return ParametrosCobro(
        gracia_minutos=cfg.gracia_minutos,
        nocturna_inicio=_hora(cfg.nocturna_inicio),
        nocturna_fin=_hora(cfg.nocturna_fin),
        festivos=festivos,
    )


def horario_jornadas(db: Session) -> HorarioJornadas:
    cfg = obtener_configuracion(db)
    return HorarioJornadas(
        manana_inicio=_hora(cfg.jornada_manana_inicio),
        manana_fin=_hora(cfg.jornada_manana_fin),
        tarde_inicio=_hora(cfg.jornada_tarde_inicio),
        tarde_fin=_hora(cfg.jornada_tarde_fin),
    )


# ------------------------------------------------------------------ festivos
def listar_festivos(db: Session, anio: int) -> list[FestivoOut]:
    filas = repo.listar_festivos(db, date(anio, 1, 1), date(anio, 12, 31))
    return [FestivoOut(fecha=f.fecha, nombre=f.nombre) for f in filas]


def agregar_festivo(db: Session, data: FestivoIn) -> FestivoOut:
    with traducir_errores(db):
        if repo.obtener_festivo(db, data.fecha) is not None:
            raise NegocioError(409, f"El {data.fecha.isoformat()} ya es festivo")
        f = repo.agregar_festivo(db, data.fecha, data.nombre)
        db.commit()
    return FestivoOut(fecha=f.fecha, nombre=f.nombre)


def eliminar_festivo(db: Session, fecha: date) -> None:
    if repo.eliminar_festivo(db, fecha) == 0:
        db.rollback()
        raise NegocioError(404, f"El {fecha.isoformat()} no está en la lista de festivos")
    db.commit()


def precargar_festivos(db: Session, anio: int) -> PrecargaFestivosOut:
    """Agrega los festivos oficiales del año que aún no estén (no pisa los que el admin ya editó)."""
    agregados = existentes = 0
    with traducir_errores(db):
        for fecha, nombre in festivos_colombia(anio).items():
            if repo.obtener_festivo(db, fecha) is not None:
                existentes += 1
            else:
                repo.agregar_festivo(db, fecha, nombre)
                agregados += 1
        db.commit()
    return PrecargaFestivosOut(anio=anio, agregados=agregados, existentes=existentes)


# ------------------------------------------------------------------ simulación
def simular(db: Session, data: SimularRequest, ahora: datetime) -> SimularResponse:
    """Calcula cuánto se cobraría por una estadía con la tarifa vigente en la hora de salida."""
    salida = data.salida or ahora
    if salida < data.entrada:
        raise NegocioError(422, "La salida no puede ser anterior a la entrada")

    t = _tipo_o_error(db, data.tipo)
    version = repo.version_vigente(db, t.id, salida)
    if version is None:
        raise NegocioError(422, f"No hay tarifa configurada para {data.tipo} en esa fecha")

    dia_entrada = data.entrada.astimezone(TZ_COLOMBIA).date()
    dia_salida = salida.astimezone(TZ_COLOMBIA).date()
    # Margen de un día a cada lado: la franja se evalúa por la hora de inicio de cada hora cobrada.
    parametros = parametros_cobro(db, dia_entrada - timedelta(days=1), dia_salida + timedelta(days=1))

    r = calcular_cobro(data.entrada, salida, a_tarifa_cobro(version), parametros)
    # `detalle()` ya trae las claves en camelCase, igual que los alias del schema.
    return SimularResponse.model_validate({**r.detalle(), "tarifaId": version.id})
