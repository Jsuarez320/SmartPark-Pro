from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rate_limit import limiter, LOGIN_RATE_LIMIT
from app.schemas.auth import (
    LogoutRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
    Token,
)
from app.services.auth_service import (
    autenticar_usuario,
    renovar_refresh_token,
    revocar_refresh_token,
)

# TEMPORAL — solo para validar Fase 1, borrar después de probar
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
@limiter.limit(LOGIN_RATE_LIMIT)
def login(
    request: Request,
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
        refresh_token=result.refresh_token,
        user_id=result.user_id,
        nombre=result.nombre,
        es_admin=result.es_admin,
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    result = renovar_refresh_token(db, body.refresh_token)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido, expirado o revocado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return RefreshTokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        user_id=result.user_id,
        nombre=result.nombre,
        es_admin=result.es_admin,
    )


@router.post("/logout")
def logout(body: LogoutRequest, db: Session = Depends(get_db)):
    revocar_refresh_token(db, body.refresh_token)
    return {"msg": "Sesión cerrada"}
