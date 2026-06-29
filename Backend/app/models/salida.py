import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Salida(Base):
    __tablename__ = "salidas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ingreso_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ingresos.id"), unique=True, nullable=False
    )
    operador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False
    )
    fecha_salida: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    minutos_totales: Mapped[int] = mapped_column(Integer, nullable=False)
    fracciones: Mapped[int] = mapped_column(Integer, nullable=False)
    valor_calculado: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    valor_cobrado: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    descuento: Mapped[float] = mapped_column(Numeric(12, 2), default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    ingreso = relationship("Ingreso", back_populates="salida")
    operador = relationship("Usuario", back_populates="salidas_operadas", foreign_keys=[operador_id])
    pagos = relationship("Pago", back_populates="salida", cascade="all, delete-orphan")
