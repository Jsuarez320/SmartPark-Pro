"""Operaciones: un solo flujo de entrada y salida. El empleado nunca elige cuál es.

`registrar` decide por la placa:
  * sin ingreso activo  → ENTRADA: registra la hora (del servidor) y guarda el recibo de ingreso.
  * con ingreso activo  → SALIDA: calcula el cobro con la tarifa vigente; si hay valor, exige el
    medio de pago y una caja abierta; salida + pago + movimiento de caja + recibo van en UNA transacción.

Un ingreso activo por placa lo garantiza además la BD (índice único parcial uq_ingresos_vehiculo_activo).
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.dinero import entero
from app.core.errors import NegocioError, traducir_errores
from app.models.clientes import Membresia, Vehiculo
from app.models.operaciones import Ingreso
from app.models.usuario import Usuario
from app.repositories import membresia_repository as mem_repo
from app.repositories import operacion_repository as repo
from app.repositories import pago_repository
from app.repositories import recibo_repository
from app.repositories import tarifa_repository as tarifa_repo
from app.schemas.operacion import CobroOut, PatioItem, RegistrarRequest, RegistrarResponse
from app.services import caja_service, recibo_service, tarifa_service
from app.services.cobro_service import ResultadoCobro, calcular_cobro
from app.services.vigencia import dentro_de_jornada, estado_vigencia, hoy_en_colombia

_NOMBRE_JORNADA = {"manana": "mañana", "tarde": "tarde"}


def _pesos(valor: int) -> str:
    return "$" + f"{valor:,}".replace(",", ".")


def _minutos(desde: datetime, hasta: datetime) -> int:
    return int((hasta - desde).total_seconds() // 60)


def _cobro_out(resultado: ResultadoCobro, tarifa_id: int) -> CobroOut:
    # `detalle()` ya trae las claves en camelCase, igual que los alias del schema.
    return CobroOut.model_validate({**resultado.detalle(), "tarifaId": tarifa_id})


def _calcular(db: Session, version, entrada: datetime, salida: datetime) -> ResultadoCobro:
    # Margen de un día a cada lado: la franja se evalúa por la hora de inicio de cada hora cobrada.
    parametros = tarifa_service.parametros_cobro(
        db,
        hoy_en_colombia(entrada) - timedelta(days=1),
        hoy_en_colombia(salida) + timedelta(days=1),
    )
    return calcular_cobro(entrada, salida, tarifa_service.a_tarifa_cobro(version), parametros)


# ------------------------------------------------------------------ registrar
def registrar(db: Session, data: RegistrarRequest, usuario: Usuario) -> RegistrarResponse:
    with traducir_errores(db):
        ahora = repo.ahora_del_servidor(db)
        vehiculo = repo.obtener_vehiculo_por_placa(db, data.placa, bloquear=True)
        ingreso = repo.obtener_ingreso_activo(db, vehiculo.id, bloquear=True) if vehiculo else None

        if ingreso is None:
            respuesta = _entrada(db, data, usuario, vehiculo, ahora)
        else:
            respuesta = _salida(db, data, usuario, vehiculo, ingreso, ahora)  # type: ignore[arg-type]
        db.commit()
    return respuesta


# ------------------------------------------------------------------ entrada
def _resolver_vehiculo(db: Session, data: RegistrarRequest, vehiculo: Vehiculo | None) -> tuple[Vehiculo, str]:
    if vehiculo is not None:
        tipo = repo.nombre_tipo_vehiculo(db, vehiculo.tipo_vehiculo_id)
        if data.tipo_vehiculo is not None and data.tipo_vehiculo != tipo:
            raise NegocioError(409, f"La placa {data.placa} está registrada como {tipo}, no como {data.tipo_vehiculo}")
        return vehiculo, tipo
    if data.tipo_vehiculo is None:
        raise NegocioError(422, "Indica el tipo de vehículo")
    tipo_row = tarifa_repo.obtener_tipo_vehiculo(db, data.tipo_vehiculo)
    if tipo_row is None:
        raise NegocioError(422, f"El tipo de vehículo «{data.tipo_vehiculo}» no existe")
    return repo.crear_vehiculo(db, data.placa, tipo_row.id), data.tipo_vehiculo


def _evaluar_mensualidad(db: Session, placa: str, ahora: datetime) -> tuple[Membresia | None, str | None]:
    """(mensualidad con la que ingresa sin cobro, aviso). Reglas:
    vigente y en jornada → sin cobro; vigente fuera de jornada → por horas con aviso;
    vencida → por horas con aviso; la principal y la alterna no pueden estar dentro a la vez."""
    hoy = hoy_en_colombia(ahora)
    vigente = mem_repo.buscar_vigente_por_placa(db, placa, hoy)

    if vigente is None:
        ultima = mem_repo.buscar_ultima_por_placa(db, placa)
        if ultima is not None and estado_vigencia(ultima.fecha_inicio, ultima.fecha_fin, hoy) == "vencida":
            return None, f"La mensualidad venció el {ultima.fecha_fin.isoformat()}: se cobra por horas. Recuerda renovarla."
        return None, None

    if not dentro_de_jornada(vigente.jornada, ahora, tarifa_service.horario_jornadas(db)):
        jornada = _NOMBRE_JORNADA.get(vigente.jornada, vigente.jornada)
        return None, f"La mensualidad es de jornada de {jornada} y está fuera de su horario: se cobra por horas."

    gemelas = {mem_repo.placa_principal(db, vigente), vigente.placa_alterna} - {None, placa}
    dentro = repo.placas_dentro(db, sorted(gemelas))  # type: ignore[arg-type]
    if dentro:
        raise NegocioError(409, f"La placa {dentro[0]} de esta mensualidad ya está dentro del parqueadero")
    return vigente, None


def _entrada(
    db: Session, data: RegistrarRequest, usuario: Usuario, vehiculo: Vehiculo | None, ahora: datetime
) -> RegistrarResponse:
    vehiculo, tipo = _resolver_vehiculo(db, data, vehiculo)
    mensualidad, aviso = _evaluar_mensualidad(db, data.placa, ahora)

    tarifa = datos_mens = None
    if mensualidad is None:
        # Se avisa de inmediato (y no al salir) si no hay tarifa para cobrar esta estadía.
        version = tarifa_service.version_vigente_o_error(db, tipo, ahora)
        tarifa = recibo_service.snapshot_tarifa(version, tarifa_service.obtener_configuracion(db).gracia_minutos)
    else:
        datos_mens = recibo_service.datos_mensualidad(
            mensualidad.jornada, mensualidad.fecha_fin, mem_repo.nombre_cliente(db, mensualidad)
        )

    ingreso = repo.crear_ingreso(
        db,
        vehiculo_id=vehiculo.id,
        operador_id=usuario.id,
        placa=data.placa,
        membresia_id=mensualidad.id if mensualidad else None,
        tarjeta_codigo=mensualidad.tarjeta_codigo if mensualidad else None,
    )
    recibo = recibo_repository.crear(
        db,
        tipo="ingreso",
        operador_id=usuario.id,
        ingreso_id=ingreso.id,
        placa=data.placa,
        contenido=recibo_service.contenido_ingreso(
            placa=data.placa,
            tipo_vehiculo=tipo,
            hora_entrada=ingreso.fecha_ingreso,
            operador=f"{usuario.nombre} {usuario.apellido}",
            tarifa=tarifa,
            mensualidad=datos_mens,
            aviso=aviso,
        ),
    )
    return RegistrarResponse(
        tipo="entrada",
        registrado=True,
        mensaje=f"Entrada registrada: {data.placa}" + (" (mensualidad)" if mensualidad else ""),
        aviso=aviso,
        placa=data.placa,
        tipo_vehiculo=tipo,  # type: ignore[arg-type]
        es_mensualidad=mensualidad is not None,
        ingreso_id=str(ingreso.id),
        hora_entrada=ingreso.fecha_ingreso,
        recibo=recibo_service.a_recibo_out(recibo),
    )


# ------------------------------------------------------------------ salida
def _salida(
    db: Session, data: RegistrarRequest, usuario: Usuario, vehiculo: Vehiculo, ingreso: Ingreso, ahora: datetime
) -> RegistrarResponse:
    tipo = repo.nombre_tipo_vehiculo(db, vehiculo.tipo_vehiculo_id)
    if data.tipo_vehiculo is not None and data.tipo_vehiculo != tipo:
        raise NegocioError(
            409, f"La placa {data.placa} entró como {tipo}; no coincide con {data.tipo_vehiculo}"
        )

    es_mensualidad = ingreso.membresia_id is not None
    minutos_totales = _minutos(ingreso.fecha_ingreso, ahora)

    resultado: ResultadoCobro | None = None
    version = None
    total = 0
    if not es_mensualidad:
        version = tarifa_service.version_vigente_o_error(db, tipo, ahora)
        resultado = _calcular(db, version, ingreso.fecha_ingreso, ahora)
        total = entero(resultado.total)

    base = dict(
        tipo="salida",
        placa=data.placa,
        tipo_vehiculo=tipo,
        es_mensualidad=es_mensualidad,
        ingreso_id=str(ingreso.id),
        hora_entrada=ingreso.fecha_ingreso,
        hora_salida=ahora,
        cobro=None if resultado is None else _cobro_out(resultado, version.id),  # type: ignore[union-attr]
    )

    if data.total_confirmado is not None and data.total_confirmado != total:
        raise NegocioError(
            409,
            f"El valor a cobrar cambió: ahora es {_pesos(total)} (el empleado vio {_pesos(data.total_confirmado)}). Revísalo y confirma de nuevo.",
        )

    if total > 0 and data.medio_pago is None:
        # Vista previa: no se guarda nada. El cliente muestra el valor y vuelve a enviar con el medio de pago.
        return RegistrarResponse(
            registrado=False,
            requiere_pago=True,
            mensaje=f"Valor a cobrar: {_pesos(total)}. Indica el medio de pago.",
            **base,  # type: ignore[arg-type]
        )

    if total > 0:
        caja_service.exigir_turno_abierto(db)  # sin caja abierta no se cobra; falla antes de escribir

    salida = repo.crear_salida(
        db,
        ingreso_id=ingreso.id,
        operador_id=usuario.id,
        fecha_salida=ahora,
        minutos_totales=minutos_totales,
        minutos_cobrados=0 if resultado is None else resultado.minutos_cobrados,
        valor_cobrado=total,
        tarifa_version_id=None if version is None else version.id,
        detalle_cobro=None if resultado is None else resultado.detalle(),
        tope_aplicado=False if resultado is None else resultado.tope_aplicado,
    )
    ingreso.estado = "completado"

    if total > 0:
        pago = pago_repository.crear(
            db, salida_id=salida.id, operador_id=usuario.id, metodo=data.medio_pago,  # type: ignore[arg-type]
            monto=total, referencia=data.referencia,
        )
        caja_service.registrar_cobro(
            db, pago_id=pago.id, metodo=data.medio_pago, monto=total, concepto=caja_service.CONCEPTO_HORAS,  # type: ignore[arg-type]
        )

    ingreso_recibo = recibo_repository.obtener_de_ingreso(db, ingreso.id)
    tarifa = None
    if version is not None:
        tarifa = recibo_service.snapshot_tarifa(version, tarifa_service.obtener_configuracion(db).gracia_minutos)
    recibo = recibo_repository.crear(
        db,
        tipo="pago",
        operador_id=usuario.id,
        salida_id=salida.id,
        placa=data.placa,
        contenido=recibo_service.contenido_pago(
            placa=data.placa,
            tipo_vehiculo=tipo,
            hora_entrada=ingreso.fecha_ingreso,
            hora_salida=ahora,
            tiquete=None if ingreso_recibo is None else ingreso_recibo.numero,
            operador=f"{usuario.nombre} {usuario.apellido}",
            es_mensualidad=es_mensualidad,
            medio_pago=data.medio_pago if total > 0 else None,
            referencia=data.referencia if total > 0 else None,
            total=total,
            minutos_totales=minutos_totales,
            cobro=None if resultado is None else resultado.detalle(),
            tarifa=tarifa,
        ),
    )
    if es_mensualidad:
        mensaje = f"Salida registrada: {data.placa} (mensualidad, sin cobro)"
    elif total == 0:
        mensaje = f"Salida registrada: {data.placa} (dentro del tiempo de gracia, sin cobro)"
    else:
        mensaje = f"Salida registrada: {data.placa}. Cobrado {_pesos(total)}"
    return RegistrarResponse(
        registrado=True,
        mensaje=mensaje,
        salida_id=str(salida.id),
        medio_pago=data.medio_pago if total > 0 else None,
        recibo=recibo_service.a_recibo_out(recibo),
        **base,  # type: ignore[arg-type]
    )


# ------------------------------------------------------------------ patio
def listar_patio(db: Session, q: str | None) -> list[PatioItem]:
    """Vehículos dentro, con lo que se cobraría si salieran ahora."""
    filas = repo.listar_patio(db, q)
    if not filas:
        return []
    ahora = repo.ahora_del_servidor(db)
    parametros = tarifa_service.parametros_cobro(
        db,
        hoy_en_colombia(min(f.ingreso.fecha_ingreso for f in filas)) - timedelta(days=1),
        hoy_en_colombia(ahora) + timedelta(days=1),
    )
    versiones: dict[str, object] = {}

    items: list[PatioItem] = []
    for f in filas:
        valor: int | None
        if f.ingreso.membresia_id is not None:
            valor = 0
        else:
            if f.tipo_vehiculo not in versiones:
                tipo = tarifa_repo.obtener_tipo_vehiculo(db, f.tipo_vehiculo)
                versiones[f.tipo_vehiculo] = tarifa_repo.version_vigente(db, tipo.id, ahora) if tipo else None
            version = versiones[f.tipo_vehiculo]
            valor = (
                None
                if version is None
                else entero(
                    calcular_cobro(
                        f.ingreso.fecha_ingreso, ahora, tarifa_service.a_tarifa_cobro(version), parametros  # type: ignore[arg-type]
                    ).total
                )
            )
        items.append(
            PatioItem(
                ingreso_id=str(f.ingreso.id),
                placa=f.placa,
                tipo_vehiculo=f.tipo_vehiculo,  # type: ignore[arg-type]
                hora_entrada=f.ingreso.fecha_ingreso,
                minutos=_minutos(f.ingreso.fecha_ingreso, ahora),
                es_mensualidad=f.ingreso.membresia_id is not None,
                tiquete=f.tiquete,
                cliente=f.cliente,
                valor_estimado=valor,
            )
        )
    return items

