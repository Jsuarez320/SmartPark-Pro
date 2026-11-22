"""Turnos de caja y sus movimientos."""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text, desc, func, text
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

estado_caja = ENUM("abierta", "cerrada", name="estado_caja", create_type=False)
tipo_transaccion = ENUM("ingreso", "egreso", "ajuste", name="tipo_transaccion", create_type=False)


class TurnoCaja(Base):
    """Caja del día. Solo una abierta a la vez (índice único parcial uq_turno_abierto)."""

    __tablename__ = "turnos_caja"
    __table_args__ = (
        CheckConstraint("monto_inicial >= 0", name="ck_monto_inicial"),
        CheckConstraint("base_transferencia >= 0", name="ck_base_transferencia"),
        Index("uq_turno_abierto", "estado", unique=True, postgresql_where=text("estado = 'abierta'")),
        Index("idx_turnos_usuario", "usuario_id"),
        Index("idx_turnos_fecha", desc("fecha_apertura")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    cerrado_por: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    fecha_apertura: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # `monto_inicial` = base inicial de EFECTIVO (nombre histórico, lo usan vistas y SQL existente).
    base_efectivo: Mapped[Decimal] = mapped_column("monto_inicial", Numeric(12, 2), server_default="0")
    base_transferencia: Mapped[Decimal] = mapped_column(Numeric(12, 2), server_default="0")
    fecha_cierre: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Efectivo contado al cierre.
    monto_cierre: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    estado: Mapped[str] = mapped_column(estado_caja, server_default="abierta")
    notas: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CajaTransaccion(Base):
    __tablename__ = "caja_transacciones"
    __table_args__ = (
        CheckConstraint("monto > 0", name="ck_transaccion_monto"),
        Index("idx_caja_trans_turno", "turno_id"),
        Index("idx_caja_trans_fecha", desc("created_at")),
        Index("idx_caja_trans_pago", "pago_id"),
        # Un pago solo puede tener un movimiento de ingreso en caja.
        Index(
            "uq_caja_trans_pago_ingreso", "pago_id", unique=True,
            postgresql_where=text("pago_id IS NOT NULL AND tipo = 'ingreso'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    turno_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("turnos_caja.id"))
    pago_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("pagos.id"))
    tipo: Mapped[str] = mapped_column(tipo_transaccion)
    concepto: Mapped[str] = mapped_column(String(150))
    metodo: Mapped[str] = mapped_column(String(20))  # dominio metodo_pago
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
