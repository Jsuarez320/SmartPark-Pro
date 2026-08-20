from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.security import verificar_password, crear_access_token
from app.repositories.user_repository import obtener_username


@dataclass
class AuthResult:
    access_token: str
    user_id: str
    nombre: str
    es_admin: bool


def autenticar_usuario(db: Session, username: str, password: str) -> AuthResult | None:
    usuario = obtener_username(db, username)
    if not usuario:
        return None
    if not verificar_password(password, usuario.password_hash):
        return None
    if not usuario.activo:
        return None
    token = crear_access_token(user_id=str(usuario.id), es_admin=usuario.es_admin)
    return AuthResult(
        access_token=token,
        user_id=str(usuario.id),
        nombre=usuario.nombre,
        es_admin=usuario.es_admin,
    )
