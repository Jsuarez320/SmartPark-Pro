"""Clientes, vehículos y mensualidades."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String,
    UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

tipo_cliente = ENUM("temporal", "mensual", name="tipo_cliente", create_type=False)
estado_membresia = ENUM("activa", "vencida", "cancelada", name="estado_membresia", create_type=False)

_PLACA_RE = "^[A-Z0-9]{3,10}$"


class Cliente(Base):
    """Titular de una mensualidad. `nombres` guarda el nombre completo; documento y apellidos son opcionales."""

    __tablename__ = "clientes"
    __table_args__ = (UniqueConstraint("documento", "tipo_documento", name="uq_clientes_documento"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    tipo: Mapped[str] = mapped_column(tipo_cliente)
    nombres: Mapped[str] = mapped_column(String(100))
    apellidos: Mapped[str | None] = mapped_column(String(100))
    documento: Mapped[str | None] = mapped_column(String(20))
    tipo_documento: Mapped[str] = mapped_column(String(10), server_default="CC")
    telefono: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(150))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Vehiculo(Base):
    __tablename__ = "vehiculos"
    __table_args__ = (
        CheckConstraint(f"placa ~ '{_PLACA_RE}'", name="ck_vehiculos_placa"),
        UniqueConstraint("placa", name="uq_vehiculos_placa"),
        Index("idx_vehiculos_cliente", "cliente_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    cliente_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="SET NULL")
    )
    tipo_vehiculo_id: Mapped[int] = mapped_column(ForeignKey("tipos_vehiculo.id"))
    placa: Mapped[str] = mapped_column(String(10))
    marca: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(30))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Membresia(Base):
    """Una fila por periodo pagado: renovar = insertar otra fila (con su propio pago).

    `estado` es activa | cancelada; "vencida" y "próxima a vencer" se derivan de
    `fecha_fin` (ver umbral_vencimiento_dias en `configuracion`). Además, en BD,
    una EXCLUDE impide vigencias solapadas por vehículo.
    """

    __tablename__ = "membresias"
    __table_args__ = (
        CheckConstraint("fecha_fin >= fecha_inicio", name="ck_membresias_fechas"),
        CheckConstraint("valor_pagado > 0", name="ck_membresias_valor"),
        CheckConstraint("periodo IN ('1_dia', '15_dias', '1_mes')", name="ck_membresias_periodo"),
        CheckConstraint("jornada IN ('manana', 'tarde', 'completa')", name="ck_membresias_jornada"),
        CheckConstraint(
            f"placa_alterna IS NULL OR placa_alterna ~ '{_PLACA_RE}'", name="ck_membresias_placa_alterna"
        ),
        Index("idx_membresias_vehiculo", "vehiculo_id"),
        Index("idx_membresias_cliente", "cliente_id"),
        Index("idx_membresias_vigencia", "fecha_inicio", "fecha_fin", "estado"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    cliente_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clientes.id"))
    vehiculo_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehiculos.id"))
    # Placa alterna: texto (puede no existir aún como vehículo). La principal es vehiculo_id.
    placa_alterna: Mapped[str | None] = mapped_column(String(10))
    tarjeta_codigo: Mapped[str | None] = mapped_column(String(32))
    periodo: Mapped[str] = mapped_column(String(10), server_default="1_mes")
    jornada: Mapped[str] = mapped_column(String(10), server_default="completa")
    fecha_inicio: Mapped[date] = mapped_column(Date)
    fecha_fin: Mapped[date] = mapped_column(Date)
    valor_pagado: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    tarifa_version_id: Mapped[int | None] = mapped_column(ForeignKey("tarifa_versiones.id"))
    estado: Mapped[str] = mapped_column(
        estado_membresia,
        server_default="activa",
        comment='activa | cancelada. "Vencida" se deriva de fecha_fin < hoy (no se actualiza por job).',
    )
    creado_por: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    # LEGACY (esquema por planes): nullable; se retiran cuando el flujo nuevo reemplace al viejo.
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("planes.id"))
    tarifa_id: Mapped[int | None] = mapped_column(ForeignKey("tarifas.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
