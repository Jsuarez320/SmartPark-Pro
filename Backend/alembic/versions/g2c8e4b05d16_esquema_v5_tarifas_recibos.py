"""esquema v5: tarifas versionadas, configuracion, festivos, recibos, mensualidades con jornada

Revision ID: g2c8e4b05d16
Revises: f1b7d2a94c05
Create Date: 2026-11-22 17:06:36.834697

Base generada con `alembic revision --autogenerate` y revisada a mano:
  * se quitó el ruido de autogenerate (conversión del dominio metodo_pago a VARCHAR,
    comentarios, renombre de idx_vehiculos_cliente);
  * se agregó lo que autogenerate no ve: secuencia, CHECK, EXCLUDE, trigger y seeds.

Es ADITIVA y no rompe el flujo viejo (/vehiculos/entrada, /salida, /membresias):
  * tablas nuevas: tarifa_versiones, configuracion, festivos, recibos;
  * columnas nuevas con default en membresias / salidas / turnos_caja;
  * se relajan NOT NULL de columnas legacy (ingresos.tarifa_*, membresias.plan_id/tarifa_id,
    clientes.apellidos/documento) para el flujo nuevo.
Los triggers/funciones legacy (calcular_cobro, fn_registrar_en_caja, fn_generar_factura) y las
tablas planes/tarifas/convenios/facturas se retiran en las fases 3-5, cuando se reemplace su uso.

Downgrade: falla si ya hay filas del flujo nuevo (NULL en columnas que vuelven a ser NOT NULL).
"""
from datetime import date, timedelta
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'g2c8e4b05d16'
down_revision: Union[str, None] = 'f1b7d2a94c05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _pascua(anio: int) -> date:
    """Domingo de Pascua (algoritmo gregoriano anónimo)."""
    a, b, c = anio % 19, anio // 100, anio % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes = (h + l - 7 * m + 114) // 31
    dia = (h + l - 7 * m + 114) % 31 + 1
    return date(anio, mes, dia)


def _festivos_colombia(anio: int) -> list[tuple[date, str]]:
    """Festivos de Colombia (Ley Emiliani): fijos, trasladados al lunes y ligados a Semana Santa."""

    def lunes(d: date) -> date:
        return d + timedelta(days=(7 - d.weekday()) % 7)

    p = _pascua(anio)
    return sorted([
        (date(anio, 1, 1), "Año Nuevo"),
        (lunes(date(anio, 1, 6)), "Reyes Magos"),
        (lunes(date(anio, 3, 19)), "San José"),
        (p - timedelta(days=3), "Jueves Santo"),
        (p - timedelta(days=2), "Viernes Santo"),
        (date(anio, 5, 1), "Día del Trabajo"),
        (lunes(p + timedelta(days=39)), "Ascensión del Señor"),
        (lunes(p + timedelta(days=60)), "Corpus Christi"),
        (lunes(p + timedelta(days=68)), "Sagrado Corazón"),
        (lunes(date(anio, 6, 29)), "San Pedro y San Pablo"),
        (date(anio, 7, 20), "Día de la Independencia"),
        (date(anio, 8, 7), "Batalla de Boyacá"),
        (lunes(date(anio, 8, 15)), "Asunción de la Virgen"),
        (lunes(date(anio, 10, 12)), "Día de la Raza"),
        (lunes(date(anio, 11, 1)), "Todos los Santos"),
        (lunes(date(anio, 11, 11)), "Independencia de Cartagena"),
        (date(anio, 12, 8), "Inmaculada Concepción"),
        (date(anio, 12, 25), "Navidad"),
    ])


