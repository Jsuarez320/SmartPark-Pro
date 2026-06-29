from pydantic import BaseModel


class PrecioRequest(BaseModel):
    placa: str | None = None
    tipo: str | None = None
    marca: str | None = None
    mensualidad: bool | None = None
    pagoDiario: bool | None = None
    diaEspecial: bool | None = None


class PrecioResponse(BaseModel):
    monto: float
    concepto: str


class EntradaRequest(BaseModel):
    placa: str
    tipo: str
    marca: str = ""
    mensualidad: bool = False
    pagoDiario: bool = False
    diaEspecial: bool = False


class EntradaResponse(BaseModel):
    id: str
    estado: str
    total: float | None = None
    mensaje: str
