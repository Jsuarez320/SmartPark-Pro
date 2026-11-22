"""LEGACY: esquema por planes (bloque 15 min, medio día, ...).

Lo usa el flujo viejo (`/vehiculos/entrada`, `/vehiculos/salida`, `/membresias`)
hasta que las fases 4 y 5 lo reemplacen; después se eliminan estas tablas con una
migración de limpieza.
"""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String,
    UniqueConstraint, desc, func, text,
)
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

tipo_plan = ENUM(
    "bloque_15min", "medio_dia", "dia_completo", "medio_tiempo", "mensual", name="tipo_plan", create_type=False
)
estado_factura = ENUM("emitida", "anulada", name="estado_factura", create_type=False)


class Plan(Base):
    __tablename__ = "planes"
    __table_args__ = (UniqueConstraint("tipo", name="uq_planes_tipo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[str] = mapped_column(tipo_plan)
    nombre: Mapped[str] = mapped_column(String(80))
    duracion_minutos: Mapped[int | None] = mapped_column(Integer)
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))


class Tarifa(Base):
    __tablename__ = "tarifas"
    __table_args__ = (
        UniqueConstraint("plan_id", "tipo_vehiculo_id", name="uq_tarifa"),
        CheckConstraint("valor > 0", name="ck_tarifas_valor"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes.id"))
    tipo_vehiculo_id: Mapped[int] = mapped_column(ForeignKey("tipos_vehiculo.id"))
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    creado_por: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))
    actualizado_por: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Convenio(Base):
    __tablename__ = "convenios"
    __table_args__ = (
        UniqueConstraint("nit", name="uq_convenios_nit"),
        CheckConstraint("horas_descuento > 0", name="ck_convenios_horas"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    nombre: Mapped[str] = mapped_column(String(150))
    nit: Mapped[str | None] = mapped_column(String(20))
    horas_descuento: Mapped[int] = mapped_column(Integer)
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    creado_por: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Factura(Base):
    """Reemplazada por `recibos` (con snapshot)."""

    __tablename__ = "facturas"
    __table_args__ = (
        UniqueConstraint("numero", name="uq_facturas_numero"),
        UniqueConstraint("pago_id", name="uq_facturas_pago"),
        CheckConstraint("total >= subtotal", name="ck_facturas_total"),
        Index("idx_facturas_cliente", "cliente_id"),
        Index("idx_facturas_fecha", desc("fecha")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    pago_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pagos.id"))
    cliente_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("clientes.id"))
    numero: Mapped[str] = mapped_column(String(30))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    estado: Mapped[str] = mapped_column(estado_factura, server_default="emitida")
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
