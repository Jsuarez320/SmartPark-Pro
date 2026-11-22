"""limpieza: se retira la lógica legacy del esquema por planes (triggers, funciones y vistas)

Revision ID: k6a2c8f49b50
Revises: j5f1b7e38a49
Create Date: 2026-11-23 09:00:00.000000

El cobro, la caja y los recibos viven en los services (cobro_service, caja_service, recibo_service).
Se eliminan los objetos de BD que ya nadie usa y que ensuciaban el flujo nuevo:

  * trg_generar_factura / fn_generar_factura: creaba una fila en `facturas` por cada pago
    (los recibos de verdad están en `recibos`).
  * trg_cerrar_ingreso / fn_cerrar_ingreso: el service marca el ingreso como completado.
  * trg_validar_ingreso / fn_validar_ingreso: validaba tarifas por plan (legacy).
  * calcular_cobro, tiene_membresia_vigente y las vistas v_vehiculos_dentro / v_tarifas_vigentes.

NO se borran datos: las tablas legacy (facturas, convenios, tarifas, planes) y sus columnas se
conservan con su historial. Quitarlas es una decisión de datos que se toma por separado.

El downgrade restaura todo lo eliminado (SQL tomado de e5a9c3b81f27 y g2c8e4b05d16).
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'k6a2c8f49b50'
down_revision: Union[str, None] = 'j5f1b7e38a49'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# NOTA: no usar el caracter de porcentaje en este SQL (se envia directo al driver).

_RESTAURAR = r"""
CREATE OR REPLACE FUNCTION tiene_membresia_vigente(p_vehiculo_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM membresias
        WHERE vehiculo_id = p_vehiculo_id
          AND estado       = 'activa'
          AND fecha_inicio <= CURRENT_DATE
          AND fecha_fin    >= CURRENT_DATE
    );
$$;

