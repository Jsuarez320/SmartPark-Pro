from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import Token
from app.services.auth_service import autenticar_usuario

# TEMPORAL — solo para validar Fase 1, borrar después de probar
from typing import Annotated
from fastapi import Depends
from app.core.deps import get_current_user, require_role
from app.models.usuario import Usuario

router = APIRouter(prefix="/auth", tags=["auth"])

# TEMPORAL ---> Borrar despues del test
@router.get("/me")
def read_current_user(current_user: Annotated[Usuario, Depends(get_current_user)]):
    return {"username": current_user.username, "es_admin": current_user.es_admin}

@router.get("/me-admin")
def read_current_user_admin(current_user: Annotated[Usuario, Depends(require_role("admin"))]):
    return {"msg": "sos admin", "username": current_user.username}


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    result = autenticar_usuario(db, form_data.username, form_data.password)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(
        access_token=result.access_token,
        user_id=result.user_id,
        nombre=result.nombre,
        es_admin=result.es_admin,
    )
