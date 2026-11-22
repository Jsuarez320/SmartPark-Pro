from decimal import Decimal


def entero(valor: Decimal | int | None) -> int:
    """Pesos COP como entero (la BD guarda NUMERIC(12,2) pero los valores de negocio son enteros)."""
    return int(valor or 0)
