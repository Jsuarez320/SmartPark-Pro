from datetime import date

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def obtener_tarifa_activa(
    db: AsyncSession, tipo_vehiculo_id: int, plan_id: int
):
    result = await db.execute(
        text(
            "SELECT id, plan_id, tipo_vehiculo_id, valor, vigente_desde, vigente_hasta "
            "FROM tarifas "
            "WHERE tipo_vehiculo_id = :tipo_vehiculo_id "
            "AND plan_id = :plan_id "
            "AND vigente_desde <= CURRENT_DATE "
            "AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE) "
            "ORDER BY vigente_desde DESC "
            "LIMIT 1"
        ),
        {
            "tipo_vehiculo_id": tipo_vehiculo_id,
            "plan_id": plan_id,
        },
    )
    return result.fetchone()


async def obtener_tarifas(db: AsyncSession):
    result = await db.execute(
        text(
            "SELECT t.id, t.plan_id, p.nombre as plan_nombre, t.tipo_vehiculo_id, "
            "tv.nombre as tipo_vehiculo_nombre, t.valor, "
            "t.vigente_desde::text, t.vigente_hasta::text "
            "FROM tarifas t "
            "JOIN planes p ON p.id = t.plan_id "
            "JOIN tipos_vehiculo tv ON tv.id = t.tipo_vehiculo_id "
            "ORDER BY tv.nombre, p.id"
        )
    )
    return [
        {
            "id": r.id,
            "plan_id": r.plan_id,
            "plan_nombre": r.plan_nombre,
            "tipo_vehiculo_id": r.tipo_vehiculo_id,
            "tipo_vehiculo_nombre": r.tipo_vehiculo_nombre,
            "valor": float(r.valor),
            "vigente_desde": str(r.vigente_desde),
            "vigente_hasta": str(r.vigente_hasta) if r.vigente_hasta else None,
        }
        for r in result
    ]


async def buscar_o_crear_vehiculo(db: AsyncSession, placa: str, tipo_vehiculo_id: int):
    result = await db.execute(
        text("SELECT id, placa, marca, color, tipo_vehiculo_id FROM vehiculos WHERE placa = :placa"),
        {"placa": placa},
    )
    vehiculo = result.fetchone()
    if vehiculo:
        return vehiculo

    result = await db.execute(
        text(
            "INSERT INTO vehiculos (placa, tipo_vehiculo_id, activo) "
            "VALUES (:placa, :tipo_vehiculo_id, true) "
            "RETURNING id, placa, marca, color, tipo_vehiculo_id"
        ),
        {"placa": placa, "tipo_vehiculo_id": tipo_vehiculo_id},
    )
    return result.fetchone()


async def registrar_ingreso(
    db: AsyncSession,
    vehiculo_id: str,
    placa: str,
    plan_id: int,
    tarifa_id: int,
    operador_id: str,
    notas: str | None = None,
):
    result = await db.execute(
        text(
            "INSERT INTO ingresos (vehiculo_id, plan_id, tarifa_id, operador_id, placa_capturada, notas) "
            "VALUES (:vehiculo_id, :plan_id, :tarifa_id, :operador_id, :placa, :notas) "
            "RETURNING id, vehiculo_id, placa_capturada, plan_id, tarifa_id, operador_id, fecha_ingreso, estado, notas"
        ),
        {
            "vehiculo_id": vehiculo_id,
            "plan_id": plan_id,
            "tarifa_id": tarifa_id,
            "operador_id": operador_id,
            "placa": placa,
            "notas": notas,
        },
    )
    return result.fetchone()