CREATE OR REPLACE FUNCTION calcular_cobro(
    p_tarifa_id       INTEGER,
    p_minutos         INTEGER,
    p_horas_descuento INTEGER DEFAULT 0,
    p_valor           NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    minutos_cobrados INTEGER,
    bloques          INTEGER,
    valor_bloque     NUMERIC,
    valor_plan       NUMERIC,
    valor_total      NUMERIC,
    tope_aplicado    BOOLEAN
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_tipo     tipo_plan;
    v_valor    NUMERIC;
    v_dur      INTEGER;
    v_tipo_veh INTEGER;
    v_bloque   NUMERIC;
    v_dia      NUMERIC;
    v_dia_dur  INTEGER;
    v_min      INTEGER;
    v_periodos INTEGER;
    v_resto    INTEGER;
    v_bl       INTEGER;
    v_raw      NUMERIC;
BEGIN
    IF p_minutos < 0 THEN
        RAISE EXCEPTION USING MESSAGE = 'Los minutos no pueden ser negativos';
    END IF;

    SELECT p.tipo, COALESCE(p_valor, t.valor), p.duracion_minutos, t.tipo_vehiculo_id
    INTO   v_tipo, v_valor, v_dur, v_tipo_veh
    FROM   tarifas t JOIN planes p ON p.id = t.plan_id
    WHERE  t.id = p_tarifa_id;

    IF v_tipo IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'La tarifa ' || p_tarifa_id::TEXT || ' no existe';
    END IF;

    -- Membresias: sin cobro temporal
    IF v_tipo IN ('mensual', 'medio_tiempo') THEN
        RETURN QUERY SELECT 0, 0, v_valor, 0::NUMERIC, 0::NUMERIC, FALSE;
        RETURN;
    END IF;

    -- Precio vigente del bloque para este tipo de vehiculo
    SELECT t.valor INTO v_bloque
    FROM tarifas t JOIN planes p ON p.id = t.plan_id
    WHERE p.tipo = 'bloque_15min' AND t.tipo_vehiculo_id = v_tipo_veh;

    v_min := GREATEST(GREATEST(p_minutos, 1) - p_horas_descuento * 60, 0);

    IF v_tipo = 'bloque_15min' THEN
        v_bloque := v_valor;
    ELSIF v_bloque IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'No hay tarifa de bloque para este tipo de vehículo';
    END IF;

    IF v_min = 0 THEN
        RETURN QUERY SELECT 0, 0, v_bloque, 0::NUMERIC, 0::NUMERIC, FALSE;
        RETURN;
    END IF;

    IF v_tipo = 'bloque_15min' THEN
        SELECT t.valor, p.duracion_minutos INTO v_dia, v_dia_dur
        FROM tarifas t JOIN planes p ON p.id = t.plan_id
        WHERE p.tipo = 'dia_completo' AND t.tipo_vehiculo_id = v_tipo_veh;

        IF v_dia IS NULL THEN
            v_bl := CEIL(v_min / 15.0)::INTEGER;
            RETURN QUERY SELECT v_min, v_bl, v_bloque, 0::NUMERIC, v_bl * v_bloque, FALSE;
            RETURN;
        END IF;

        v_periodos := v_min / v_dia_dur;
        v_resto    := v_min - v_periodos * v_dia_dur;
        v_bl       := CEIL(v_resto / 15.0)::INTEGER;
        v_raw      := v_bl * v_bloque;
        RETURN QUERY SELECT
            v_min, v_bl, v_bloque,
            v_periodos * v_dia,
            v_periodos * v_dia + LEAST(v_raw, v_dia),
            (v_raw > v_dia);
        RETURN;
    END IF;

    -- medio_dia / dia_completo
    v_bl := CEIL(GREATEST(v_min - v_dur, 0) / 15.0)::INTEGER;
    RETURN QUERY SELECT v_min, v_bl, v_bloque, v_valor, v_valor + v_bl * v_bloque, FALSE;
END;
$$;

CREATE OR REPLACE VIEW v_vehiculos_dentro AS
SELECT
    i.id               AS ingreso_id,
    i.tarjeta_codigo,
    i.fecha_ingreso,
    v.placa,
    tv.nombre          AS tipo_vehiculo,
    p.tipo             AS plan_tipo,
    p.nombre           AS plan,
    (i.membresia_id IS NOT NULL) AS es_membresia,
    m.minutos          AS minutos_transcurridos,
    cb.bloques         AS bloques_estimados,
    cb.valor_total     AS valor_estimado,
    c.nombres || ' ' || c.apellidos AS cliente
FROM ingresos i
JOIN vehiculos      v  ON v.id  = i.vehiculo_id
JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
JOIN tarifas        t  ON t.id  = i.tarifa_id
JOIN planes         p  ON p.id  = t.plan_id
LEFT JOIN clientes  c  ON c.id  = v.cliente_id
CROSS JOIN LATERAL (
    SELECT ROUND(EXTRACT(EPOCH FROM (NOW() - i.fecha_ingreso)) / 60)::INT AS minutos
) m
CROSS JOIN LATERAL calcular_cobro(i.tarifa_id, m.minutos, 0, i.tarifa_valor) cb
WHERE i.estado = 'activo'
ORDER BY i.fecha_ingreso;

CREATE OR REPLACE VIEW v_tarifas_vigentes AS
SELECT t.id, p.nombre AS plan, p.tipo AS tipo_plan, tv.nombre AS tipo_vehiculo,
       t.valor, t.updated_at AS ultima_actualizacion
FROM tarifas t
JOIN planes         p  ON p.id  = t.plan_id
JOIN tipos_vehiculo tv ON tv.id = t.tipo_vehiculo_id
ORDER BY tv.nombre, p.id;

CREATE OR REPLACE FUNCTION fn_cerrar_ingreso()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE ingresos SET estado = 'completado' WHERE id = NEW.ingreso_id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_cerrar_ingreso AFTER INSERT ON salidas
    FOR EACH ROW EXECUTE FUNCTION fn_cerrar_ingreso();

CREATE OR REPLACE FUNCTION fn_generar_factura()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_cliente_id UUID;
    v_numero     TEXT;
BEGIN
    IF NEW.estado = 'pagado' AND (OLD.estado IS DISTINCT FROM 'pagado') THEN
        SELECT v.cliente_id INTO v_cliente_id
        FROM   salidas s
        JOIN   ingresos  i ON i.id = s.ingreso_id
        JOIN   vehiculos v ON v.id = i.vehiculo_id
        WHERE  s.id = NEW.salida_id
        UNION ALL
        SELECT cliente_id FROM membresias WHERE id = NEW.membresia_id
        LIMIT 1;

        v_numero := 'SP-' || LPAD(nextval('seq_numero_factura')::TEXT, 6, '0');

        INSERT INTO facturas (pago_id, cliente_id, numero, subtotal, total)
        VALUES (NEW.id, v_cliente_id, v_numero, NEW.monto, NEW.monto);
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_generar_factura AFTER INSERT OR UPDATE ON pagos
    FOR EACH ROW EXECUTE FUNCTION fn_generar_factura();

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
CREATE TRIGGER trg_validar_ingreso BEFORE INSERT ON ingresos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_ingreso();
"""


def upgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_generar_factura ON pagos")
    op.execute("DROP FUNCTION IF EXISTS fn_generar_factura()")
    op.execute("DROP TRIGGER IF EXISTS trg_cerrar_ingreso ON salidas")
    op.execute("DROP FUNCTION IF EXISTS fn_cerrar_ingreso()")
    op.execute("DROP TRIGGER IF EXISTS trg_validar_ingreso ON ingresos")
    op.execute("DROP FUNCTION IF EXISTS fn_validar_ingreso()")
    op.execute("DROP VIEW IF EXISTS v_vehiculos_dentro, v_tarifas_vigentes")
    op.execute("DROP FUNCTION IF EXISTS calcular_cobro(INTEGER, INTEGER, INTEGER, NUMERIC)")
    op.execute("DROP FUNCTION IF EXISTS tiene_membresia_vigente(UUID)")


def downgrade() -> None:
    op.get_bind().exec_driver_sql(_RESTAURAR)
