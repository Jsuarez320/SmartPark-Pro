import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Ingreso(Base):
    __tablename__ = "ingresos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    vehiculo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehiculos.id"), nullable=False
    )
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes.id"), nullable=False)
    tarifa_id: Mapped[int] = mapped_column(ForeignKey("tarifas.id"), nullable=False)
    membresia_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("membresias.id"), nullable=True
    )
    operador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False
    )
    fecha_ingreso: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    placa_capturada: Mapped[str] = mapped_column(String(10), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="activo"
    )
    notas: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    vehiculo = relationship("Vehiculo", back_populates="ingresos")
    plan = relationship("Plan", back_populates="ingresos")
    tarifa = relationship("Tarifa", back_populates="ingresos")
    membresia = relationship("Membresia", back_populates="ingresos")
    operador = relationship("Usuario", back_populates="ingresos_operados", foreign_keys=[operador_id])
    salida = relationship("Salida", back_populates="ingreso", uselist=False, cascade="all, delete-orphan")
