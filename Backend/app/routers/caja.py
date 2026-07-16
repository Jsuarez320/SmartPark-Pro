from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import require_employee
from app.schemas.caja import (
    AbrirCajaRequest,
    CerrarCajaRequest,
    MovimientosResponse,
    TransaccionRequest,
    TransaccionResponse,
    TurnoCajaResponse,
)
from app.services.caja import (
    abrir_turno,
    cerrar_turno,
    listar_transacciones,
    obtener_resumen_turno,
    obtener_turno_activo,
    registrar_transaccion,
)

router = APIRouter(prefix="/caja", tags=["Caja"])


@router.post("/abrir", response_model=TurnoCajaResponse)
async def abrir(
    body: AbrirCajaRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_employee),
):
    activo = await obtener_turno_activo(db, str(current_user.id))
    if activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya tienes un turno de caja abierto",
        )

    turno = await abrir_turno(db, str(current_user.id), body.monto_inicial)
    await db.commit()

    return TurnoCajaResponse(
        id=str(turno.id),
        admin_id=str(turno.admin_id),
        admin_nombre=f"{current_user.nombre} {current_user.apellido}",
        fecha_apertura=turno.fecha_apertura,
        monto_inicial=float(turno.monto_inicial),
        estado="abierta",
    )


@router.post("/cerrar", response_model=TurnoCajaResponse)
async def cerrar(
    body: CerrarCajaRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_employee),
):
    activo = await obtener_turno_activo(db, str(current_user.id))
    if not activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un turno de caja abierto",
        )

    turno = await cerrar_turno(
        db, str(activo.id), body.monto_cierre, body.notas
    )
    await db.commit()

    return TurnoCajaResponse(
        id=str(turno.id),
        admin_id=str(turno.admin_id),
        admin_nombre=f"{current_user.nombre} {current_user.apellido}",
        fecha_apertura=turno.fecha_apertura,
        monto_inicial=float(turno.monto_inicial),
        fecha_cierre=turno.fecha_cierre,
        monto_cierre=float(turno.monto_cierre) if turno.monto_cierre else None,
        estado=turno.estado,
        notas=turno.notas,
    )


@router.get("/turno-activo", response_model=TurnoCajaResponse | None)
async def turno_activo(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_employee),
):
    turno = await obtener_turno_activo(db, str(current_user.id))
    if not turno:
        return None

    return TurnoCajaResponse(
        id=str(turno.id),
        admin_id=str(turno.admin_id),
        admin_nombre=turno.admin_nombre or f"{current_user.nombre} {current_user.apellido}",
        fecha_apertura=turno.fecha_apertura,
        monto_inicial=float(turno.monto_inicial),
        fecha_cierre=turno.fecha_cierre,
        monto_cierre=float(turno.monto_cierre) if turno.monto_cierre else None,
        estado=turno.estado,
        notas=turno.notas,
    )


@router.post("/transaccion", response_model=TransaccionResponse)
async def crear_transaccion(
    body: TransaccionRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_employee),
):
    activo = await obtener_turno_activo(db, str(current_user.id))
    if not activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes abrir un turno de caja primero",
        )

    transaccion = await registrar_transaccion(
        db,
        turno_id=str(activo.id),
        tipo=body.tipo,
        concepto=body.concepto,
        metodo=body.metodo,
        monto=body.monto,
        pago_id=body.pago_id,
    )
    await db.commit()

    return TransaccionResponse(
        id=str(transaccion.id),
        turno_id=str(transaccion.turno_id),
        tipo=transaccion.tipo,
        concepto=transaccion.concepto,
        metodo=transaccion.metodo,
        monto=float(transaccion.monto),
        pago_id=str(transaccion.pago_id) if transaccion.pago_id else None,
        created_at=transaccion.created_at,
    )


@router.get("/movimientos", response_model=MovimientosResponse)
async def movimientos(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_employee),
):
    activo = await obtener_turno_activo(db, str(current_user.id))
    if not activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un turno de caja abierto",
        )

    transacciones = await listar_transacciones(db, str(activo.id))
    resumen = await obtener_resumen_turno(db, str(activo.id))

    total_ingresos = float(resumen.total_ingresos)
    total_egresos = float(resumen.total_egresos)

    return MovimientosResponse(
        transacciones=[
            TransaccionResponse(
                id=str(t.id),
                turno_id=str(t.turno_id),
                tipo=t.tipo,
                concepto=t.concepto,
                metodo=t.metodo,
                monto=float(t.monto),
                pago_id=str(t.pago_id) if t.pago_id else None,
                created_at=t.created_at,
            )
            for t in transacciones
        ],
        total_ingresos=total_ingresos,
        total_egresos=total_egresos,
        saldo_actual=float(activo.monto_inicial) + total_ingresos - total_egresos,
    )
