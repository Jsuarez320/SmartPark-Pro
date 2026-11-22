from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.usuario import Usuario
from app.schemas.operacion import PatioItem, RegistrarRequest, RegistrarResponse
from app.services import operacion_service as svc

router = APIRouter(prefix="/operaciones", tags=["operaciones"])

Usuarios = Annotated[Usuario, Depends(get_current_user)]
DB = Annotated[Session, Depends(get_db)]


@router.post("/registrar", response_model=RegistrarResponse)
def registrar(body: RegistrarRequest, response: Response, user: Usuarios, db: DB):
    """Entrada y salida en un solo endpoint: el sistema decide según la placa.

    - Placa sin ingreso activo → ENTRADA (201): guarda la hora del servidor y el recibo de ingreso.
    - Placa con ingreso activo → SALIDA: calcula el cobro. Si hay valor y falta `medioPago`, responde
      `registrado: false, requierePago: true` SIN guardar nada; se vuelve a enviar con `medioPago`
      (y `totalConfirmado` para detectar que el valor cambió). Con medio de pago, guarda salida,
      pago, movimiento de caja y recibo en una sola transacción.
    """
    resultado = svc.registrar(db, body, user)
    if resultado.tipo == "entrada":
        response.status_code = status.HTTP_201_CREATED
    return resultado


@router.get("/patio", response_model=list[PatioItem])
def patio(_: Usuarios, db: DB, q: str | None = Query(default=None, max_length=32)):
    """Vehículos dentro del parqueadero con lo que se cobraría si salieran ahora."""
    return svc.listar_patio(db, q.strip() if q else None)
