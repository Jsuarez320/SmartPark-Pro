from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.ingreso import IngresoResponse, RegistrarIngresoRequest, TarifaOut
from app.services.ingreso import (
    buscar_o_crear_vehiculo,
    obtener_tarifa_activa,
    obtener_tarifas,
    registrar_ingreso,
)

router = APIRouter(prefix="/ingresos", tags=["Ingresos"])


@router.get("/tarifas", response_model=list[TarifaOut])
async def listar_tarifas(db: AsyncSession = Depends(get_db)):
    return await obtener_tarifas(db)


@router.post("/registrar", response_model=IngresoResponse)
async def registrar(body: RegistrarIngresoRequest, db: AsyncSession = Depends(get_db)):
    tarifa = await obtener_tarifa_activa(db, body.tipo_vehiculo_id, body.plan_id)
    if not tarifa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay tarifa activa para ese tipo de vehiculo y plan",
        )

    vehiculo = await buscar_o_crear_vehiculo(db, body.placa.upper(), body.tipo_vehiculo_id)

    ingreso = await registrar_ingreso(
        db,
        vehiculo_id=str(vehiculo.id),
        placa=body.placa.upper(),
        plan_id=body.plan_id,
        tarifa_id=tarifa.id,
        operador_id=body.operador_id,
        notas=body.notas,
    )

    await db.commit()

    return IngresoResponse(
        mensaje=f"Vehiculo con placa {body.placa.upper()} ingresado correctamente",
        id=str(ingreso.id),
        vehiculo_id=str(ingreso.vehiculo_id),
        placa_capturada=ingreso.placa_capturada,
        plan_id=ingreso.plan_id,
        tarifa_id=ingreso.tarifa_id,
        tarifa_valor=float(tarifa.valor),
        operador_id=str(ingreso.operador_id),
        fecha_ingreso=ingreso.fecha_ingreso,
        estado=ingreso.estado,
        notas=ingreso.notas,
    )
