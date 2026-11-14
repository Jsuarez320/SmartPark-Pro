"""parqueadero schema v4 (ingresos con tarjeta, salidas, pagos, caja, membresias)

Revision ID: e5a9c3b81f27
Revises: 2d0ac33476b1
Create Date: 2026-11-13 12:00:00.000000

Basado en el schema v4 de "Doce con Primera" con estos cambios:
  * ingresos: tarjeta_codigo (unica entre ingresos activos) y snapshot tarifa_valor;
    se elimina plan_id (el plan se deriva de la tarifa).
  * calcular_cobro: tope por periodos de "dia_completo", exceso sobre planes fijos
    cobrado en bloques, minimo 1 bloque, valida la tarifa.
  * salidas: valor_plan y tope_aplicado (constraint de consistencia actualizada).
  * metodo_pago: dominio VARCHAR con CHECK (efectivo, tarjeta, nequi, transferencia).
  * turnos_caja: usuario_id (cualquier usuario abre/cierra), cerrado_por.
  * membresias: EXCLUDE para evitar vigencias solapadas.
  * triggers: updated_at, inmutabilidad de ingresos, validacion tarifa/membresia.
  * usuarios NO se toca (es_admin sigue en FALSE por defecto).
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'e5a9c3b81f27'
down_revision: Union[str, None] = '2d0ac33476b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# NOTA: no usar el caracter de porcentaje en este SQL (se envia directo al driver).

UPGRADE_SQL = r"""
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE tipo_cliente     AS ENUM ('temporal', 'mensual');
CREATE TYPE estado_ingreso   AS ENUM ('activo', 'completado');
CREATE TYPE estado_membresia AS ENUM ('activa', 'vencida', 'cancelada');
CREATE TYPE estado_pago      AS ENUM ('pendiente', 'pagado');
CREATE TYPE estado_factura   AS ENUM ('emitida', 'anulada');
CREATE TYPE estado_caja      AS ENUM ('abierta', 'cerrada');
CREATE TYPE tipo_transaccion AS ENUM ('ingreso', 'egreso', 'ajuste');
CREATE TYPE tipo_plan AS ENUM (
    'bloque_15min', 'medio_dia', 'dia_completo', 'medio_tiempo', 'mensual'
);

-- Dominio en vez de ENUM: agregar un metodo es un simple ALTER DOMAIN.
CREATE DOMAIN metodo_pago AS VARCHAR(20)
    CONSTRAINT ck_metodo_pago CHECK (VALUE IN ('efectivo', 'tarjeta', 'nequi', 'transferencia'));

CREATE SEQUENCE seq_numero_factura START 1;

-- Mantiene updated_at al hacer UPDATE directo por SQL
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------ tipos_vehiculo
CREATE TABLE tipos_vehiculo (
    id     SERIAL      PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    CONSTRAINT uq_tipos_vehiculo_nombre UNIQUE (nombre)
);
INSERT INTO tipos_vehiculo (nombre) VALUES ('Carro'), ('Moto');

-- ------------------------------------------------------------ clientes
CREATE TABLE clientes (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo           tipo_cliente NOT NULL,
    nombres        VARCHAR(100) NOT NULL,
    apellidos      VARCHAR(100) NOT NULL,
    documento      VARCHAR(20)  NOT NULL,
    tipo_documento VARCHAR(10)  NOT NULL DEFAULT 'CC',
    telefono       VARCHAR(20),
    email          VARCHAR(150),
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_clientes_documento UNIQUE (documento, tipo_documento),
    CONSTRAINT ck_tipo_documento     CHECK (tipo_documento IN ('CC','CE','NIT','PAS','TI'))
);
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ------------------------------------------------------------ planes
CREATE TABLE planes (
    id               SERIAL      PRIMARY KEY,
    tipo             tipo_plan   NOT NULL,
    nombre           VARCHAR(80) NOT NULL,
    duracion_minutos INTEGER,
    activo           BOOLEAN     NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_planes_tipo     UNIQUE (tipo),
    CONSTRAINT ck_planes_duracion CHECK (
        (tipo IN ('mensual', 'medio_tiempo') AND duracion_minutos IS NULL) OR
        (tipo NOT IN ('mensual', 'medio_tiempo') AND duracion_minutos > 0)
    )
);
INSERT INTO planes (tipo, nombre, duracion_minutos) VALUES
    ('bloque_15min', 'Bloque 15 min', 15),
    ('medio_dia',    'Medio día',     360),
    ('dia_completo', 'Día completo',  720),
    ('medio_tiempo', 'Medio tiempo',  NULL),
    ('mensual',      'Mensual',       NULL);

