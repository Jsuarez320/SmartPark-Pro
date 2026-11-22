import uuid
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.errors import NegocioError, traducir_errores
from app.schemas.vehiculo import (
    ConsultaResponse,
    EntradaRequest,
    EntradaResponse,
    MembresiaVigente,
    MensualOut,
    PatioItem,
    PrecioRequest,
    PrecioResponse,
    SalidaRequest,
    SalidaResponse,
    StatsOut,
    VehiculoOut,
)


def entero(valor: Decimal | int | None) -> int:
    return int(valor or 0)


def buscar_tarifa(db: Session, plan: str, tipo: str):
    fila = db.execute(
        text(
            """
            SELECT t.id, t.valor, p.nombre AS plan_nombre
            FROM tarifas t
            JOIN planes p ON p.id = t.plan_id
            JOIN tipos_vehiculo tv ON tv.id = t.tipo_vehiculo_id
            WHERE p.tipo = :plan AND p.activo AND lower(tv.nombre) = :tipo
            """
        ),
        {"plan": plan, "tipo": tipo},
    ).mappings().first()
    if fila is None:
        raise NegocioError(422, f"No hay tarifa configurada para el plan «{plan}» de {tipo}")
    return fila


def calcular_precio(db: Session, data: PrecioRequest) -> PrecioResponse:
    tarifa = buscar_tarifa(db, data.plan, data.tipo)
    return PrecioResponse(monto=entero(tarifa["valor"]), concepto=tarifa["plan_nombre"])


def _membresia_vigente(db: Session, vehiculo_id: uuid.UUID):
    return db.execute(
        text(
            """
            SELECT m.id, m.tarifa_id, m.fecha_fin, p.nombre AS plan
            FROM membresias m JOIN planes p ON p.id = m.plan_id
            WHERE m.vehiculo_id = :v AND m.estado = 'activa'
              AND m.fecha_inicio <= CURRENT_DATE AND m.fecha_fin >= CURRENT_DATE
            ORDER BY m.fecha_fin DESC LIMIT 1
            """
        ),
        {"v": vehiculo_id},
    ).mappings().first()


def consultar_placa(db: Session, placa: str) -> ConsultaResponse:
    veh = db.execute(
        text(
            """
            SELECT v.id, lower(tv.nombre) AS tipo
            FROM vehiculos v JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
            WHERE v.placa = :placa
            """
        ),
        {"placa": placa},
    ).mappings().first()
    if veh is None:
        return ConsultaResponse(placa=placa, registrado=False)
    mem = _membresia_vigente(db, veh["id"])
    return ConsultaResponse(
        placa=placa,
        registrado=True,
        tipo=veh["tipo"],
        membresia=MembresiaVigente(plan=mem["plan"], fecha_fin=mem["fecha_fin"]) if mem else None,
    )


def registrar_entrada(db: Session, data: EntradaRequest, usuario_id: uuid.UUID) -> EntradaResponse:
    with traducir_errores(db):
        veh = db.execute(
            text(
                """
                SELECT v.id, lower(tv.nombre) AS tipo
                FROM vehiculos v JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
                WHERE v.placa = :placa FOR UPDATE OF v
                """
            ),
            {"placa": data.placa},
        ).mappings().first()

        if veh is not None and veh["tipo"] != data.tipo:
            raise NegocioError(
                409, f"La placa {data.placa} está registrada como {veh['tipo']}, no como {data.tipo}"
            )

        if veh is None:
            vehiculo_id = db.execute(
                text(
                    """
                    INSERT INTO vehiculos (tipo_vehiculo_id, placa, marca)
                    VALUES ((SELECT id FROM tipos_vehiculo WHERE lower(nombre) = :tipo), :placa, :marca)
                    RETURNING id
                    """
                ),
                {"tipo": data.tipo, "placa": data.placa, "marca": data.marca},
            ).scalar_one()
        else:
            vehiculo_id = veh["id"]
            if data.marca:
                db.execute(
                    text("UPDATE vehiculos SET marca = :marca WHERE id = :id"),
                    {"marca": data.marca, "id": vehiculo_id},
                )

        # Un vehículo con membresía vigente siempre ingresa bajo su membresía
        mem = _membresia_vigente(db, vehiculo_id)
        if mem:
            tarifa_id = mem["tarifa_id"]
            tarifa_valor = db.execute(
                text("SELECT valor FROM tarifas WHERE id = :id"), {"id": tarifa_id}
            ).scalar_one()
            plan_nombre = mem["plan"]
            membresia_id = mem["id"]
            # Mensual: la tarjeta física es obligatoria
            if not data.tarjeta:
                raise NegocioError(422, "Los clientes mensuales ingresan con tarjeta: indica el código")
            codigo = data.tarjeta
        else:
            tarifa = buscar_tarifa(db, data.plan, data.tipo)
            tarifa_id, tarifa_valor = tarifa["id"], tarifa["valor"]
            plan_nombre = tarifa["plan_nombre"]
            membresia_id = None
            # Diario: sin tarjeta; se emite un tiquete numerado (se imprime el recibo)
            codigo = "D-%06d" % db.execute(text("SELECT nextval('seq_tiquete_diario')")).scalar_one()

        ingreso = db.execute(
            text(
                """
                INSERT INTO ingresos (vehiculo_id, tarifa_id, tarifa_valor, membresia_id,
                                      operador_id, tarjeta_codigo, placa_capturada)
                VALUES (:v, :t, :tv, :m, :op, :tarjeta, :placa)
                RETURNING id, fecha_ingreso
                """
            ),
            {
                "v": vehiculo_id, "t": tarifa_id, "tv": tarifa_valor, "m": membresia_id,
                "op": usuario_id, "tarjeta": codigo, "placa": data.placa,
            },
        ).mappings().one()
        db.commit()

    es_mensual = membresia_id is not None
    return EntradaResponse(
        id=str(ingreso["id"]),
        estado="activo",
        tarjeta=codigo,
        placa=data.placa,
        tipo=data.tipo,
        plan=plan_nombre,
        membresia=es_mensual,
        tarifa=0 if es_mensual else entero(tarifa_valor),
        marca=data.marca,
        hora_ingreso=ingreso["fecha_ingreso"],
        mensaje=(
            f"Vehículo {data.placa} ingresado con la tarjeta {codigo}"
            if es_mensual
            else f"Vehículo {data.placa} ingresado. Tiquete {codigo}"
        ),
    )


