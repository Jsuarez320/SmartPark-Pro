import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellido: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    es_admin: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    activo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    ultimo_login: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    ingresos_operados = relationship(
        "Ingreso", back_populates="operador", foreign_keys="Ingreso.operador_id"
    )
    salidas_operadas = relationship(
        "Salida", back_populates="operador", foreign_keys="Salida.operador_id"
    )
    turnos = relationship("TurnoCaja", back_populates="admin")
    pagos_operados = relationship(
        "Pago", back_populates="operador", foreign_keys="Pago.operador_id"
    )
    tarifas_creadas = relationship("Tarifa", back_populates="creador")
    membresias_creadas = relationship(
        "Membresia", back_populates="creador", foreign_keys="Membresia.creado_por"
    )
