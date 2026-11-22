import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import Usuario
from app.schemas.caja import (
    AbrirTurnoRequest,
    CerrarTurnoRequest,
    Desglose,
    Periodo,
    ResumenTurno,
    Transaccion,
)
from app.services import caja_service as svc

router = APIRouter(prefix="/caja", tags=["caja"])

Usuarios = Annotated[Usuario, Depends(get_current_user)]
Admin = Annotated[Usuario, Depends(require_role("admin"))]
DB = Annotated[Session, Depends(get_db)]


# Abrir / cerrar / consultar la caja: cualquier usuario autenticado (admin o empleado)
@router.get("/turno", response_model=ResumenTurno | None)
def turno(_: Usuarios, db: DB):
    """Caja abierta con su resumen en vivo (null si no hay ninguna)."""
    return svc.turno_actual(db)


@router.post("/turno/abrir", response_model=ResumenTurno, status_code=status.HTTP_201_CREATED)
def abrir(body: AbrirTurnoRequest, user: Usuarios, db: DB):
    return svc.abrir_turno(db, body, user.id)


@router.post("/turno/cerrar", response_model=ResumenTurno)
def cerrar(body: CerrarTurnoRequest, user: Usuarios, db: DB):
    """Cierra la caja y devuelve el resumen del día (también queda guardado como recibo de cierre)."""
    return svc.cerrar_turno(db, body, user.id)


@router.get("/turnos/{turno_id}", response_model=ResumenTurno)
def detalle_turno(turno_id: uuid.UUID, _: Usuarios, db: DB):
    return svc.obtener_turno(db, turno_id)


# Historial y reportes: solo admin
@router.get("/turnos", response_model=list[ResumenTurno])
def historial(_: Admin, db: DB, limit: int = Query(default=20, ge=1, le=200)):
    return svc.historial_turnos(db, limit)


@router.get("/ingresos", response_model=Desglose)
def ingresos(_: Admin, db: DB, periodo: Periodo = "Día"):
    return svc.ingresos_periodo(db, periodo)


@router.get("/transacciones", response_model=list[Transaccion])
def transacciones(_: Admin, db: DB, periodo: Periodo = "Día", limit: int = Query(default=100, ge=1, le=500)):
    return svc.transacciones_periodo(db, periodo, limit)
