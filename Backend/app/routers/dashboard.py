from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_role
from app.models.usuario import Usuario
from app.schemas.dashboard import DashboardOut
from app.services.dashboard_service import obtener_dashboard

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def dashboard(
    _: Annotated[Usuario, Depends(require_role("admin"))],
    db: Annotated[Session, Depends(get_db)],
):
    return obtener_dashboard(db)