# Cuerpo original de fn_validar_ingreso (e5a9c3b81f27) con una salida temprana para el flujo nuevo,
# que no asigna tarifa al ingresar (la tarifa se calcula en la salida).
_VALIDAR_INGRESO_NUEVO = r"""
CREATE OR REPLACE FUNCTION fn_validar_ingreso()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_tipo_plan  tipo_plan;
    v_plan_id    INTEGER;
    v_tipo_veh_t INTEGER;
    v_tipo_veh_v INTEGER;
    v_mem        RECORD;
BEGIN
    IF NEW.tarifa_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT p.tipo, p.id, t.tipo_vehiculo_id
    INTO   v_tipo_plan, v_plan_id, v_tipo_veh_t
    FROM   tarifas t JOIN planes p ON p.id = t.plan_id
    WHERE  t.id = NEW.tarifa_id;

    SELECT tipo_vehiculo_id INTO v_tipo_veh_v FROM vehiculos WHERE id = NEW.vehiculo_id;

    IF v_tipo_veh_t IS DISTINCT FROM v_tipo_veh_v THEN
        RAISE EXCEPTION USING MESSAGE = 'La tarifa no corresponde al tipo de vehículo';
    END IF;

    IF v_tipo_plan IN ('mensual', 'medio_tiempo') THEN
        IF NEW.membresia_id IS NULL THEN
            RAISE EXCEPTION USING MESSAGE = 'El plan ' || v_tipo_plan::TEXT || ' requiere una membresía activa';
        END IF;
        SELECT * INTO v_mem FROM membresias WHERE id = NEW.membresia_id;
        IF v_mem.vehiculo_id IS DISTINCT FROM NEW.vehiculo_id
           OR v_mem.estado <> 'activa'
           OR v_mem.fecha_inicio > CURRENT_DATE
           OR v_mem.fecha_fin < CURRENT_DATE
           OR v_mem.plan_id <> v_plan_id THEN
            RAISE EXCEPTION USING MESSAGE = 'El vehículo no tiene una membresía vigente para ese plan';
        END IF;
    ELSIF NEW.membresia_id IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'Un plan temporal no puede asociarse a una membresía';
    END IF;
    RETURN NEW;
END;
$$;
"""

_VALIDAR_INGRESO_ORIGINAL = _VALIDAR_INGRESO_NUEVO.replace(
    """    IF NEW.tarifa_id IS NULL THEN
        RETURN NEW;
    END IF;

""",
    "",
)


