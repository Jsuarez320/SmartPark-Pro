from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def obtener_turno_activo(db: AsyncSession, admin_id: str):
    result = await db.execute(
        text(
            "SELECT tc.id, tc.admin_id, u.nombre || ' ' || u.apellido as admin_nombre, "
            "tc.fecha_apertura, tc.monto_inicial, tc.fecha_cierre, tc.monto_cierre, "
            "tc.estado, tc.notas "
            "FROM turnos_caja tc "
            "JOIN usuarios u ON u.id = tc.admin_id "
            "WHERE tc.admin_id = :admin_id AND tc.estado = 'abierta' "
            "ORDER BY tc.fecha_apertura DESC LIMIT 1"
        ),
        {"admin_id": admin_id},
    )
    return result.fetchone()


async def abrir_turno(
    db: AsyncSession, admin_id: str, monto_inicial: float
):
    result = await db.execute(
        text(
            "INSERT INTO turnos_caja (admin_id, monto_inicial) "
            "VALUES (:admin_id, :monto_inicial) "
            "RETURNING id, admin_id, fecha_apertura, monto_inicial, fecha_cierre, monto_cierre, estado, notas"
        ),
        {"admin_id": admin_id, "monto_inicial": monto_inicial},
    )
    return result.fetchone()


async def cerrar_turno(
    db: AsyncSession, turno_id: str, monto_cierre: float, notas: str | None
):
    result = await db.execute(
        text(
            "UPDATE turnos_caja SET estado = 'cerrada', fecha_cierre = NOW(), "
            "monto_cierre = :monto_cierre, notas = :notas "
            "WHERE id = :turno_id AND estado = 'abierta' "
            "RETURNING id, admin_id, fecha_apertura, monto_inicial, fecha_cierre, monto_cierre, estado, notas"
        ),
        {"turno_id": turno_id, "monto_cierre": monto_cierre, "notas": notas},
    )
    return result.fetchone()


async def registrar_transaccion(
    db: AsyncSession,
    turno_id: str,
    tipo: str,
    concepto: str,
    metodo: str,
    monto: float,
    pago_id: str | None = None,
):
    result = await db.execute(
        text(
            "INSERT INTO caja_transacciones (turno_id, tipo, concepto, metodo, monto, pago_id) "
            "VALUES (:turno_id, :tipo, :concepto, :metodo, :monto, :pago_id) "
            "RETURNING id, turno_id, tipo, concepto, metodo, monto, pago_id, created_at"
        ),
        {
            "turno_id": turno_id,
            "tipo": tipo,
            "concepto": concepto,
            "metodo": metodo,
            "monto": monto,
            "pago_id": pago_id,
        },
    )
    return result.fetchone()


async def listar_transacciones(db: AsyncSession, turno_id: str):
    result = await db.execute(
        text(
            "SELECT id, turno_id, tipo, concepto, metodo, monto, pago_id, created_at "
            "FROM caja_transacciones WHERE turno_id = :turno_id "
            "ORDER BY created_at DESC"
        ),
        {"turno_id": turno_id},
    )
    return result.fetchall()


async def obtener_resumen_turno(db: AsyncSession, turno_id: str):
    result = await db.execute(
        text(
            "SELECT "
            "COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) as total_ingresos, "
            "COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos "
            "FROM caja_transacciones WHERE turno_id = :turno_id"
        ),
        {"turno_id": turno_id},
    )
    return result.fetchone()
