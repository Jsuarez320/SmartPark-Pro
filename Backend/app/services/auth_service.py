from sqlalchemy.orm import Session

from app.core.security import verificar_password, crear_access_token
from app.repositories.user_repository import obtener_username

def autenticar_usuario(db: Session, username: str, password: str) -> str | None:
    usuario = obtener_username(db, username)
    if not usuario:
        return None
    if not verificar_password(password, usuario.password_hash):
        return None
    if not usuario.activo:
        return None
    return crear_access_token(subject=usuario.username)