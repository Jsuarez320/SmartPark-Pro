import bcrypt
from datetime import datetime, timedelta, timezone

from jose import jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


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