def upgrade() -> None:
    # ---------------------------------------------------------------- secuencia de recibos
    op.execute("CREATE SEQUENCE seq_recibo START 1")

    # ---------------------------------------------------------------- tablas nuevas
    op.create_table(
        'festivos',
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column('nombre', sa.String(length=80), nullable=False),
        sa.PrimaryKeyConstraint('fecha'),
    )
    op.create_table(
        'configuracion',
        sa.Column('clave', sa.String(length=60), nullable=False),
        sa.Column('valor', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('descripcion', sa.String(length=200), nullable=True),
        sa.Column('actualizado_por', sa.UUID(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['actualizado_por'], ['usuarios.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('clave'),
    )
    op.create_table(
        'tarifa_versiones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tipo_vehiculo_id', sa.Integer(), nullable=False),
        sa.Column('valor_hora', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('valor_dia', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('valor_hora_festivo', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('valor_dia_festivo', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('mensualidad_1_dia', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('mensualidad_15_dias', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('mensualidad_1_mes', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('nocturna_activa', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('valor_hora_nocturna', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('vigente_desde', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('vigente_hasta', sa.DateTime(timezone=True), nullable=True),
        sa.Column('creado_por', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('NOT nocturna_activa OR valor_hora_nocturna > 0', name='ck_tarifa_versiones_nocturna'),
        sa.CheckConstraint(
            'valor_hora > 0 AND valor_dia > 0 AND valor_hora_festivo > 0 AND valor_dia_festivo > 0 '
            'AND mensualidad_1_dia > 0 AND mensualidad_15_dias > 0 AND mensualidad_1_mes > 0',
            name='ck_tarifa_versiones_valores',
        ),
        sa.CheckConstraint('vigente_hasta IS NULL OR vigente_hasta > vigente_desde', name='ck_tarifa_versiones_vigencia'),
        sa.ForeignKeyConstraint(['creado_por'], ['usuarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tipo_vehiculo_id'], ['tipos_vehiculo.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_tarifa_versiones_tipo_vehiculo_id', 'tarifa_versiones', ['tipo_vehiculo_id'])
    # Una sola versión vigente por tipo de vehículo y sin vigencias solapadas.
    op.execute(
        "ALTER TABLE tarifa_versiones ADD CONSTRAINT ex_tarifa_versiones_vigencia EXCLUDE USING gist "
        "(tipo_vehiculo_id WITH =, tstzrange(vigente_desde, vigente_hasta) WITH &&)"
    )

    # ---------------------------------------------------------------- cambios a tablas existentes
    # clientes: para una mensualidad basta nombre + celular
    op.alter_column('clientes', 'apellidos', existing_type=sa.VARCHAR(length=100), nullable=True)
    op.alter_column('clientes', 'documento', existing_type=sa.VARCHAR(length=20), nullable=True)

    # turnos_caja: base inicial de transferencias (monto_inicial sigue siendo la base de efectivo)
    op.add_column(
        'turnos_caja',
        sa.Column('base_transferencia', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False),
    )
    op.create_check_constraint('ck_base_transferencia', 'turnos_caja', 'base_transferencia >= 0')

    # membresias
    op.add_column('membresias', sa.Column('placa_alterna', sa.String(length=10), nullable=True))
    op.add_column('membresias', sa.Column('tarjeta_codigo', sa.String(length=32), nullable=True))
    op.add_column('membresias', sa.Column('periodo', sa.String(length=10), server_default='1_mes', nullable=False))
    op.add_column('membresias', sa.Column('jornada', sa.String(length=10), server_default='completa', nullable=False))
    op.add_column('membresias', sa.Column('tarifa_version_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_membresias_tarifa_version', 'membresias', 'tarifa_versiones', ['tarifa_version_id'], ['id']
    )
    op.alter_column('membresias', 'plan_id', existing_type=sa.INTEGER(), nullable=True)
    op.alter_column('membresias', 'tarifa_id', existing_type=sa.INTEGER(), nullable=True)
    # es_plan_membresia(NULL) es FALSE: el CHECK debe aceptar plan_id NULL explícitamente.
    op.drop_constraint('ck_membresias_plan', 'membresias', type_='check')
    op.create_check_constraint(
        'ck_membresias_plan', 'membresias', 'plan_id IS NULL OR es_plan_membresia(plan_id)'
    )
    # Una mensualidad de 1 día empieza y termina el mismo día.
    op.drop_constraint('ck_membresias_fechas', 'membresias', type_='check')
    op.create_check_constraint('ck_membresias_fechas', 'membresias', 'fecha_fin >= fecha_inicio')
    op.create_check_constraint('ck_membresias_periodo', 'membresias', "periodo IN ('1_dia', '15_dias', '1_mes')")
    op.create_check_constraint('ck_membresias_jornada', 'membresias', "jornada IN ('manana', 'tarde', 'completa')")
    op.create_check_constraint(
        'ck_membresias_placa_alterna', 'membresias', "placa_alterna IS NULL OR placa_alterna ~ '^[A-Z0-9]{3,10}$'"
    )

    # ingresos: el flujo nuevo no asigna tarifa al ingresar ni exige tarjeta
    op.alter_column('ingresos', 'tarjeta_codigo', existing_type=sa.VARCHAR(length=32), nullable=True,
                    existing_comment='Codigo de la tarjeta fisica entregada al vehiculo (lector tipo teclado).')
    op.alter_column('ingresos', 'tarifa_id', existing_type=sa.INTEGER(), nullable=True)
    op.alter_column('ingresos', 'tarifa_valor', existing_type=sa.NUMERIC(precision=12, scale=2), nullable=True)
    op.execute(_VALIDAR_INGRESO_NUEVO)

    # salidas: versión de tarifa aplicada + desglose; la consistencia "plan + bloques * precio"
    # no aplica a cobros por tramos (festivo/nocturna), por eso se retira ese CHECK.
    op.add_column('salidas', sa.Column('tarifa_version_id', sa.Integer(), nullable=True))
    op.add_column('salidas', sa.Column('detalle_cobro', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_foreign_key('fk_salidas_tarifa_version', 'salidas', 'tarifa_versiones', ['tarifa_version_id'], ['id'])
    op.drop_constraint('ck_salidas_consistencia', 'salidas', type_='check')

    # ---------------------------------------------------------------- recibos
    op.create_table(
        'recibos',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('numero', sa.Integer(), server_default=sa.text("nextval('seq_recibo')"), nullable=False),
        sa.Column('tipo', sa.String(length=20), nullable=False),
        sa.Column('ingreso_id', sa.UUID(), nullable=True),
        sa.Column('salida_id', sa.UUID(), nullable=True),
        sa.Column('membresia_id', sa.UUID(), nullable=True),
        sa.Column('turno_id', sa.UUID(), nullable=True),
        sa.Column('placa', sa.String(length=10), nullable=True),
        sa.Column('operador_id', sa.UUID(), nullable=False),
        sa.Column('contenido', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('reimpresiones', sa.Integer(), server_default='0', nullable=False),
        sa.Column('ultima_reimpresion', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "(tipo = 'ingreso' AND ingreso_id IS NOT NULL) OR (tipo = 'pago' AND salida_id IS NOT NULL) "
            "OR (tipo = 'mensualidad' AND membresia_id IS NOT NULL) OR (tipo = 'cierre_caja' AND turno_id IS NOT NULL)",
            name='ck_recibos_origen',
        ),
        sa.CheckConstraint("tipo IN ('ingreso', 'pago', 'mensualidad', 'cierre_caja')", name='ck_recibos_tipo'),
        sa.ForeignKeyConstraint(['ingreso_id'], ['ingresos.id']),
        sa.ForeignKeyConstraint(['membresia_id'], ['membresias.id']),
        sa.ForeignKeyConstraint(['operador_id'], ['usuarios.id']),
        sa.ForeignKeyConstraint(['salida_id'], ['salidas.id']),
        sa.ForeignKeyConstraint(['turno_id'], ['turnos_caja.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('numero'),
    )
    op.execute("ALTER SEQUENCE seq_recibo OWNED BY recibos.numero")
    op.create_index('idx_recibos_fecha', 'recibos', [sa.literal_column('created_at DESC')])
    op.create_index('idx_recibos_placa', 'recibos', ['placa'])
    op.create_index('uq_recibos_cierre', 'recibos', ['turno_id'], unique=True,
                    postgresql_where=sa.text("tipo = 'cierre_caja'"))
    op.create_index('uq_recibos_ingreso', 'recibos', ['ingreso_id'], unique=True,
                    postgresql_where=sa.text("tipo = 'ingreso'"))
    op.create_index('uq_recibos_mensualidad', 'recibos', ['membresia_id'], unique=True,
                    postgresql_where=sa.text("tipo = 'mensualidad'"))
    op.create_index('uq_recibos_pago', 'recibos', ['salida_id'], unique=True,
                    postgresql_where=sa.text("tipo = 'pago'"))

    # ---------------------------------------------------------------- seeds
    op.execute(
        """
        INSERT INTO configuracion (clave, valor, descripcion) VALUES
          ('gracia_minutos', '5', 'Minutos de gracia: una estadía de hasta este tiempo no se cobra'),
          ('umbral_vencimiento_dias', '3', 'Días antes del vencimiento en que una mensualidad pasa a "por vencer"'),
          ('nocturna_inicio', '"19:00"', 'Hora de inicio de la franja nocturna (hora de Colombia, formato 24 h)'),
          ('nocturna_fin', '"06:00"', 'Hora de fin de la franja nocturna (hora de Colombia, formato 24 h)')
        """
    )

    # Dos festivos pueden caer el mismo lunes (ej. 2030-07-01): una sola fila con ambos nombres.
    por_fecha: dict[date, str] = {}
    for anio in range(2026, 2031):
        for f, n in _festivos_colombia(anio):
            por_fecha[f] = f"{por_fecha[f]} / {n}" if f in por_fecha else n
    festivos = sorted(por_fecha.items())
    op.bulk_insert(
        sa.table('festivos', sa.column('fecha', sa.Date), sa.column('nombre', sa.String)),
        [{'fecha': f, 'nombre': n} for f, n in festivos],
    )

    # Versión inicial de tarifas DERIVADA de las tarifas legacy (el admin debe revisarla en Tarifas):
    # hora = 4 bloques de 15 min; día = día completo; festivo = igual al normal;
    # mensualidad 1 mes = mensual, 15 días = mitad, 1 día = valor del día.
    op.execute(
        """
        INSERT INTO tarifa_versiones (tipo_vehiculo_id, valor_hora, valor_dia, valor_hora_festivo,
                                      valor_dia_festivo, mensualidad_1_dia, mensualidad_15_dias,
                                      mensualidad_1_mes, creado_por)
        SELECT tv.id, b.valor * 4, d.valor, b.valor * 4, d.valor, d.valor, ROUND(m.valor / 2), m.valor,
               (SELECT id FROM usuarios WHERE es_admin ORDER BY created_at LIMIT 1)
        FROM tipos_vehiculo tv
        JOIN tarifas b ON b.tipo_vehiculo_id = tv.id AND b.plan_id = (SELECT id FROM planes WHERE tipo = 'bloque_15min')
        JOIN tarifas d ON d.tipo_vehiculo_id = tv.id AND d.plan_id = (SELECT id FROM planes WHERE tipo = 'dia_completo')
        JOIN tarifas m ON m.tipo_vehiculo_id = tv.id AND m.plan_id = (SELECT id FROM planes WHERE tipo = 'mensual')
        """
    )


def downgrade() -> None:
    op.drop_table('recibos')  # arrastra seq_recibo (OWNED BY)
    op.execute("DROP SEQUENCE IF EXISTS seq_recibo")

    op.execute(
        "ALTER TABLE salidas ADD CONSTRAINT ck_salidas_consistencia CHECK ("
        "valor_cobrado <= valor_plan + bloques * tarifa_valor_bloque "
        "AND (tope_aplicado OR valor_cobrado = valor_plan + bloques * tarifa_valor_bloque))"
    )
    op.drop_constraint('fk_salidas_tarifa_version', 'salidas', type_='foreignkey')
    op.drop_column('salidas', 'detalle_cobro')
    op.drop_column('salidas', 'tarifa_version_id')

    op.execute(_VALIDAR_INGRESO_ORIGINAL)
    op.alter_column('ingresos', 'tarifa_valor', existing_type=sa.NUMERIC(precision=12, scale=2), nullable=False)
    op.alter_column('ingresos', 'tarifa_id', existing_type=sa.INTEGER(), nullable=False)
    op.alter_column('ingresos', 'tarjeta_codigo', existing_type=sa.VARCHAR(length=32), nullable=False,
                    existing_comment='Codigo de la tarjeta fisica entregada al vehiculo (lector tipo teclado).')

    op.drop_constraint('ck_membresias_placa_alterna', 'membresias', type_='check')
    op.drop_constraint('ck_membresias_jornada', 'membresias', type_='check')
    op.drop_constraint('ck_membresias_periodo', 'membresias', type_='check')
    op.drop_constraint('ck_membresias_fechas', 'membresias', type_='check')
    op.create_check_constraint('ck_membresias_fechas', 'membresias', 'fecha_fin > fecha_inicio')
    op.drop_constraint('ck_membresias_plan', 'membresias', type_='check')
    op.create_check_constraint('ck_membresias_plan', 'membresias', 'es_plan_membresia(plan_id)')
    op.alter_column('membresias', 'tarifa_id', existing_type=sa.INTEGER(), nullable=False)
    op.alter_column('membresias', 'plan_id', existing_type=sa.INTEGER(), nullable=False)
    op.drop_constraint('fk_membresias_tarifa_version', 'membresias', type_='foreignkey')
    op.drop_column('membresias', 'tarifa_version_id')
    op.drop_column('membresias', 'jornada')
    op.drop_column('membresias', 'periodo')
    op.drop_column('membresias', 'tarjeta_codigo')
    op.drop_column('membresias', 'placa_alterna')

    op.drop_constraint('ck_base_transferencia', 'turnos_caja', type_='check')
    op.drop_column('turnos_caja', 'base_transferencia')

    op.alter_column('clientes', 'documento', existing_type=sa.VARCHAR(length=20), nullable=False)
    op.alter_column('clientes', 'apellidos', existing_type=sa.VARCHAR(length=100), nullable=False)

    op.drop_table('tarifa_versiones')
    op.drop_table('configuracion')
    op.drop_table('festivos')