-- ------------------------------------------------------------ tarifas
CREATE TABLE tarifas (
    id               SERIAL         PRIMARY KEY,
    plan_id          INTEGER        NOT NULL REFERENCES planes(id),
    tipo_vehiculo_id INTEGER        NOT NULL REFERENCES tipos_vehiculo(id),
    valor            NUMERIC(12, 2) NOT NULL,
    creado_por       UUID           REFERENCES usuarios(id) ON DELETE SET NULL,
    actualizado_por  UUID           REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tarifa        UNIQUE (plan_id, tipo_vehiculo_id),
    CONSTRAINT ck_tarifas_valor CHECK (valor > 0)
);
CREATE TRIGGER trg_tarifas_updated BEFORE UPDATE ON tarifas
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ------------------------------------------------------------ convenios
CREATE TABLE convenios (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(150) NOT NULL,
    nit             VARCHAR(20),
    horas_descuento INTEGER      NOT NULL,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_por      UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_convenios_nit   UNIQUE (nit),
    CONSTRAINT ck_convenios_horas CHECK (horas_descuento > 0)
);
CREATE TRIGGER trg_convenios_updated BEFORE UPDATE ON convenios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ------------------------------------------------------------ vehiculos
CREATE TABLE vehiculos (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id       UUID        REFERENCES clientes(id) ON DELETE SET NULL,
    tipo_vehiculo_id INTEGER     NOT NULL REFERENCES tipos_vehiculo(id),
    placa            VARCHAR(10) NOT NULL,
    marca            VARCHAR(50),
    color            VARCHAR(30),
    activo           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vehiculos_placa UNIQUE (placa),
    CONSTRAINT ck_vehiculos_placa CHECK (placa ~ '^[A-Z0-9]{3,10}$')
);
CREATE INDEX idx_vehiculos_cliente ON vehiculos(cliente_id);
CREATE TRIGGER trg_vehiculos_updated BEFORE UPDATE ON vehiculos
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ------------------------------------------------------------ membresias
CREATE OR REPLACE FUNCTION es_plan_membresia(p_plan_id INTEGER)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM planes
        WHERE id = p_plan_id AND tipo IN ('mensual', 'medio_tiempo')
    );
$$;

CREATE TABLE membresias (
    id           UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id   UUID             NOT NULL REFERENCES clientes(id),
    vehiculo_id  UUID             NOT NULL REFERENCES vehiculos(id),
    plan_id      INTEGER          NOT NULL REFERENCES planes(id),
    tarifa_id    INTEGER          NOT NULL REFERENCES tarifas(id),
    fecha_inicio DATE             NOT NULL,
    fecha_fin    DATE             NOT NULL,
    valor_pagado NUMERIC(12, 2)   NOT NULL,
    estado       estado_membresia NOT NULL DEFAULT 'activa',
    creado_por   UUID             NOT NULL REFERENCES usuarios(id),
    created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_membresias_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT ck_membresias_valor  CHECK (valor_pagado > 0),
    CONSTRAINT ck_membresias_plan   CHECK (es_plan_membresia(plan_id)),
    -- Un vehiculo no puede tener dos membresias activas con vigencias solapadas
    CONSTRAINT ex_membresias_solape EXCLUDE USING gist (
        vehiculo_id WITH =,
        daterange(fecha_inicio, fecha_fin, '[]') WITH &&
    ) WHERE (estado = 'activa')
);
COMMENT ON COLUMN membresias.estado IS
    'activa | cancelada. "Vencida" se deriva de fecha_fin < hoy (no se actualiza por job).';
CREATE INDEX idx_membresias_vehiculo ON membresias(vehiculo_id);
CREATE INDEX idx_membresias_cliente  ON membresias(cliente_id);
CREATE INDEX idx_membresias_vigencia ON membresias(fecha_inicio, fecha_fin, estado);
CREATE TRIGGER trg_membresias_updated BEFORE UPDATE ON membresias
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

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

