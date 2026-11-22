"""Catálogos y configuración: tipos de vehículo, tarifas versionadas, festivos y parámetros."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String,
    func, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TipoVehiculo(Base):
    __tablename__ = "tipos_vehiculo"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(50), unique=True)


class TarifaVersion(Base):
    """Esquema de precios de un tipo de vehículo, versionado por vigencia.

    Para cambiar un precio NO se hace UPDATE: se cierra la versión vigente
    (`vigente_hasta`) y se inserta otra. Las salidas guardan `tarifa_version_id`
    y los recibos guardan el snapshot, así los cobros históricos no cambian.
    Todos los valores en pesos COP.
    """

    __tablename__ = "tarifa_versiones"
    __table_args__ = (
        CheckConstraint(
            "valor_hora > 0 AND valor_dia > 0 AND valor_hora_festivo > 0 AND valor_dia_festivo > 0 "
            "AND mensualidad_1_dia > 0 AND mensualidad_15_dias > 0 AND mensualidad_1_mes > 0",
            name="ck_tarifa_versiones_valores",
        ),
        CheckConstraint(
            "NOT nocturna_activa OR valor_hora_nocturna > 0", name="ck_tarifa_versiones_nocturna"
        ),
        CheckConstraint(
            "vigente_hasta IS NULL OR vigente_hasta > vigente_desde", name="ck_tarifa_versiones_vigencia"
        ),
        # Además en BD: EXCLUDE USING gist (tipo_vehiculo_id =, tstzrange(vigente_desde, vigente_hasta) &&)
        # evita versiones solapadas (autogenerate no ve las EXCLUDE).
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo_vehiculo_id: Mapped[int] = mapped_column(ForeignKey("tipos_vehiculo.id"), index=True)
    valor_hora: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    valor_dia: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    valor_hora_festivo: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    valor_dia_festivo: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    mensualidad_1_dia: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    mensualidad_15_dias: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    mensualidad_1_mes: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    nocturna_activa: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    valor_hora_nocturna: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    vigente_desde: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    vigente_hasta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_por: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Configuracion(Base):
    """Parámetros clave/valor: gracia_minutos, umbral_vencimiento_dias, nocturna_inicio/fin."""

    __tablename__ = "configuracion"

    clave: Mapped[str] = mapped_column(String(60), primary_key=True)
    valor: Mapped[object] = mapped_column(JSONB)
    descripcion: Mapped[str | None] = mapped_column(String(200))
    actualizado_por: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Festivo(Base):
    __tablename__ = "festivos"

    fecha: Mapped[date] = mapped_column(Date, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(80))
