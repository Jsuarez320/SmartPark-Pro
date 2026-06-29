from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def obtener_tipo_id(db: AsyncSession, tipo: str) -> int | None:
    tipo_map = {"carro": 1, "moto": 2}
    return tipo_map.get(tipo.lower())


async def obtener_plan_id(mensualidad: bool, pago_diario: bool) -> int:
    if mensualidad:
        return 4
    if pago_diario:
        return 3
    return 1


async def obtener_tarifa(
    db: AsyncSession, tipo_vehiculo_id: int, plan_id: int
):
    result = await db.execute(
        text(
            "SELECT id, plan_id, tipo_vehiculo_id, valor "
            "FROM tarifas "
            "WHERE tipo_vehiculo_id = :tipo_vehiculo_id "
            "AND plan_id = :plan_id "
            "AND vigente_desde <= CURRENT_DATE "
            "AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE) "
            "ORDER BY vigente_desde DESC LIMIT 1"
        ),
        {"tipo_vehiculo_id": tipo_vehiculo_id, "plan_id": plan_id},
    )
    return result.fetchone()


async def obtener_admin_id(db: AsyncSession) -> str | None:
    result = await db.execute(
        text("SELECT id FROM usuarios WHERE username = 'admin' LIMIT 1")
    )
    row = result.fetchone()
    return str(row.id) if row else None


async def buscar_o_crear_vehiculo(db: AsyncSession, placa: str, tipo_vehiculo_id: int, marca: str = ""):
    result = await db.execute(
        text("SELECT id, placa, marca, color, tipo_vehiculo_id FROM vehiculos WHERE placa = :placa"),
        {"placa": placa},
    )
    vehiculo = result.fetchone()
    if vehiculo:
        return vehiculo

    result = await db.execute(
        text(
            "INSERT INTO vehiculos (placa, tipo_vehiculo_id, marca, activo) "
            "VALUES (:placa, :tipo_vehiculo_id, :marca, true) "
            "RETURNING id, placa, marca, color, tipo_vehiculo_id"
        ),
        {"placa": placa, "tipo_vehiculo_id": tipo_vehiculo_id, "marca": marca},
    )
    return result.fetchone()


async def registrar_ingreso(
    db: AsyncSession,
    vehiculo_id: str,
    placa: str,
    plan_id: int,
    tarifa_id: int,
    operador_id: str,
):
    result = await db.execute(
        text(
            "INSERT INTO ingresos (vehiculo_id, plan_id, tarifa_id, operador_id, placa_capturada) "
            "VALUES (:vehiculo_id, :plan_id, :tarifa_id, :operador_id, :placa) "
            "RETURNING id, vehiculo_id, placa_capturada, plan_id, tarifa_id, operador_id, fecha_ingreso, estado"
        ),
        {
            "vehiculo_id": vehiculo_id,
            "plan_id": plan_id,
            "tarifa_id": tarifa_id,
            "operador_id": operador_id,
            "placa": placa,
        },
    )
    return result.fetchone()
