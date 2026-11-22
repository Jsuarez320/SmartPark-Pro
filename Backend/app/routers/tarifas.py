from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.usuario import Usuario
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
from app.schemas.vehiculo import TipoVehiculo
from app.services import tarifa_service as svc

router = APIRouter(prefix="/tarifas", tags=["tarifas"])

Usuarios = Annotated[Usuario, Depends(get_current_user)]
Admin = Annotated[Usuario, Depends(require_role("admin"))]
DB = Annotated[Session, Depends(get_db)]

# Lectura: cualquier usuario autenticado (el empleado necesita ver precios y festivos).
# Escritura: solo admin.


# ---------------------------------------------------------------- tarifas
@router.get("/vigentes", response_model=list[TarifaOut])
def vigentes(_: Usuarios, db: DB):
    return svc.listar_vigentes(db)


@router.put("/vigentes/{tipo}", response_model=TarifaOut)
def actualizar(tipo: TipoVehiculo, body: TarifaIn, user: Admin, db: DB):
    """Guarda los precios como una NUEVA versión (la anterior se cierra, no se modifica)."""
    return svc.actualizar_tarifa(db, tipo, body, user.id)


@router.get("/historial/{tipo}", response_model=list[TarifaOut])
def historial(tipo: TipoVehiculo, _: Admin, db: DB, limit: int = Query(default=50, ge=1, le=200)):
    return svc.listar_historial(db, tipo, limit)


# ---------------------------------------------------------------- parámetros de cobro
@router.get("/configuracion", response_model=ConfiguracionCobroOut)
def configuracion(_: Usuarios, db: DB):
    return svc.obtener_configuracion(db)


@router.put("/configuracion", response_model=ConfiguracionCobroOut)
def actualizar_configuracion(body: ConfiguracionCobroIn, user: Admin, db: DB):
    return svc.actualizar_configuracion(db, body, user.id)


# ---------------------------------------------------------------- festivos
@router.get("/festivos", response_model=list[FestivoOut])
def festivos(_: Usuarios, db: DB, anio: int = Query(default_factory=lambda: date.today().year, ge=2000, le=2100)):
    return svc.listar_festivos(db, anio)


@router.post("/festivos", response_model=FestivoOut, status_code=status.HTTP_201_CREATED)
def agregar_festivo(body: FestivoIn, _: Admin, db: DB):
    return svc.agregar_festivo(db, body)


@router.delete("/festivos/{fecha}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_festivo(fecha: date, _: Admin, db: DB):
    svc.eliminar_festivo(db, fecha)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/festivos/precargar/{anio}", response_model=PrecargaFestivosOut)
def precargar_festivos(anio: Annotated[int, Path(ge=2000, le=2100)], _: Admin, db: DB):
    """Agrega los festivos oficiales de Colombia del año que aún no estén en la lista."""
    return svc.precargar_festivos(db, anio)


# ---------------------------------------------------------------- simulación
@router.post("/simular", response_model=SimularResponse)
def simular(body: SimularRequest, _: Usuarios, db: DB):
    """Cuánto se cobraría por una estadía. La hora de salida por defecto es la del servidor."""
    return svc.simular(db, body, datetime.now(timezone.utc))
