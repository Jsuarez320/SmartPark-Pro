import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TurnoCaja(Base):
    __tablename__ = "turnos_caja"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    admin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False
    )
    fecha_apertura: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    monto_inicial: Mapped[float] = mapped_column(Numeric(12, 2), default=0, server_default="0")
    fecha_cierre: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    monto_cierre: Mapped[float] = mapped_column(Numeric(12, 2), nullable=True)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="abierta"
    )
    notas: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    admin = relationship("Usuario", back_populates="turnos")
    transacciones = relationship("CajaTransaccion", back_populates="turno", cascade="all, delete-orphan")
