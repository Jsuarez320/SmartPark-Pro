from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.vehiculo import (
    EntradaRequest,
    EntradaResponse,
    PrecioRequest,
    PrecioResponse,
)
from app.services.vehiculo import (
    buscar_o_crear_vehiculo,
    obtener_admin_id,
    obtener_plan_id,
    obtener_tarifa,
    obtener_tipo_id,
    registrar_ingreso,
)

router = APIRouter(prefix="/vehiculos", tags=["Vehículos"])


@router.post("/calcular-precio", response_model=PrecioResponse)
async def calcular_precio(body: PrecioRequest, db: AsyncSession = Depends(get_db)):
    tipo_id = await obtener_tipo_id(db, body.tipo or "carro")
    if not tipo_id:
        raise HTTPException(status_code=400, detail="Tipo de vehículo inválido")

    plan_id = await obtener_plan_id(body.mensualidad or False, body.pagoDiario or False)
    tarifa = await obtener_tarifa(db, tipo_id, plan_id)
    if not tarifa:
        raise HTTPException(status_code=404, detail="No hay tarifa activa disponible")

    concepto = {3: "Pago diario", 4: "Mensualidad"}.get(
        plan_id, "Tarifa por minuto"
    )
    return PrecioResponse(monto=float(tarifa.valor), concepto=concepto)


@router.post("/entrada", response_model=EntradaResponse)
async def entrada(body: EntradaRequest, db: AsyncSession = Depends(get_db)):
    tipo_id = await obtener_tipo_id(db, body.tipo)
    if not tipo_id:
        raise HTTPException(status_code=400, detail="Tipo de vehículo inválido")

    plan_id = await obtener_plan_id(body.mensualidad, body.pagoDiario)
    tarifa = await obtener_tarifa(db, tipo_id, plan_id)
    if not tarifa:
        raise HTTPException(status_code=404, detail="No hay tarifa activa para ese tipo y plan")

    operador_id = await obtener_admin_id(db)
    if not operador_id:
        raise HTTPException(status_code=500, detail="No se encontró un operador por defecto")

    vehiculo = await buscar_o_crear_vehiculo(db, body.placa.upper(), tipo_id, body.marca)
    ingreso = await registrar_ingreso(
        db,
        vehiculo_id=str(vehiculo.id),
        placa=body.placa.upper(),
        plan_id=plan_id,
        tarifa_id=tarifa.id,
        operador_id=operador_id,
    )

    await db.commit()

    return EntradaResponse(
        id=str(ingreso.id),
        estado=ingreso.estado,
        total=float(tarifa.valor),
        mensaje=f"Vehículo con placa {body.placa.upper()} ingresado correctamente",
    )