-- ------------------------------------------------------------ ingresos
CREATE TABLE ingresos (
    id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehiculo_id     UUID           NOT NULL REFERENCES vehiculos(id),
    tarifa_id       INTEGER        NOT NULL REFERENCES tarifas(id),
    -- Snapshot del precio al ingresar: el cobro usa este valor aunque el admin cambie la tarifa
    tarifa_valor    NUMERIC(12, 2) NOT NULL,
    membresia_id    UUID           REFERENCES membresias(id),
    operador_id     UUID           NOT NULL REFERENCES usuarios(id),
    tarjeta_codigo  VARCHAR(32)    NOT NULL,
    fecha_ingreso   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    placa_capturada VARCHAR(10)    NOT NULL,
    estado          estado_ingreso NOT NULL DEFAULT 'activo',
    notas           TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_ingresos_tarjeta CHECK (length(trim(tarjeta_codigo)) > 0),
    CONSTRAINT ck_ingresos_tarifa_valor CHECK (tarifa_valor > 0)
);
COMMENT ON COLUMN ingresos.tarjeta_codigo IS 'Codigo de la tarjeta fisica entregada al vehiculo (lector tipo teclado).';

CREATE UNIQUE INDEX uq_ingresos_vehiculo_activo ON ingresos(vehiculo_id) WHERE estado = 'activo';
CREATE UNIQUE INDEX uq_ingresos_tarjeta_activa  ON ingresos(tarjeta_codigo) WHERE estado = 'activo';
CREATE INDEX idx_ingresos_vehiculo ON ingresos(vehiculo_id);
CREATE INDEX idx_ingresos_fecha    ON ingresos(fecha_ingreso DESC);

-- Valida coherencia tarifa / vehiculo / membresia al ingresar
CREATE OR REPLACE FUNCTION fn_validar_ingreso()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_tipo_plan  tipo_plan;
    v_plan_id    INTEGER;
    v_tipo_veh_t INTEGER;
    v_tipo_veh_v INTEGER;
    v_mem        RECORD;
BEGIN
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

-- Campos inmutables: solo cambia estado / notas
CREATE OR REPLACE FUNCTION fn_ingresos_inmutables()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.vehiculo_id <> OLD.vehiculo_id OR NEW.tarifa_id <> OLD.tarifa_id
       OR NEW.tarifa_valor <> OLD.tarifa_valor OR NEW.fecha_ingreso <> OLD.fecha_ingreso
       OR NEW.placa_capturada <> OLD.placa_capturada OR NEW.tarjeta_codigo <> OLD.tarjeta_codigo
       OR NEW.membresia_id IS DISTINCT FROM OLD.membresia_id THEN
        RAISE EXCEPTION USING MESSAGE = 'Los datos de un ingreso no se pueden modificar';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_ingresos_inmutables BEFORE UPDATE ON ingresos
    FOR EACH ROW EXECUTE FUNCTION fn_ingresos_inmutables();

-- ------------------------------------------------------------ calcular_cobro
-- Devuelve el cobro definitivo. p_valor = snapshot de ingresos.tarifa_valor.
--  * membresias: 0
--  * bloque_15min: CEIL(min/15) bloques; por cada periodo completo de dia_completo
--    se cobra el precio del dia; el resto nunca supera el precio del dia (tope)
--  * medio_dia / dia_completo: precio fijo cubre su duracion; el exceso se cobra en bloques
--  * cualquier fraccion > 0 cuenta como 1 bloque; el descuento de convenio resta minutos
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

-- ------------------------------------------------------------ salidas
CREATE TABLE salidas (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingreso_id          UUID          NOT NULL REFERENCES ingresos(id),
    operador_id         UUID          NOT NULL REFERENCES usuarios(id),
    convenio_id         UUID          REFERENCES convenios(id),
    fecha_salida        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    minutos_totales     INTEGER       NOT NULL,
    horas_descontadas   INTEGER       NOT NULL DEFAULT 0,
    minutos_cobrados    INTEGER       NOT NULL,
    tarifa_valor_bloque NUMERIC(12,2) NOT NULL,
    bloques             INTEGER       NOT NULL,
    valor_plan          NUMERIC(12,2) NOT NULL DEFAULT 0,
    tope_aplicado       BOOLEAN       NOT NULL DEFAULT FALSE,
    valor_cobrado       NUMERIC(12,2) NOT NULL,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_salidas_ingreso       UNIQUE (ingreso_id),
    CONSTRAINT ck_salidas_min_totales   CHECK (minutos_totales   >= 0),
    CONSTRAINT ck_salidas_horas_desc    CHECK (horas_descontadas >= 0),
    CONSTRAINT ck_salidas_min_cobrados  CHECK (minutos_cobrados  >= 0),
    CONSTRAINT ck_salidas_bloques       CHECK (bloques           >= 0),
    CONSTRAINT ck_salidas_valor         CHECK (valor_cobrado     >= 0),
    CONSTRAINT ck_salidas_tarifa_bloque CHECK (tarifa_valor_bloque > 0),
    -- valor = plan fijo + bloques * precio, salvo que se haya aplicado el tope diario
    CONSTRAINT ck_salidas_consistencia  CHECK (
        valor_cobrado <= valor_plan + bloques * tarifa_valor_bloque
        AND (tope_aplicado OR valor_cobrado = valor_plan + bloques * tarifa_valor_bloque)
    )
);
CREATE INDEX idx_salidas_fecha ON salidas(fecha_salida DESC);

