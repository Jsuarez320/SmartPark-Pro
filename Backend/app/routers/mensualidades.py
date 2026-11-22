import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.usuario import Usuario
from app.schemas.mensualidad import (
    EstadoMensualidad,
    MensualidadCrear,
    MensualidadDetalle,
    MensualidadEditar,
    MensualidadOut,
    MensualidadResponse,
    RenovarRequest,
    ResumenMensualidades,
)
from app.services import mensualidad_service as svc

router = APIRouter(prefix="/mensualidades", tags=["mensualidades"])

Usuarios = Annotated[Usuario, Depends(get_current_user)]
DB = Annotated[Session, Depends(get_db)]

# Cualquier usuario autenticado registra, consulta, edita y renueva. Cambiar la PLACA PRINCIPAL
# de una mensualidad exige ser administrador (lo valida el service).


@router.get("", response_model=list[MensualidadOut])
def listar(
    _: Usuarios,
    db: DB,
    estado: EstadoMensualidad | None = Query(default=None, description="Filtra: vigente, por_vencer o vencida"),
    q: str | None = Query(default=None, max_length=50, description="Busca por placa, tarjeta, nombre o celular"),
):
    """Mensualidades con su estado, las más próximas a vencer (o ya vencidas) primero."""
    return svc.listar(db, estado, q.strip() if q else None)


@router.get("/resumen", response_model=ResumenMensualidades)
def resumen(_: Usuarios, db: DB):
    """Contadores de vigentes, por vencer y vencidas (para la alerta de vencimientos)."""
    return svc.resumen(db)


@router.get("/{membresia_id}", response_model=MensualidadDetalle)
def detalle(membresia_id: uuid.UUID, _: Usuarios, db: DB):
    """Datos y todos los periodos pagados (con medio de pago y número de recibo)."""
    return svc.detalle(db, membresia_id)


@router.post("", response_model=MensualidadResponse, status_code=status.HTTP_201_CREATED)
def registrar(body: MensualidadCrear, user: Usuarios, db: DB):
    """Registra la mensualidad y cobra el primer periodo (exige caja abierta y medio de pago)."""
    return svc.crear(db, body, user)


@router.put("/{membresia_id}", response_model=MensualidadOut)
def editar(membresia_id: uuid.UUID, body: MensualidadEditar, user: Usuarios, db: DB):
    """Edición parcial de datos, placas, tarjeta y jornada."""
    return svc.editar(db, membresia_id, body, user)


@router.post("/{membresia_id}/renovar", response_model=MensualidadResponse)
def renovar(membresia_id: uuid.UUID, body: RenovarRequest, user: Usuarios, db: DB):
    """Registra un pago nuevo y extiende la vigencia (exige caja abierta y medio de pago)."""
    return svc.renovar(db, membresia_id, body, user)
