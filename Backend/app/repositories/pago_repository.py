"""Acceso a datos de pagos. Un pago pertenece a una salida (por horas) o a una mensualidad."""
import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.operaciones import Pago


def crear(
    db: Session,
    *,
    operador_id: uuid.UUID,
    metodo: str,
    monto: Decimal | int,
    referencia: str | None,
    salida_id: uuid.UUID | None = None,
    membresia_id: uuid.UUID | None = None,
) -> Pago:
    """Inserta un pago ya cobrado. Exactamente uno de salida_id / membresia_id (lo exige un CHECK en BD)."""
    pago = Pago(
        salida_id=salida_id, membresia_id=membresia_id, operador_id=operador_id, metodo=metodo,
        monto=monto, referencia=referencia, estado="pagado",
    )
    db.add(pago)
    db.flush()
    db.refresh(pago)
    return pago
