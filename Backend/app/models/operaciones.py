"""Ingresos, salidas, pagos y recibos."""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, desc,
    func, text,
)
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

estado_ingreso = ENUM("activo", "completado", name="estado_ingreso", create_type=False)
estado_pago = ENUM("pendiente", "pagado", name="estado_pago", create_type=False)

# El dominio `metodo_pago` de la BD aún admite tarjeta/nequi (legacy); el flujo nuevo solo usa estos dos.
MEDIOS_PAGO = ("efectivo", "transferencia")


class Ingreso(Base):
    """Entrada de un vehículo. Un solo ingreso activo por vehículo (índice único parcial)."""

    __tablename__ = "ingresos"
    __table_args__ = (
        Index("uq_ingresos_vehiculo_activo", "vehiculo_id", unique=True, postgresql_where=text("estado = 'activo'")),
        Index("uq_ingresos_tarjeta_activa", "tarjeta_codigo", unique=True, postgresql_where=text("estado = 'activo'")),
        Index("idx_ingresos_vehiculo", "vehiculo_id"),
        Index("idx_ingresos_fecha", desc("fecha_ingreso")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    vehiculo_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehiculos.id"))
    operador_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    membresia_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("membresias.id"))
    placa_capturada: Mapped[str] = mapped_column(String(10))
    fecha_ingreso: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    estado: Mapped[str] = mapped_column(estado_ingreso, server_default="activo")
    notas: Mapped[str | None] = mapped_column(Text)
    # Tarjeta física (mensuales) o tiquete D-000123 (legacy). Opcional en el flujo nuevo.
    tarjeta_codigo: Mapped[str | None] = mapped_column(
        String(32), comment="Codigo de la tarjeta fisica entregada al vehiculo (lector tipo teclado)."
    )
    # LEGACY (flujo por planes): nullable para el flujo nuevo, que calcula la tarifa en la salida.
    tarifa_id: Mapped[int | None] = mapped_column(ForeignKey("tarifas.id"))
    tarifa_valor: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Salida(Base):
    __tablename__ = "salidas"
    __table_args__ = (Index("idx_salidas_fecha", desc("fecha_salida")),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    ingreso_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ingresos.id"), unique=True)
    operador_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    fecha_salida: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    minutos_totales: Mapped[int] = mapped_column(Integer)
    minutos_cobrados: Mapped[int] = mapped_column(Integer)
    valor_cobrado: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    # Flujo nuevo: versión de tarifa aplicada y desglose por tramo (hora/día/festivo/nocturna).
    tarifa_version_id: Mapped[int | None] = mapped_column(ForeignKey("tarifa_versiones.id"))
    detalle_cobro: Mapped[object | None] = mapped_column(JSONB)
    tope_aplicado: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    # LEGACY (bloques de 15 min). El flujo nuevo las deja en NULL (usa tarifa_version_id + detalle_cobro).
    convenio_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("convenios.id"))
    horas_descontadas: Mapped[int] = mapped_column(Integer, server_default="0")
    tarifa_valor_bloque: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    bloques: Mapped[int | None] = mapped_column(Integer)
    valor_plan: Mapped[Decimal] = mapped_column(Numeric(12, 2), server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Pago(Base):
    """Un pago pertenece a una salida (por horas) o a una membresía (mensualidad/renovación)."""

    __tablename__ = "pagos"
    __table_args__ = (
        CheckConstraint(
            "(salida_id IS NOT NULL AND membresia_id IS NULL) OR (salida_id IS NULL AND membresia_id IS NOT NULL)",
            name="ck_pagos_origen",
        ),
        CheckConstraint("monto > 0", name="ck_pagos_monto"),
        Index("uq_pagos_salida", "salida_id", unique=True, postgresql_where=text("salida_id IS NOT NULL")),
        Index("uq_pagos_membresia", "membresia_id", unique=True, postgresql_where=text("membresia_id IS NOT NULL")),
        Index("idx_pagos_fecha", desc("fecha_pago")),
        Index("idx_pagos_estado", "estado"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    salida_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("salidas.id"))
    membresia_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("membresias.id"))
    operador_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    metodo: Mapped[str] = mapped_column(String(20))  # dominio metodo_pago
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    referencia: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str] = mapped_column(estado_pago, server_default="pendiente")
    fecha_pago: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Recibo(Base):
    """Recibo con snapshot completo. La reimpresión usa `contenido`, nunca recalcula.

    tipo: ingreso | pago | mensualidad | cierre_caja. Cada tipo se liga a su registro:
    ingreso→ingreso_id, pago→salida_id, mensualidad→membresia_id, cierre_caja→turno_id.
    """

    __tablename__ = "recibos"
    __table_args__ = (
        CheckConstraint("tipo IN ('ingreso', 'pago', 'mensualidad', 'cierre_caja')", name="ck_recibos_tipo"),
        CheckConstraint(
            "(tipo = 'ingreso' AND ingreso_id IS NOT NULL) OR (tipo = 'pago' AND salida_id IS NOT NULL) "
            "OR (tipo = 'mensualidad' AND membresia_id IS NOT NULL) OR (tipo = 'cierre_caja' AND turno_id IS NOT NULL)",
            name="ck_recibos_origen",
        ),
        Index("uq_recibos_ingreso", "ingreso_id", unique=True, postgresql_where=text("tipo = 'ingreso'")),
        Index("uq_recibos_pago", "salida_id", unique=True, postgresql_where=text("tipo = 'pago'")),
        Index("uq_recibos_mensualidad", "membresia_id", unique=True, postgresql_where=text("tipo = 'mensualidad'")),
        Index("uq_recibos_cierre", "turno_id", unique=True, postgresql_where=text("tipo = 'cierre_caja'")),
        Index("idx_recibos_placa", "placa"),
        Index("idx_recibos_fecha", desc("created_at")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    # Consecutivo global (secuencia seq_recibo). Se muestra como número de recibo.
    numero: Mapped[int] = mapped_column(Integer, unique=True, server_default=text("nextval('seq_recibo')"))
    tipo: Mapped[str] = mapped_column(String(20))
    ingreso_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("ingresos.id"))
    salida_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("salidas.id"))
    membresia_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("membresias.id"))
    turno_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("turnos_caja.id"))
    placa: Mapped[str | None] = mapped_column(String(10))
    operador_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    contenido: Mapped[object] = mapped_column(JSONB)
    reimpresiones: Mapped[int] = mapped_column(Integer, server_default="0")
    ultima_reimpresion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReciboReimpresion(Base):
    """Rastro de auditoría: quién reimprimió un recibo y cuándo."""

    __tablename__ = "recibo_reimpresiones"
    __table_args__ = (Index("idx_recibo_reimpresiones_recibo", "recibo_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    recibo_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("recibos.id"))
    usuario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("usuarios.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
