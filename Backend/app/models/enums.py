import enum


class TipoCliente(str, enum.Enum):
    TEMPORAL = "temporal"
    MENSUAL = "mensual"


class TipoPlan(str, enum.Enum):
    MINUTO = "minuto"
    MEDIA_HORA = "media_hora"
    HORA = "hora"
    MENSUAL = "mensual"


class EstadoIngreso(str, enum.Enum):
    ACTIVO = "activo"
    COMPLETADO = "completado"
    ANULADO = "anulado"


class EstadoMembresia(str, enum.Enum):
    ACTIVA = "activa"
    VENCIDA = "vencida"
    CANCELADA = "cancelada"


class EstadoPago(str, enum.Enum):
    PENDIENTE = "pendiente"
    PAGADO = "pagado"
    ANULADO = "anulado"


class MetodoPago(str, enum.Enum):
    EFECTIVO = "efectivo"
    TARJETA = "tarjeta"
    TRANSFERENCIA = "transferencia"
    QR = "qr"


class EstadoFactura(str, enum.Enum):
    EMITIDA = "emitida"
    ANULADA = "anulada"


class EstadoCaja(str, enum.Enum):
    ABIERTA = "abierta"
    CERRADA = "cerrada"


class TipoTransaccion(str, enum.Enum):
    INGRESO = "ingreso"
    EGRESO = "egreso"
    AJUSTE = "ajuste"
