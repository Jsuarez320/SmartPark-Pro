import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Pago(Base):
    __tablename__ = "pagos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    salida_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("salidas.id"), nullable=True
    )
    membresia_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("membresias.id"), nullable=True
    )
    operador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False
    )
    metodo: Mapped[str] = mapped_column(String(20), nullable=False)
    monto: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    referencia: Mapped[str] = mapped_column(String(100), nullable=True)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="pendiente"
    )
    fecha_pago: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    salida = relationship("Salida", back_populates="pagos")
    membresia = relationship("Membresia", back_populates="pagos")
    operador = relationship("Usuario", back_populates="pagos_operados", foreign_keys=[operador_id])
    facturas = relationship("Factura", back_populates="pago", cascade="all, delete-orphan")
    transacciones = relationship("CajaTransaccion", back_populates="pago", cascade="all, delete-orphan")
