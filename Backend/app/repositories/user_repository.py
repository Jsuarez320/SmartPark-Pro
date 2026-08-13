from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.usuario import Usuario

def obtener_username(db: Session, username: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(Usuario.username == username))