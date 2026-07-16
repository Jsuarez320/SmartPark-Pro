import bcrypt
from datetime import datetime, timedelta, timezone

from fastapi import Depends, Header, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
        )


async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de autorizacion invalido",
        )
    token = authorization.removeprefix("Bearer ")
    payload = decode_access_token(token)

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido: no contiene user_id",
        )

    result = await db.execute(
        text(
            "SELECT id, username, nombre, apellido, email, es_admin, activo "
            "FROM usuarios WHERE id = :id AND activo = true"
        ),
        {"id": user_id},
    )
    user = result.fetchone()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
        )
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str):
    result = await db.execute(
        text(
            "SELECT id, username, password_hash, nombre, apellido, es_admin, activo "
            "FROM usuarios WHERE username = :username"
        ),
        {"username": username},
    )
    user = result.fetchone()
    if not user or not user.activo:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
