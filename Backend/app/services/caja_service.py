import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.errors import NegocioError, traducir_errores
from app.schemas.caja import (
    AbrirTurnoRequest,
    CerrarTurnoRequest,
    Desglose,
    PorConcepto,
    Transaccion,
    TurnoActual,
    TurnoHistorial,
)
from app.services.vehiculo_service import entero

_UNIDADES = {"Día": "day", "Semana": "week", "Mes": "month", "Año": "year"}

# Movimientos de caja con vehículo y plan asociados (pago de salida o de membresía)
MOVIMIENTOS_SQL = """
    SELECT ct.id, ct.monto, ct.metodo, ct.concepto, ct.created_at,
           v.placa, lower(tv.nombre) AS tipo, p.tipo AS plan_tipo
    FROM caja_transacciones ct
    JOIN pagos pg ON pg.id = ct.pago_id
    LEFT JOIN salidas s ON s.id = pg.salida_id
    LEFT JOIN ingresos i ON i.id = s.ingreso_id
    LEFT JOIN membresias m ON m.id = pg.membresia_id
    JOIN vehiculos v ON v.id = COALESCE(i.vehiculo_id, m.vehiculo_id)
    JOIN tipos_vehiculo tv ON tv.id = v.tipo_vehiculo_id
    JOIN tarifas t ON t.id = COALESCE(i.tarifa_id, m.tarifa_id)
    JOIN planes p ON p.id = t.plan_id
    WHERE ct.tipo = 'ingreso'
"""


def _transaccion(f) -> Transaccion:
    return Transaccion(
        id=str(f["id"]), placa=f["placa"], tipo=f["tipo"], concepto=f["concepto"],
        monto=entero(f["monto"]), metodo_pago=f["metodo"], fecha=f["created_at"],
    )


def turno_actual(db: Session) -> TurnoActual | None:
    f = db.execute(text("SELECT * FROM v_resumen_turno_actual")).mappings().first()
    if f is None:
        return None
    return TurnoActual(
        turno_id=str(f["turno_id"]), abierto_por=f["abierto_por"], fecha_apertura=f["fecha_apertura"],
        monto_inicial=entero(f["monto_inicial"]), total_transacciones=f["total_transacciones"],
        total_recaudado=entero(f["total_recaudado"]), efectivo=entero(f["efectivo"]),
        otros_metodos=entero(f["otros_metodos"]), total_esperado_caja=entero(f["total_esperado_caja"]),
    )


def abrir_turno(db: Session, data: AbrirTurnoRequest, usuario_id: uuid.UUID) -> TurnoActual:
    with traducir_errores(db):
        db.execute(
            text("INSERT INTO turnos_caja (usuario_id, monto_inicial) VALUES (:u, :m)"),
            {"u": usuario_id, "m": data.monto_inicial},
        )
        db.commit()
    return turno_actual(db)  # type: ignore[return-value]


def cerrar_turno(db: Session, data: CerrarTurnoRequest, usuario_id: uuid.UUID) -> TurnoHistorial:
    with traducir_errores(db):
        turno_id = db.execute(
            text("SELECT cerrar_turno_caja(:u, :m, :n)"),
            {"u": usuario_id, "m": data.monto_contado, "n": data.notas},
        ).scalar_one()
        db.commit()
    return _historial(db, turno_id)[0]


def _historial(db: Session, turno_id: uuid.UUID | None = None, limite: int = 50) -> list[TurnoHistorial]:
    filas = db.execute(
        text(
            """
            SELECT * FROM v_historial_turnos
            WHERE (CAST(:id AS UUID) IS NULL OR turno_id = CAST(:id AS UUID))
            LIMIT :lim
            """
        ),
        {"id": turno_id, "lim": limite},
    ).mappings().all()
    return [
        TurnoHistorial(
            turno_id=str(f["turno_id"]), abierto_por=f["abierto_por"], cerrado_por=f["cerrado_por"],
            fecha_apertura=f["fecha_apertura"], fecha_cierre=f["fecha_cierre"],
            horas_turno=float(f["horas_turno"] or 0), monto_inicial=entero(f["monto_inicial"]),
            total_recaudado=entero(f["total_recaudado"]), efectivo=entero(f["efectivo"]),
            otros_metodos=entero(f["otros_metodos"]), monto_contado=entero(f["monto_contado"]),
            diferencia_caja=entero(f["diferencia_caja"]), notas=f["notas"],
        )
        for f in filas
    ]


def historial_turnos(db: Session, limite: int) -> list[TurnoHistorial]:
    return _historial(db, None, limite)


def _unidad(periodo: str) -> str:
    unidad = _UNIDADES.get(periodo)
    if unidad is None:
        raise NegocioError(422, "Periodo inválido")
    return unidad


def ingresos_periodo(db: Session, periodo: str) -> Desglose:
    filas = db.execute(
        text(MOVIMIENTOS_SQL + " AND ct.created_at >= date_trunc(:u, NOW())"), {"u": _unidad(periodo)}
    ).mappings().all()

    conceptos = {"tiempo": 0, "medio_dia": 0, "dia_completo": 0, "membresia": 0}
    clave = {"bloque_15min": "tiempo", "medio_dia": "medio_dia", "dia_completo": "dia_completo",
             "mensual": "membresia", "medio_tiempo": "membresia"}
    total = carros = motos = 0
    for f in filas:
        monto = entero(f["monto"])
        total += monto
        carros += monto if f["tipo"] == "carro" else 0
        motos += monto if f["tipo"] == "moto" else 0
        conceptos[clave[f["plan_tipo"]]] += monto
    return Desglose(
        total=total, por_carros=carros, por_motos=motos,
        por_concepto=PorConcepto(**conceptos), transacciones=len(filas),
    )


def transacciones_periodo(db: Session, periodo: str, limite: int) -> list[Transaccion]:
    filas = db.execute(
        text(MOVIMIENTOS_SQL + " AND ct.created_at >= date_trunc(:u, NOW()) ORDER BY ct.created_at DESC LIMIT :lim"),
        {"u": _unidad(periodo), "lim": limite},
    ).mappings().all()
    return [_transaccion(f) for f in filas]
