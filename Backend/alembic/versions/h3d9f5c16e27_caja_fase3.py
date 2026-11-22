"""caja fase 3: movimientos de caja desde el service, medios de pago efectivo/transferencia

Revision ID: h3d9f5c16e27
Revises: g2c8e4b05d16
Create Date: 2026-11-22 20:00:00.000000

* Se retiran la lógica de caja en la BD (trigger fn_registrar_en_caja, función cerrar_turno_caja
  y las vistas v_resumen_turno_actual / v_historial_turnos): ahora vive en caja_service, dentro
  de la misma transacción que el pago.
* El dominio metodo_pago pasa a efectivo | transferencia. Los pagos y movimientos históricos
  con tarjeta/nequi se convierten a transferencia (decisión de negocio: solo hay dos medios).
* Un pago solo puede tener un movimiento de ingreso en caja (índice único parcial).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'h3d9f5c16e27'
down_revision: Union[str, None] = 'g2c8e4b05d16'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# NOTA: no usar el caracter de porcentaje en este SQL (se envia directo al driver).

_DOWN_SQL = r"""
CREATE OR REPLACE FUNCTION cerrar_turno_caja(
    p_usuario_id   UUID,
    p_monto_cierre NUMERIC,
    p_notas        TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_turno_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_usuario_id AND activo = TRUE) THEN
        RAISE EXCEPTION USING MESSAGE = 'Usuario inactivo o inexistente';
    END IF;

    SELECT id INTO v_turno_id FROM turnos_caja WHERE estado = 'abierta' FOR UPDATE;
    IF v_turno_id IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'No hay ningún turno de caja abierto';
    END IF;

    UPDATE turnos_caja SET
        estado = 'cerrada', fecha_cierre = NOW(), cerrado_por = p_usuario_id,
        monto_cierre = p_monto_cierre, notas = p_notas
    WHERE id = v_turno_id;

    RETURN v_turno_id;
END;
$$;

CREATE OR REPLACE FUNCTION fn_registrar_en_caja()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_turno_id UUID;
    v_concepto TEXT;
BEGIN
    IF NEW.estado = 'pagado' AND (OLD.estado IS DISTINCT FROM 'pagado') THEN
        SELECT id INTO v_turno_id FROM turnos_caja WHERE estado = 'abierta';
        IF v_turno_id IS NULL THEN
            RAISE EXCEPTION USING MESSAGE = 'No hay un turno de caja abierto. Abre la caja primero.';
        END IF;

        v_concepto := CASE
            WHEN NEW.salida_id    IS NOT NULL THEN 'Cobro parqueo temporal'
            WHEN NEW.membresia_id IS NOT NULL THEN 'Pago membresía'
        END;

        INSERT INTO caja_transacciones (turno_id, pago_id, tipo, concepto, metodo, monto)
        VALUES (v_turno_id, NEW.id, 'ingreso', v_concepto, NEW.metodo, NEW.monto);
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_registrar_en_caja AFTER INSERT OR UPDATE ON pagos
    FOR EACH ROW EXECUTE FUNCTION fn_registrar_en_caja();

CREATE OR REPLACE VIEW v_resumen_turno_actual AS
SELECT
    tc.id                          AS turno_id,
    u.nombre || ' ' || u.apellido  AS abierto_por,
    tc.fecha_apertura,
    tc.monto_inicial,
    COUNT(ct.id)                   AS total_transacciones,
    COALESCE(SUM(ct.monto), 0)     AS total_recaudado,
    COALESCE(SUM(ct.monto) FILTER (WHERE ct.metodo = 'efectivo'), 0)  AS efectivo,
    COALESCE(SUM(ct.monto) FILTER (WHERE ct.metodo <> 'efectivo'), 0) AS otros_metodos,
    tc.monto_inicial + COALESCE(SUM(ct.monto) FILTER (WHERE ct.metodo = 'efectivo'), 0) AS total_esperado_caja