CREATE OR REPLACE FUNCTION fn_cerrar_ingreso()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE ingresos SET estado = 'completado' WHERE id = NEW.ingreso_id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_cerrar_ingreso AFTER INSERT ON salidas
    FOR EACH ROW EXECUTE FUNCTION fn_cerrar_ingreso();

-- ------------------------------------------------------------ pagos
CREATE TABLE pagos (
    id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    salida_id    UUID          REFERENCES salidas(id),
    membresia_id UUID          REFERENCES membresias(id),
    operador_id  UUID          NOT NULL REFERENCES usuarios(id),
    metodo       metodo_pago   NOT NULL,
    monto        NUMERIC(12,2) NOT NULL,
    referencia   VARCHAR(100),
    estado       estado_pago   NOT NULL DEFAULT 'pendiente',
    fecha_pago   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_pagos_origen CHECK (
        (salida_id IS NOT NULL AND membresia_id IS NULL) OR
        (salida_id IS NULL    AND membresia_id IS NOT NULL)
    ),
    CONSTRAINT ck_pagos_monto CHECK (monto > 0)
);
CREATE UNIQUE INDEX uq_pagos_salida    ON pagos(salida_id)    WHERE salida_id IS NOT NULL;
CREATE UNIQUE INDEX uq_pagos_membresia ON pagos(membresia_id) WHERE membresia_id IS NOT NULL;
CREATE INDEX idx_pagos_fecha  ON pagos(fecha_pago DESC);
CREATE INDEX idx_pagos_estado ON pagos(estado);
CREATE TRIGGER trg_pagos_updated BEFORE UPDATE ON pagos
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ------------------------------------------------------------ facturas
CREATE TABLE facturas (
    id         UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    pago_id    UUID           NOT NULL REFERENCES pagos(id),
    cliente_id UUID           REFERENCES clientes(id),
    numero     VARCHAR(30)    NOT NULL,
    subtotal   NUMERIC(12,2)  NOT NULL,
    total      NUMERIC(12,2)  NOT NULL,
    estado     estado_factura NOT NULL DEFAULT 'emitida',
    fecha      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_facturas_numero UNIQUE (numero),
    CONSTRAINT uq_facturas_pago   UNIQUE (pago_id),
    CONSTRAINT ck_facturas_total  CHECK (total >= subtotal)
);
CREATE INDEX idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX idx_facturas_fecha   ON facturas(fecha DESC);

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

-- ------------------------------------------------------------ turnos_caja
-- Cualquier usuario activo puede abrir y cerrar el turno; solo el admin consulta reportes.
CREATE TABLE turnos_caja (
    id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id     UUID          NOT NULL REFERENCES usuarios(id),
    cerrado_por    UUID          REFERENCES usuarios(id),
    fecha_apertura TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    monto_inicial  NUMERIC(12,2) NOT NULL DEFAULT 0,
    fecha_cierre   TIMESTAMPTZ,
    monto_cierre   NUMERIC(12,2),
    estado         estado_caja   NOT NULL DEFAULT 'abierta',
    notas          TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_turno_cierre CHECK (
        (estado = 'abierta' AND fecha_cierre IS NULL     AND monto_cierre IS NULL     AND cerrado_por IS NULL) OR
        (estado = 'cerrada' AND fecha_cierre IS NOT NULL AND monto_cierre IS NOT NULL AND cerrado_por IS NOT NULL)
    ),
    CONSTRAINT ck_monto_inicial CHECK (monto_inicial >= 0),
    CONSTRAINT ck_monto_cierre  CHECK (monto_cierre IS NULL OR monto_cierre >= 0)
);
CREATE UNIQUE INDEX uq_turno_abierto ON turnos_caja(estado) WHERE estado = 'abierta';
CREATE INDEX idx_turnos_usuario ON turnos_caja(usuario_id);
CREATE INDEX idx_turnos_fecha   ON turnos_caja(fecha_apertura DESC);
CREATE TRIGGER trg_turnos_updated BEFORE UPDATE ON turnos_caja
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

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

