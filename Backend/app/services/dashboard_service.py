from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.dashboard import DashboardOut
from app.services.caja_service import MOVIMIENTOS_SQL, _transaccion
from app.services.vehiculo_service import entero, estadisticas


def obtener_dashboard(db: Session) -> DashboardOut:
    patio = db.execute(
        text(
            """
            SELECT COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE lower(tv.nombre) = 'carro') AS carros,
                   COUNT(*) FILTER (WHERE lower(tv.nombre) = 'moto') AS motos
            FROM ingresos i
            JOIN vehiculos v ON v.id = i.vehiculo_id
            JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
            WHERE i.estado = 'activo'
            """
        )
    ).mappings().one()

    ingresos_hoy = db.execute(
        text(
            "SELECT COALESCE(SUM(monto), 0) FROM caja_transacciones "
            "WHERE tipo = 'ingreso' AND created_at >= date_trunc('day', NOW())"
        )
    ).scalar_one()

    promedio = db.execute(
        text("SELECT ROUND(AVG(minutos_totales)) FROM salidas WHERE fecha_salida >= date_trunc('day', NOW())")
    ).scalar_one()

    recientes = db.execute(
        text(MOVIMIENTOS_SQL + " ORDER BY ct.created_at DESC LIMIT 8")
    ).mappings().all()

    return DashboardOut(
        vehiculos_en_patio=patio["total"],
        carros_en_patio=patio["carros"],
        motos_en_patio=patio["motos"],
        ingresos_hoy=entero(ingresos_hoy),
        clientes_mensuales=estadisticas(db).total_mensuales,
        tiempo_promedio_min=int(promedio) if promedio is not None else None,
        recientes=[_transaccion(f) for f in recientes],
    )
