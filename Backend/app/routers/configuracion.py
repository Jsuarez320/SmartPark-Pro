from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.usuario import Usuario
from app.schemas.configuracion import ActualizarTarifasRequest, ConfiguracionOut
from app.services import configuracion_service as svc

router = APIRouter(prefix="/configuracion", tags=["configuracion"])

Admin = Annotated[Usuario, Depends(require_role("admin"))]
DB = Annotated[Session, Depends(get_db)]


@router.get("", response_model=ConfiguracionOut)
def obtener(_: Admin, db: DB):
    return svc.obtener_configuracion(db)


@router.put("/tarifas", response_model=ConfiguracionOut)
def actualizar_tarifas(body: ActualizarTarifasRequest, user: Admin, db: DB):
    return svc.actualizar_tarifas(db, body, user.id)
