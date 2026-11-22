from sqlalchemy.orm import Session

from app.core.dinero import entero
from app.repositories import dashboard_repository
from app.repositories import membresia_repository
from app.schemas.dashboard import DashboardOut
from app.services import caja_service, tarifa_service
from app.services.vigencia import estado_mensualidad, hoy_en_colombia
from app.repositories.operacion_repository import ahora_del_servidor


def obtener_dashboard(db: Session) -> DashboardOut:
    total, carros, motos = dashboard_repository.patio_por_tipo(db)
    promedio = dashboard_repository.promedio_minutos_de_hoy(db)

    hoy = hoy_en_colombia(ahora_del_servidor(db))
    umbral = tarifa_service.obtener_configuracion(db).umbral_vencimiento_dias
    mensuales = sum(
        1
        for f in membresia_repository.listar_mensualidades(db)
        if estado_mensualidad(f.membresia.fecha_fin, hoy, umbral) != "vencida"
    )

    return DashboardOut(
        vehiculos_en_patio=total,
        carros_en_patio=carros,
        motos_en_patio=motos,
        ingresos_hoy=entero(dashboard_repository.ingresos_de_hoy(db)),
        clientes_mensuales=mensuales,
        tiempo_promedio_min=int(promedio) if promedio is not None else None,
        recientes=caja_service.movimientos_recientes(db, 8),
    )

