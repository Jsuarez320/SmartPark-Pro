from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.usuario import Usuario
from app.schemas.membresia import MembresiaRequest, MembresiaResponse
from app.services.membresia_service import contratar_membresia

router = APIRouter(prefix="/membresias", tags=["membresias"])


@router.post("", response_model=MembresiaResponse, status_code=status.HTTP_201_CREATED)
def contratar(
    body: MembresiaRequest,
    user: Annotated[Usuario, Depends(require_role("admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    return contratar_membresia(db, body, user.id)