FROM turnos_caja tc
JOIN usuarios u ON u.id = tc.usuario_id
LEFT JOIN caja_transacciones ct ON ct.turno_id = tc.id AND ct.tipo = 'ingreso'
WHERE tc.estado = 'abierta'
GROUP BY tc.id, tc.fecha_apertura, tc.monto_inicial, u.nombre, u.apellido;

CREATE OR REPLACE VIEW v_historial_turnos AS
SELECT
    tc.id                          AS turno_id,
    u.nombre || ' ' || u.apellido  AS abierto_por,
    uc.nombre || ' ' || uc.apellido AS cerrado_por,
    tc.fecha_apertura,
    tc.fecha_cierre,
    ROUND(EXTRACT(EPOCH FROM (tc.fecha_cierre - tc.fecha_apertura)) / 3600, 1) AS horas_turno,
    tc.monto_inicial,
    COALESCE(SUM(ct.monto), 0)     AS total_recaudado,
    COALESCE(SUM(ct.monto) FILTER (WHERE ct.metodo = 'efectivo'), 0)  AS efectivo,
    COALESCE(SUM(ct.monto) FILTER (WHERE ct.metodo <> 'efectivo'), 0) AS otros_metodos,
    tc.monto_cierre                AS monto_contado,
    tc.monto_cierre - (tc.monto_inicial +
        COALESCE(SUM(ct.monto) FILTER (WHERE ct.metodo = 'efectivo'), 0)) AS diferencia_caja,
    tc.notas
FROM turnos_caja tc
JOIN usuarios u  ON u.id  = tc.usuario_id
JOIN usuarios uc ON uc.id = tc.cerrado_por
LEFT JOIN caja_transacciones ct ON ct.turno_id = tc.id AND ct.tipo = 'ingreso'
WHERE tc.estado = 'cerrada'
GROUP BY tc.id, tc.fecha_apertura, tc.fecha_cierre, tc.monto_inicial,
         tc.monto_cierre, tc.notas, u.nombre, u.apellido, uc.nombre, uc.apellido
ORDER BY tc.fecha_cierre DESC;
"""


def upgrade() -> None:
    # La caja ya no depende de triggers ni vistas
    op.execute("DROP TRIGGER IF EXISTS trg_registrar_en_caja ON pagos")
    op.execute("DROP FUNCTION IF EXISTS fn_registrar_en_caja()")
    op.execute("DROP FUNCTION IF EXISTS cerrar_turno_caja(UUID, NUMERIC, TEXT)")
    op.execute("DROP VIEW IF EXISTS v_resumen_turno_actual, v_historial_turnos")

    # Medios de pago: solo efectivo y transferencia
    op.execute("UPDATE pagos SET metodo = 'transferencia' WHERE metodo IN ('tarjeta', 'nequi')")
    op.execute("UPDATE caja_transacciones SET metodo = 'transferencia' WHERE metodo IN ('tarjeta', 'nequi')")
    op.execute("ALTER DOMAIN metodo_pago DROP CONSTRAINT ck_metodo_pago")
    op.execute(
        "ALTER DOMAIN metodo_pago ADD CONSTRAINT ck_metodo_pago CHECK (VALUE IN ('efectivo', 'transferencia'))"
    )

    # Un movimiento de ingreso por pago
    op.create_index(
        'uq_caja_trans_pago_ingreso', 'caja_transacciones', ['pago_id'], unique=True,
        postgresql_where=sa.text("pago_id IS NOT NULL AND tipo = 'ingreso'"),
    )


def downgrade() -> None:
    op.drop_index(
        'uq_caja_trans_pago_ingreso', table_name='caja_transacciones',
        postgresql_where=sa.text("pago_id IS NOT NULL AND tipo = 'ingreso'"),
    )
    # Los pagos convertidos a transferencia no se pueden distinguir de nuevo (tarjeta/nequi).
    op.execute("ALTER DOMAIN metodo_pago DROP CONSTRAINT ck_metodo_pago")
    op.execute(
        "ALTER DOMAIN metodo_pago ADD CONSTRAINT ck_metodo_pago "
        "CHECK (VALUE IN ('efectivo', 'tarjeta', 'nequi', 'transferencia'))"
    )
    op.get_bind().exec_driver_sql(_DOWN_SQL)
