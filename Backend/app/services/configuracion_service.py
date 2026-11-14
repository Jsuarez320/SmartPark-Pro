import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.errors import NegocioError
from app.schemas.configuracion import ActualizarTarifasRequest, ConfiguracionOut, TarifaOut
from app.services.vehiculo_service import entero


def obtener_configuracion(db: Session) -> ConfiguracionOut:
    filas = db.execute(
        text(
            """
            SELECT t.id, p.nombre AS plan, lower(tv.nombre) AS tipo, t.valor
            FROM tarifas t
            JOIN planes p ON p.id = t.plan_id
            JOIN tipos_vehiculo tv ON tv.id = t.tipo_vehiculo_id
            ORDER BY tv.id, p.id
            """
        )
    ).mappings().all()
    tarifas: dict[str, list[TarifaOut]] = {"carro": [], "moto": []}
    for f in filas:
        tarifas[f["tipo"]].append(
            TarifaOut(id=f["id"], plan=f["plan"], label=f["plan"], value=entero(f["valor"]))
        )
    return ConfiguracionOut(tarifas=tarifas)  # type: ignore[arg-type]


def actualizar_tarifas(db: Session, data: ActualizarTarifasRequest, usuario_id: uuid.UUID) -> ConfiguracionOut:
    for t in data.tarifas:
        res = db.execute(
            text("UPDATE tarifas SET valor = :v, actualizado_por = :u WHERE id = :id"),
            {"v": t.value, "u": usuario_id, "id": t.id},
        )
        if res.rowcount == 0:
            db.rollback()
            raise NegocioError(404, f"La tarifa {t.id} no existe")
    db.commit()
    return obtener_configuracion(db)
