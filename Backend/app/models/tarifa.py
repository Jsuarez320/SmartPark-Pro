import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Tarifa(Base):
    __tablename__ = "tarifas"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes.id"), nullable=False)
    tipo_vehiculo_id: Mapped[int] = mapped_column(
        ForeignKey("tipos_vehiculo.id"), nullable=False
    )
    valor: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    vigente_desde: Mapped[date] = mapped_column(Date, nullable=False)
    vigente_hasta: Mapped[date] = mapped_column(Date, nullable=True)
    creado_por: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    plan = relationship("Plan", back_populates="tarifas")
    tipo_vehiculo = relationship("TipoVehiculo", back_populates="tarifas")
    creador = relationship("Usuario", back_populates="tarifas_creadas")
    ingresos = relationship("Ingreso", back_populates="tarifa")
    membresias = relationship("Membresia", back_populates="tarifa")