def _patio_item(fila) -> PatioItem:
    return PatioItem(
        ingreso_id=str(fila["ingreso_id"]),
        tarjeta=fila["tarjeta_codigo"],
        placa=fila["placa"],
        tipo=fila["tipo"],
        plan=fila["plan"],
        membresia=fila["es_membresia"],
        cliente=fila["cliente"],
        fecha_ingreso=fila["fecha_ingreso"],
        minutos=fila["minutos_transcurridos"],
        bloques=fila["bloques_estimados"],
        valor=entero(fila["valor_estimado"]),
    )


_PATIO_SELECT = """
    SELECT ingreso_id, tarjeta_codigo, placa, lower(tipo_vehiculo) AS tipo, plan, es_membresia,
           cliente, fecha_ingreso, minutos_transcurridos, bloques_estimados, valor_estimado
    FROM v_vehiculos_dentro
"""


def listar_patio(db: Session, q: str | None) -> list[PatioItem]:
    filas = db.execute(
        text(_PATIO_SELECT + " WHERE (CAST(:q AS TEXT) IS NULL OR placa ILIKE CAST(:like AS TEXT) OR tarjeta_codigo ILIKE CAST(:like AS TEXT))"),
        {"q": q, "like": f"%{q}%" if q else None},
    ).mappings().all()
    return [_patio_item(f) for f in filas]


def obtener_patio(db: Session, ingreso_id: uuid.UUID) -> PatioItem:
    fila = db.execute(
        text(_PATIO_SELECT + " WHERE ingreso_id = :id"), {"id": ingreso_id}
    ).mappings().first()
    if fila is None:
        raise NegocioError(404, "El vehículo ya no está en el parqueadero")
    return _patio_item(fila)


