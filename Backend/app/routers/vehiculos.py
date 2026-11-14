import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import Usuario
from app.schemas.vehiculo import (
    ConsultaResponse,
    EntradaRequest,
    EntradaResponse,
    MensualOut,
    PatioItem,
    PrecioRequest,
    PrecioResponse,
    SalidaRequest,
    SalidaResponse,
    StatsOut,
    VehiculoOut,
    normalizar_placa,
)
from app.services import vehiculo_service as svc

router = APIRouter(prefix="/vehiculos", tags=["vehiculos"])

Usuarios = Annotated[Usuario, Depends(get_current_user)]
Admin = Annotated[Usuario, Depends(require_role("admin"))]
DB = Annotated[Session, Depends(get_db)]


@router.post("/calcular-precio", response_model=PrecioResponse)
def calcular_precio(body: PrecioRequest, _: Usuarios, db: DB):
    return svc.calcular_precio(db, body)


@router.get("/consulta/{placa}", response_model=ConsultaResponse)
def consulta(placa: str, _: Usuarios, db: DB):
    try:
        placa = normalizar_placa(placa)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    return svc.consultar_placa(db, placa)


@router.post("/entrada", response_model=EntradaResponse, status_code=status.HTTP_201_CREATED)
def entrada(body: EntradaRequest, user: Usuarios, db: DB):
    return svc.registrar_entrada(db, body, user.id)


@router.get("/patio", response_model=list[PatioItem])
def patio(_: Usuarios, db: DB, q: str | None = Query(default=None, max_length=32)):
    return svc.listar_patio(db, q.strip() if q else None)


@router.get("/patio/{ingreso_id}", response_model=PatioItem)
def patio_item(ingreso_id: uuid.UUID, _: Usuarios, db: DB):
    return svc.obtener_patio(db, ingreso_id)


@router.post("/salida", response_model=SalidaResponse)
def salida(body: SalidaRequest, user: Usuarios, db: DB):
    return svc.registrar_salida(db, body, user.id)


@router.get("", response_model=list[VehiculoOut])
def listar(_: Admin, db: DB, placa: str | None = Query(default=None, max_length=10)):
    return svc.listar_vehiculos(db, placa.strip().upper() if placa else None)


@router.get("/mensuales", response_model=list[MensualOut])
def mensuales(_: Admin, db: DB):
    return svc.listar_mensuales(db)


@router.get("/stats", response_model=StatsOut)
def stats(_: Admin, db: DB):
    return svc.estadisticas(db)
