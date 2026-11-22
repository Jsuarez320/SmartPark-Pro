import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import Usuario
from app.schemas.recibo import ReciboOut, ReciboResumen, ReimpresionOut, TipoRecibo
from app.services import recibo_consulta_service as svc

router = APIRouter(prefix="/recibos", tags=["recibos"])

Usuarios = Annotated[Usuario, Depends(get_current_user)]
Admin = Annotated[Usuario, Depends(require_role("admin"))]
DB = Annotated[Session, Depends(get_db)]

# Buscar, ver y reimprimir: cualquier usuario autenticado. Cada reimpresión queda registrada
# (quién y cuándo) y solo el administrador consulta ese historial.


@router.get("", response_model=list[ReciboResumen])
def buscar(
    _: Usuarios,
    db: DB,
    numero: int | None = Query(default=None, ge=1, description="Número de recibo (exacto)"),
    placa: str | None = Query(default=None, max_length=12, description="Placa o parte de ella"),
    tipo: TipoRecibo | None = None,
    fecha: date | None = Query(default=None, description="Un solo día (hora de Colombia)"),
    desde: date | None = Query(default=None, description="Desde este día, incluido"),
    hasta: date | None = Query(default=None, description="Hasta este día, incluido"),
    ingreso_id: uuid.UUID | None = Query(default=None, alias="ingresoId"),
    salida_id: uuid.UUID | None = Query(default=None, alias="salidaId", description="Recibo de pago de esa salida"),
    membresia_id: uuid.UUID | None = Query(default=None, alias="membresiaId"),
    turno_id: uuid.UUID | None = Query(default=None, alias="turnoId", description="Recibo de cierre de ese turno"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Recibos anteriores, los más recientes primero. Los filtros se combinan."""
    return svc.buscar(
        db, numero=numero, placa=placa, tipo=tipo, fecha=fecha, desde=desde, hasta=hasta,
        ingreso_id=ingreso_id, salida_id=salida_id, membresia_id=membresia_id, turno_id=turno_id,
        limite=limit, offset=offset,
    )


@router.get("/{recibo_id}", response_model=ReciboOut)
def detalle(recibo_id: uuid.UUID, _: Usuarios, db: DB):
    """El recibo con su contenido guardado (lo que se imprime)."""
    return svc.obtener(db, recibo_id)


@router.post("/{recibo_id}/reimprimir", response_model=ReciboOut)
def reimprimir(recibo_id: uuid.UUID, user: Usuarios, db: DB):
    """Devuelve el contenido guardado para imprimirlo como COPIA y registra la reimpresión.
    No recalcula nada ni crea un recibo nuevo."""
    return svc.reimprimir(db, recibo_id, user)


@router.get("/{recibo_id}/reimpresiones", response_model=list[ReimpresionOut])
def reimpresiones(recibo_id: uuid.UUID, _: Admin, db: DB):
    """Quién reimprimió el recibo y cuándo (solo administrador)."""
    return svc.historial_reimpresiones(db, recibo_id)
