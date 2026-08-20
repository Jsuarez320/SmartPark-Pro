import uuid

from app.core.database import Base
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4()
    )
    nombre: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    apellido: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    email: Mapped[str] = mapped_column(
            String(150), nullable=False
    )
    username: Mapped[str] = mapped_column(
            String(60), nullable=False
    )
    password_hash: Mapped[str] = mapped_column(
            String, nullable=False
    )
    es_admin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    activo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    ultimo_login: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now()
    )