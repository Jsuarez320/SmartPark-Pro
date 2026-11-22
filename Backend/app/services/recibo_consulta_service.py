"""Buscador de recibos y reimpresión.

Regla central: la reimpresión devuelve el `contenido` GUARDADO. Nunca se recalcula con las tarifas,
la configuración o los datos del cliente vigentes en ese momento (y un trigger de la BD impide
modificar un recibo guardado). Reimprimir no crea un recibo nuevo: cuenta la copia y registra quién
la sacó; el ticket impreso debe decir COPIA cuando `reimpresiones > 0`.
"""
import re
import uuid
from datetime import date, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.core.errors import NegocioError, traducir_errores
from app.models.operaciones import Recibo
from app.models.usuario import Usuario
from app.repositories import recibo_repository as repo
from app.schemas.recibo import ReciboOut, ReciboResumen, ReimpresionOut
from app.services.cobro_service import TZ_COLOMBIA
from app.services.recibo_service import a_recibo_out


# ------------------------------------------------------------------ helpers puros
def normalizar_placa_busqueda(texto: str | None) -> str | None:
    """Mayúsculas y sin espacios ni guiones ("abc-1" → "ABC1"). Acepta fragmentos de cualquier largo."""
    limpio = re.sub(r"[\s\-]+", "", texto or "").upper()
    return limpio or None


def rango_fechas(
    fecha: date | None, desde: date | None, hasta: date | None
) -> tuple[datetime | None, datetime | None]:
    """Fechas locales (Colombia) → instantes [inicio, fin). `fecha` es un solo día; `desde`/`hasta` incluyen ambos días."""
    if fecha is not None:
        if desde is not None or hasta is not None:
            raise ValueError("Usa «fecha» o el rango «desde/hasta», no ambos")
        desde = hasta = fecha
    if desde is not None and hasta is not None and desde > hasta:
        raise ValueError("«desde» no puede ser posterior a «hasta»")
    inicio = None if desde is None else datetime.combine(desde, time.min, tzinfo=TZ_COLOMBIA)
    fin = None if hasta is None else datetime.combine(hasta + timedelta(days=1), time.min, tzinfo=TZ_COLOMBIA)
    return inicio, fin


def resumen_de(r: Recibo) -> ReciboResumen:
    """Fila del buscador, leída del snapshot guardado."""
    c: dict = r.contenido  # type: ignore[assignment]
    total = {"pago": c.get("total"), "mensualidad": c.get("valor"), "cierre_caja": c.get("totalRecaudado")}.get(r.tipo)
    return ReciboResumen(
        id=str(r.id),
        numero=r.numero,
        tipo=r.tipo,  # type: ignore[arg-type]
        placa=r.placa,
        creado_en=r.created_at,
        reimpresiones=r.reimpresiones,
        total=total,
        medio_pago=c.get("medioPago") if r.tipo in ("pago", "mensualidad") else None,
        operador=c.get("cerradoPor") if r.tipo == "cierre_caja" else c.get("operador"),
    )


# ------------------------------------------------------------------ casos de uso
def buscar(
    db: Session,
    *,
    numero: int | None,
    placa: str | None,
    tipo: str | None,
    fecha: date | None,
    desde: date | None,
    hasta: date | None,
    ingreso_id: uuid.UUID | None,
    salida_id: uuid.UUID | None,
    membresia_id: uuid.UUID | None,
    turno_id: uuid.UUID | None,
    limite: int,
    offset: int,
) -> list[ReciboResumen]:
    try:
        inicio, fin = rango_fechas(fecha, desde, hasta)
    except ValueError as exc:
        raise NegocioError(422, str(exc)) from exc
    recibos = repo.buscar(
        db, numero=numero, placa=normalizar_placa_busqueda(placa), tipo=tipo, desde=inicio, hasta=fin,
        ingreso_id=ingreso_id, salida_id=salida_id, membresia_id=membresia_id, turno_id=turno_id,
        limite=limite, offset=offset,
    )
    return [resumen_de(r) for r in recibos]


def obtener(db: Session, recibo_id: uuid.UUID) -> ReciboOut:
    recibo = repo.obtener(db, recibo_id)
    if recibo is None:
        raise NegocioError(404, "El recibo no existe")
    return a_recibo_out(recibo)


def reimprimir(db: Session, recibo_id: uuid.UUID, usuario: Usuario) -> ReciboOut:
    """Devuelve el recibo guardado, tal cual, para imprimirlo como copia."""
    with traducir_errores(db):
        recibo = repo.obtener(db, recibo_id, bloquear=True)
        if recibo is None:
            raise NegocioError(404, "El recibo no existe")
        repo.registrar_reimpresion(db, recibo, usuario.id)
        respuesta = a_recibo_out(recibo)
        db.commit()
    return respuesta


def historial_reimpresiones(db: Session, recibo_id: uuid.UUID) -> list[ReimpresionOut]:
    if repo.obtener(db, recibo_id) is None:
        raise NegocioError(404, "El recibo no existe")
    return [ReimpresionOut(usuario=u, fecha=f) for u, f in repo.listar_reimpresiones(db, recibo_id)]
