import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.errors import NegocioError, traducir_errores
from app.schemas.membresia import MembresiaRequest, MembresiaResponse
from app.services.vehiculo_service import buscar_tarifa, entero


def contratar_membresia(db: Session, data: MembresiaRequest, usuario_id: uuid.UUID) -> MembresiaResponse:
    tarifa = buscar_tarifa(db, data.plan, data.tipo)

    with traducir_errores(db):
        if db.execute(text("SELECT 1 FROM turnos_caja WHERE estado = 'abierta'")).first() is None:
            raise NegocioError(409, "No hay un turno de caja abierto. Abre la caja primero.")

        cliente_id = db.execute(
            text(
                """
                INSERT INTO clientes (tipo, nombres, apellidos, documento, tipo_documento, telefono)
                VALUES ('mensual', :n, :a, :doc, :td, :tel)
                ON CONFLICT (documento, tipo_documento) DO UPDATE
                   SET nombres = EXCLUDED.nombres, apellidos = EXCLUDED.apellidos,
                       telefono = COALESCE(EXCLUDED.telefono, clientes.telefono), tipo = 'mensual'
                RETURNING id
                """
            ),
            {"n": data.nombres, "a": data.apellidos, "doc": data.documento,
             "td": data.tipo_documento, "tel": data.telefono},
        ).scalar_one()

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
                    INSERT INTO vehiculos (cliente_id, tipo_vehiculo_id, placa, marca)
                    VALUES (:c, (SELECT id FROM tipos_vehiculo WHERE lower(nombre) = :tipo), :placa, :marca)
                    RETURNING id
                    """
                ),
                {"c": cliente_id, "tipo": data.tipo, "placa": data.placa, "marca": data.marca},
            ).scalar_one()
        else:
            vehiculo_id = veh["id"]
            db.execute(
                text("UPDATE vehiculos SET cliente_id = :c, marca = COALESCE(:marca, marca) WHERE id = :id"),
                {"c": cliente_id, "marca": data.marca, "id": vehiculo_id},
            )

        # Si ya tiene una vigente, la nueva empieza al día siguiente de su vencimiento (renovación)
        mem = db.execute(
            text(
                """
                WITH inicio AS (
                    SELECT GREATEST(CURRENT_DATE, COALESCE(MAX(fecha_fin) + 1, CURRENT_DATE)) AS d
                    FROM membresias WHERE vehiculo_id = :v AND estado = 'activa'
                )
                INSERT INTO membresias (cliente_id, vehiculo_id, plan_id, tarifa_id,
                                        fecha_inicio, fecha_fin, valor_pagado, creado_por)
                SELECT :c, :v, (SELECT id FROM planes WHERE tipo = :plan), :t,
                       d, ((d + INTERVAL '1 month')::DATE - 1), :valor, :u
                FROM inicio
                RETURNING id, fecha_inicio, fecha_fin
                """
            ),
            {"c": cliente_id, "v": vehiculo_id, "plan": data.plan, "t": tarifa["id"],
             "valor": tarifa["valor"], "u": usuario_id},
        ).mappings().one()

        pago_id = db.execute(
            text(
                """
                INSERT INTO pagos (membresia_id, operador_id, metodo, monto, referencia, estado)
                VALUES (:m, :u, :metodo, :monto, :ref, 'pagado') RETURNING id
                """
            ),
            {"m": mem["id"], "u": usuario_id, "metodo": data.metodo_pago,
             "monto": tarifa["valor"], "ref": data.referencia},
        ).scalar_one()
        factura = db.execute(
            text("SELECT numero FROM facturas WHERE pago_id = :p"), {"p": pago_id}
        ).scalar_one()
        db.commit()

    return MembresiaResponse(
        id=str(mem["id"]),
        placa=data.placa,
        plan=tarifa["plan_nombre"],
        fecha_inicio=mem["fecha_inicio"],
        fecha_fin=mem["fecha_fin"],
        valor=entero(tarifa["valor"]),
        factura=factura,
    )