def registrar_salida(db: Session, data: SalidaRequest, usuario_id: uuid.UUID) -> SalidaResponse:
    try:
        ingreso_id = uuid.UUID(data.ingreso_id)
        convenio_id = uuid.UUID(data.convenio_id) if data.convenio_id else None
    except ValueError:
        raise NegocioError(422, "Identificador inválido")

    with traducir_errores(db):
        ing = db.execute(
            text(
                """
                SELECT i.id, i.tarifa_id, i.tarifa_valor, i.fecha_ingreso, i.tarjeta_codigo,
                       v.placa, lower(tv.nombre) AS tipo, p.nombre AS plan,
                       ROUND(EXTRACT(EPOCH FROM (NOW() - i.fecha_ingreso)) / 60)::INT AS minutos
                FROM ingresos i
                JOIN vehiculos v ON v.id = i.vehiculo_id
                JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
                JOIN tarifas t ON t.id = i.tarifa_id
                JOIN planes p ON p.id = t.plan_id
                WHERE i.id = :id AND i.estado = 'activo'
                FOR UPDATE OF i
                """
            ),
            {"id": ingreso_id},
        ).mappings().first()
        if ing is None:
            raise NegocioError(404, "El vehículo ya no está en el parqueadero")

        horas = 0
        if convenio_id:
            horas = db.execute(
                text("SELECT horas_descuento FROM convenios WHERE id = :id AND activo"),
                {"id": convenio_id},
            ).scalar()
            if horas is None:
                raise NegocioError(404, "Convenio no encontrado o inactivo")

        cobro = db.execute(
            text("SELECT * FROM calcular_cobro(:t, :min, :h, :valor)"),
            {"t": ing["tarifa_id"], "min": ing["minutos"], "h": horas, "valor": ing["tarifa_valor"]},
        ).mappings().one()
        total = entero(cobro["valor_total"])

        if total > 0:
            if data.metodo_pago is None:
                raise NegocioError(422, "Indica el método de pago")
            abierto = db.execute(text("SELECT 1 FROM turnos_caja WHERE estado = 'abierta'")).first()
            if abierto is None:
                raise NegocioError(409, "No hay un turno de caja abierto. Abre la caja primero.")

        salida = db.execute(
            text(
                """
                INSERT INTO salidas (ingreso_id, operador_id, convenio_id, minutos_totales,
                                     horas_descontadas, minutos_cobrados, tarifa_valor_bloque,
                                     bloques, valor_plan, tope_aplicado, valor_cobrado)
                VALUES (:ing, :op, :conv, :min, :h, :mc, :vb, :bl, :vp, :tope, :total)
                RETURNING id, fecha_salida
                """
            ),
            {
                "ing": ingreso_id, "op": usuario_id, "conv": convenio_id, "min": ing["minutos"],
                "h": horas, "mc": cobro["minutos_cobrados"], "vb": cobro["valor_bloque"],
                "bl": cobro["bloques"], "vp": cobro["valor_plan"], "tope": cobro["tope_aplicado"],
                "total": cobro["valor_total"],
            },
        ).mappings().one()

        factura = ""
        if total > 0:
            pago_id = db.execute(
                text(
                    """
                    INSERT INTO pagos (salida_id, operador_id, metodo, monto, referencia, estado)
                    VALUES (:s, :op, :metodo, :monto, :ref, 'pagado') RETURNING id
                    """
                ),
                {
                    "s": salida["id"], "op": usuario_id, "metodo": data.metodo_pago,
                    "monto": cobro["valor_total"], "ref": data.referencia,
                },
            ).scalar_one()
            factura = db.execute(
                text("SELECT numero FROM facturas WHERE pago_id = :p"), {"p": pago_id}
            ).scalar_one()
        db.commit()

    return SalidaResponse(
        ticket=factura or str(ingreso_id)[:8].upper(),
        placa=ing["placa"],
        tarjeta=ing["tarjeta_codigo"],
        tipo=ing["tipo"],
        plan=ing["plan"],
        hora_ingreso=ing["fecha_ingreso"],
        hora_salida=salida["fecha_salida"],
        minutos=ing["minutos"],
        bloques=cobro["bloques"],
        valor_bloque=entero(cobro["valor_bloque"]),
        tope_aplicado=cobro["tope_aplicado"],
        total=total,
        metodo_pago=data.metodo_pago if total > 0 else None,
    )


# ---------------------------------------------------------------- gestión (admin)

_ESTADO_MENSUAL = """
    CASE WHEN m.fecha_fin < CURRENT_DATE THEN 'vencido'
         WHEN m.fecha_fin - CURRENT_DATE <= 3 THEN 'por_vencer'
         WHEN m.fecha_fin - CURRENT_DATE <= 7 THEN 'alerta'
         ELSE 'activo' END
"""


def listar_vehiculos(db: Session, placa: str | None) -> list[VehiculoOut]:
    filas = db.execute(
        text(
            """
            SELECT v.placa, lower(tv.nombre) AS tipo, COALESCE(v.marca, '') AS marca,
                   COALESCE(c.nombres || ' ' || c.apellidos, '') AS propietario,
                   tiene_membresia_vigente(v.id) AS mensualidad,
                   to_char(v.created_at, 'YYYY-MM-DD') AS fecha_registro
            FROM vehiculos v
            JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
            LEFT JOIN clientes c ON c.id = v.cliente_id
            WHERE (CAST(:placa AS TEXT) IS NULL OR v.placa ILIKE CAST(:like AS TEXT))
            ORDER BY v.created_at DESC LIMIT 500
            """
        ),
        {"placa": placa, "like": f"%{placa}%" if placa else None},
    ).mappings().all()
    return [VehiculoOut(**f) for f in filas]


def _consulta_mensuales() -> str:
    return f"""
        SELECT DISTINCT ON (m.vehiculo_id)
               v.placa, c.nombres || ' ' || c.apellidos AS propietario, p.nombre AS plan,
               to_char(m.fecha_fin, 'YYYY-MM-DD') AS vencimiento, {_ESTADO_MENSUAL} AS estado
        FROM membresias m
        JOIN vehiculos v ON v.id = m.vehiculo_id
        JOIN clientes c ON c.id = m.cliente_id
        JOIN planes p ON p.id = m.plan_id
        WHERE m.estado = 'activa'
        ORDER BY m.vehiculo_id, m.fecha_fin DESC
    """


def listar_mensuales(db: Session) -> list[MensualOut]:
    filas = db.execute(text(_consulta_mensuales())).mappings().all()
    return sorted((MensualOut(**f) for f in filas), key=lambda m: m.vencimiento)


def estadisticas(db: Session) -> StatsOut:
    total = db.execute(text("SELECT COUNT(*) FROM vehiculos")).scalar_one()
    mensuales = db.execute(
        text(f"SELECT COUNT(*) FROM ({_consulta_mensuales()}) x WHERE estado <> 'vencido'")
    ).scalar_one()
    return StatsOut(total_placas=total, total_mensuales=mensuales)