-- ------------------------------------------------------------ caja_transacciones
CREATE TABLE caja_transacciones (
    id         UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
    turno_id   UUID             NOT NULL REFERENCES turnos_caja(id),
    pago_id    UUID             REFERENCES pagos(id),
    tipo       tipo_transaccion NOT NULL,
    concepto   VARCHAR(150)     NOT NULL,
    metodo     metodo_pago      NOT NULL,
    monto      NUMERIC(12,2)    NOT NULL,
    created_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_transaccion_monto CHECK (monto > 0)
);
CREATE INDEX idx_caja_trans_turno ON caja_transacciones(turno_id);
CREATE INDEX idx_caja_trans_fecha ON caja_transacciones(created_at DESC);
CREATE INDEX idx_caja_trans_pago  ON caja_transacciones(pago_id);

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

-- ------------------------------------------------------------ tarifas iniciales
DO $$
DECLARE
    v_admin_id UUID;
    v_carro INTEGER; v_moto INTEGER;
    v_bloque INTEGER; v_medio_dia INTEGER; v_dia INTEGER; v_medio_tpo INTEGER; v_mensual INTEGER;
BEGIN
    SELECT id INTO v_admin_id FROM usuarios WHERE es_admin ORDER BY created_at LIMIT 1;
    SELECT id INTO v_carro      FROM tipos_vehiculo WHERE nombre = 'Carro';
    SELECT id INTO v_moto       FROM tipos_vehiculo WHERE nombre = 'Moto';
    SELECT id INTO v_bloque     FROM planes WHERE tipo = 'bloque_15min';
    SELECT id INTO v_medio_dia  FROM planes WHERE tipo = 'medio_dia';
    SELECT id INTO v_dia        FROM planes WHERE tipo = 'dia_completo';
    SELECT id INTO v_medio_tpo  FROM planes WHERE tipo = 'medio_tiempo';
    SELECT id INTO v_mensual    FROM planes WHERE tipo = 'mensual';

    INSERT INTO tarifas (plan_id, tipo_vehiculo_id, valor, creado_por) VALUES
        (v_bloque,    v_carro,   1000.00, v_admin_id),
        (v_medio_dia, v_carro,  15000.00, v_admin_id),
        (v_dia,       v_carro,  25000.00, v_admin_id),
        (v_medio_tpo, v_carro, 100000.00, v_admin_id),
        (v_mensual,   v_carro, 160000.00, v_admin_id),
        (v_bloque,    v_moto,    1000.00, v_admin_id),
        (v_medio_dia, v_moto,    4000.00, v_admin_id),
        (v_dia,       v_moto,    8000.00, v_admin_id),
        (v_mensual,   v_moto,   50000.00, v_admin_id);
END;
$$;

-- ------------------------------------------------------------ vistas
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

CREATE OR REPLACE VIEW v_tarifas_vigentes AS
SELECT t.id, p.nombre AS plan, p.tipo AS tipo_plan, tv.nombre AS tipo_vehiculo,
       t.valor, t.updated_at AS ultima_actualizacion
FROM tarifas t
JOIN planes         p  ON p.id  = t.plan_id
JOIN tipos_vehiculo tv ON tv.id = t.tipo_vehiculo_id
ORDER BY tv.nombre, p.id;
"""

DOWNGRADE_SQL = r"""
DROP VIEW IF EXISTS v_tarifas_vigentes, v_historial_turnos, v_resumen_turno_actual, v_vehiculos_dentro;
DROP TABLE IF EXISTS caja_transacciones, turnos_caja, facturas, pagos, salidas, ingresos,
                     membresias, vehiculos, convenios, tarifas, planes, clientes, tipos_vehiculo CASCADE;
DROP FUNCTION IF EXISTS fn_registrar_en_caja(), cerrar_turno_caja(UUID, NUMERIC, TEXT),
    fn_generar_factura(), fn_cerrar_ingreso(), calcular_cobro(INTEGER, INTEGER, INTEGER, NUMERIC),
    fn_ingresos_inmutables(), fn_validar_ingreso(), tiene_membresia_vigente(UUID),
    es_plan_membresia(INTEGER), fn_set_updated_at();
DROP SEQUENCE IF EXISTS seq_numero_factura;
DROP DOMAIN IF EXISTS metodo_pago;
DROP TYPE IF EXISTS tipo_plan, tipo_transaccion, estado_caja, estado_factura, estado_pago,
    estado_membresia, estado_ingreso, tipo_cliente;
"""


def upgrade() -> None:
    op.get_bind().exec_driver_sql(UPGRADE_SQL)


def downgrade() -> None:
    op.get_bind().exec_driver_sql(DOWNGRADE_SQL)
