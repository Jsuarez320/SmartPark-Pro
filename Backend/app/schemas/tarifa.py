import re
from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.schemas.base import CamelModel
from app.schemas.vehiculo import TipoVehiculo

# Valores en pesos COP enteros (la BD los guarda como NUMERIC(12,2)).
Pesos = Field(gt=0, le=100_000_000)

_HORA = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class TarifaIn(CamelModel):
    """Todos los valores de un tipo de vehículo. Guardarlos crea una NUEVA versión."""

    valor_hora: int = Pesos
    valor_dia: int = Pesos
    valor_hora_festivo: int = Pesos
    valor_dia_festivo: int = Pesos
    mensualidad_1_dia: int = Pesos
    mensualidad_15_dias: int = Pesos
    mensualidad_1_mes: int = Pesos
    nocturna_activa: bool = False
    valor_hora_nocturna: int | None = Field(default=None, gt=0, le=100_000_000)

    @model_validator(mode="after")
    def _nocturna(self):
        if self.nocturna_activa and self.valor_hora_nocturna is None:
            raise ValueError("Indica el valor por hora nocturna para activar la tarifa nocturna")
        return self


class TarifaOut(CamelModel):
    id: int
    tipo: TipoVehiculo
    valor_hora: int
    valor_dia: int
    valor_hora_festivo: int
    valor_dia_festivo: int
    mensualidad_1_dia: int
    mensualidad_15_dias: int
    mensualidad_1_mes: int
    nocturna_activa: bool
    valor_hora_nocturna: int | None
    vigente_desde: datetime
    vigente_hasta: datetime | None


# ------------------------------------------------------------------ parámetros de cobro
class ConfiguracionCobroOut(CamelModel):
    gracia_minutos: int
    umbral_vencimiento_dias: int
    nocturna_inicio: str  # HH:MM, hora de Colombia
    nocturna_fin: str
    jornada_manana_inicio: str
    jornada_manana_fin: str
    jornada_tarde_inicio: str
    jornada_tarde_fin: str


class ConfiguracionCobroIn(CamelModel):
    """Actualización parcial: solo cambian los campos enviados."""

    gracia_minutos: int | None = Field(default=None, ge=0, le=60)
    umbral_vencimiento_dias: int | None = Field(default=None, ge=0, le=30)
    nocturna_inicio: str | None = None
    nocturna_fin: str | None = None
    jornada_manana_inicio: str | None = None
    jornada_manana_fin: str | None = None
    jornada_tarde_inicio: str | None = None
    jornada_tarde_fin: str | None = None

    @field_validator(
        "nocturna_inicio", "nocturna_fin", "jornada_manana_inicio", "jornada_manana_fin",
        "jornada_tarde_inicio", "jornada_tarde_fin",
    )
    @classmethod
    def _hora(cls, v: str | None) -> str | None:
        if v is not None and not _HORA.match(v):
            raise ValueError("Usa el formato HH:MM de 24 horas (ej. 19:00)")
        return v


# ------------------------------------------------------------------ festivos
class FestivoIn(CamelModel):
    fecha: date
    nombre: str = Field(min_length=1, max_length=80)

    @field_validator("nombre")
    @classmethod
    def _nombre(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("No puede estar vacío")
        return v


class FestivoOut(CamelModel):
    fecha: date
    nombre: str


class PrecargaFestivosOut(CamelModel):
    anio: int
    agregados: int
    existentes: int


# ------------------------------------------------------------------ simulación
class SimularRequest(CamelModel):
    tipo: TipoVehiculo
    entrada: datetime
    # Si se omite, se usa la hora actual del servidor.
    salida: datetime | None = None

    @field_validator("entrada", "salida")
    @classmethod
    def _con_zona(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is None:
            raise ValueError("La fecha debe incluir zona horaria (ej. 2026-11-23T10:00:00-05:00)")
        return v


class TramoOut(CamelModel):
    tipo: Literal["normal", "nocturna", "festivo"]
    horas: int
    valor_hora: int
    subtotal: int


class PeriodoOut(CamelModel):
    inicio: datetime
    fin: datetime
    tramos: list[TramoOut]
    subtotal: int
    tope: int
    total: int
    tope_aplicado: bool


class SimularResponse(CamelModel):
    tarifa_id: int
    minutos_totales: int
    minutos_cobrados: int
    horas_cobradas: int
    total: int
    tope_aplicado: bool
    periodos: list[PeriodoOut]

