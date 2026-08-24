from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    crear_access_token,
    generar_refresh_token,
    hash_refresh_token,
    verificar_password,
)
from app.models.refresh_token import RefreshToken
from app.models.usuario import Usuario
from app.repositories.user_repository import obtener_username


@dataclass
class AuthResult:
    access_token: str
    refresh_token: str
    user_id: str
    nombre: str
    es_admin: bool


def _emitir_refresh_token(db: Session, user_id) -> str:
    raw = generar_refresh_token()
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_refresh_token(raw),
            expires_at=datetime.now(timezone.utc)
            + timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS),
        )
    )
    db.commit()
    return raw


def autenticar_usuario(db: Session, username: str, password: str) -> AuthResult | None:
    usuario = obtener_username(db, username)
    if not usuario:
        return None
    if not verificar_password(password, usuario.password_hash):
        return None
    if not usuario.activo:
        return None
    access = crear_access_token(user_id=str(usuario.id), es_admin=usuario.es_admin)
    refresh = _emitir_refresh_token(db, usuario.id)
    return AuthResult(
        access_token=access,
        refresh_token=refresh,
        user_id=str(usuario.id),
        nombre=usuario.nombre,
        es_admin=usuario.es_admin,
    )


def renovar_refresh_token(db: Session, raw_token: str) -> AuthResult | None:
    """
    Valida el refresh token (hash en DB, no revocado, no expirado, usuario activo),
    rota el token (revoca el viejo y emite uno nuevo) y re-emite el access token
    leyendo es_admin fresco desde la DB.
    """
    stmt = (
        select(RefreshToken)
        .where(RefreshToken.token_hash == hash_refresh_token(raw_token))
        .with_for_update()
    )
    fila = db.scalar(stmt)
    if fila is None or fila.revoked:
        return None
    if fila.expires_at <= datetime.now(timezone.utc):
        return None

    usuario = db.get(Usuario, fila.user_id)
    if usuario is None or not usuario.activo:
        return None

    # Rotación: el token usado queda revocado y se emite uno nuevo.
    fila.revoked = True
    db.commit()

    access = crear_access_token(user_id=str(usuario.id), es_admin=usuario.es_admin)
    refresh = _emitir_refresh_token(db, usuario.id)
    return AuthResult(
        access_token=access,
        refresh_token=refresh,
        user_id=str(usuario.id),
        nombre=usuario.nombre,
        es_admin=usuario.es_admin,
    )


def revocar_refresh_token(db: Session, raw_token: str) -> bool:
    fila = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(raw_token)
        )
    )
    if fila is None or fila.revoked:
        return False
    fila.revoked = True
    db.commit()
    return True
