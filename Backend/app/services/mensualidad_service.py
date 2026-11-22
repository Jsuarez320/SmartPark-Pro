"""Mensualidades: registrar, consultar, editar, renovar y controlar vencimientos.

Una mensualidad es la cadena de periodos pagados de un vehículo (cada renovación = una fila nueva con su
propio pago). Reglas (aprobadas en la auditoría):
* Periodos: 1 día (el mismo día), 15 días corridos, 1 mes calendario. Jornada: mañana, tarde o completa.
* Registrar y renovar cobran: exigen medio de pago y una caja abierta; el pago entra a la caja y se guarda
  un recibo `mensualidad` con el snapshot del periodo. Todo en la misma transacción.
* Renovar empieza el día siguiente al vencimiento si sigue vigente (sin perder ni solapar días) o hoy si ya venció.
* Estado: vigente, por_vencer (faltan `umbral_vencimiento_dias` o menos; configurable) o vencida.
* Una placa (principal o alterna) pertenece a una sola mensualidad vigente a la vez; la tarjeta también.
"""
import uuid
from datetime import date, datetime

from sqlalchemy.orm import Session

from app.core.dinero import entero
from app.core.errors import NegocioError, traducir_errores
from app.models.clientes import Cliente, Membresia, Vehiculo
from app.models.usuario import Usuario
from app.repositories import membresia_repository as repo
from app.repositories import operacion_repository as op_repo
from app.repositories import pago_repository, recibo_repository
from app.repositories import tarifa_repository as tarifa_repo
from app.repositories.membresia_repository import FilaMensualidad
from app.schemas.mensualidad import (
    EstadoMensualidad,
    MensualidadCrear,
    MensualidadDetalle,
    MensualidadEditar,
    MensualidadOut,
    MensualidadResponse,
    PeriodoPagadoOut,
    RenovarRequest,
    ResumenMensualidades,
)
from app.services import caja_service, recibo_service, tarifa_service
from app.services.vigencia import (
    calcular_fin,
    estado_mensualidad,
    hoy_en_colombia,
    inicio_renovacion,
    valor_periodo,
)


# ------------------------------------------------------------------ salida de datos
def _a_out(f: FilaMensualidad, hoy: date, umbral: int) -> MensualidadOut:
    m = f.membresia
    return MensualidadOut(
        id=str(m.id),
        cliente=repo.nombre_completo(f.cliente),
        celular=f.cliente.telefono,
        placa=f.placa,
        placa_alterna=m.placa_alterna,
        tipo_vehiculo=f.tipo_vehiculo,  # type: ignore[arg-type]
        tarjeta=m.tarjeta_codigo,
        periodo=m.periodo,  # type: ignore[arg-type]
        jornada=m.jornada,  # type: ignore[arg-type]
        fecha_inicio=m.fecha_inicio,
        fecha_fin=m.fecha_fin,
        dias_restantes=(m.fecha_fin - hoy).days,
        estado=estado_mensualidad(m.fecha_fin, hoy, umbral),
        valor_pagado=entero(m.valor_pagado),
    )


def _contexto(db: Session) -> tuple[date, int]:
    """(hoy en Colombia según el servidor, umbral de 'por vencer')."""
    return (
        hoy_en_colombia(op_repo.ahora_del_servidor(db)),
        tarifa_service.obtener_configuracion(db).umbral_vencimiento_dias,
    )


def _fila_o_error(db: Session, vehiculo_id: uuid.UUID) -> FilaMensualidad:
    fila = repo.obtener_fila(db, vehiculo_id)
    if fila is None:
        raise NegocioError(404, "La mensualidad no existe")
    return fila


# ------------------------------------------------------------------ consulta
def listar(db: Session, estado: EstadoMensualidad | None, q: str | None) -> list[MensualidadOut]:
    """Mensualidades con su estado. Las más próximas a vencer (o ya vencidas) primero."""
    hoy, umbral = _contexto(db)
    items = [_a_out(f, hoy, umbral) for f in repo.listar_mensualidades(db, q)]
    return [i for i in items if estado is None or i.estado == estado]


def resumen(db: Session) -> ResumenMensualidades:
    """Contadores para la alerta de vencimientos."""
    hoy, umbral = _contexto(db)
    estados = [estado_mensualidad(f.membresia.fecha_fin, hoy, umbral) for f in repo.listar_mensualidades(db)]
    return ResumenMensualidades(
        vigentes=estados.count("vigente"),
        por_vencer=estados.count("por_vencer"),
        vencidas=estados.count("vencida"),
        umbral_dias=umbral,
    )


def detalle(db: Session, membresia_id: uuid.UUID) -> MensualidadDetalle:
    m = repo.obtener(db, membresia_id)
    if m is None:
        raise NegocioError(404, "La mensualidad no existe")
    hoy, umbral = _contexto(db)
    base = _a_out(_fila_o_error(db, m.vehiculo_id), hoy, umbral)
    periodos = [
        PeriodoPagadoOut(
            id=str(p.membresia.id),
            periodo=p.membresia.periodo,  # type: ignore[arg-type]
            jornada=p.membresia.jornada,  # type: ignore[arg-type]
            fecha_inicio=p.membresia.fecha_inicio,
            fecha_fin=p.membresia.fecha_fin,
            valor_pagado=entero(p.membresia.valor_pagado),
            medio_pago=p.medio_pago,  # type: ignore[arg-type]
            recibo_numero=p.recibo_numero,
        )
        for p in repo.historial(db, m.vehiculo_id)
    ]
    return MensualidadDetalle(**base.model_dump(), periodos=periodos)


# ------------------------------------------------------------------ cobro de un periodo (registrar y renovar)
def _cobrar_periodo(
    db: Session,
    *,
    usuario: Usuario,
    vehiculo: Vehiculo,
    cliente: Cliente,
    tipo_vehiculo: str,
    placa_alterna: str | None,
    tarjeta: str | None,
    periodo: str,
    jornada: str,
    inicio: date,
    ahora: datetime,
    medio_pago: str,
    referencia: str | None,
    es_renovacion: bool,
):
    """Inserta el periodo, su pago, el movimiento de caja y el recibo. No hace commit."""
    version = tarifa_service.version_vigente_o_error(db, tipo_vehiculo, ahora)
    valor = entero(valor_periodo(version, periodo))
    fin = calcular_fin(inicio, periodo)

    membresia = repo.crear(
        db,
        cliente_id=cliente.id,
        vehiculo_id=vehiculo.id,
        placa_alterna=placa_alterna,
        tarjeta_codigo=tarjeta,
        periodo=periodo,
        jornada=jornada,
        fecha_inicio=inicio,
        fecha_fin=fin,
        valor_pagado=valor,
        tarifa_version_id=version.id,
        creado_por=usuario.id,
    )
    pago = pago_repository.crear(
        db, membresia_id=membresia.id, operador_id=usuario.id, metodo=medio_pago, monto=valor, referencia=referencia
    )
    caja_service.registrar_cobro(
        db, pago_id=pago.id, metodo=medio_pago, monto=valor, concepto=caja_service.CONCEPTO_MENSUALIDAD
    )
    recibo = recibo_repository.crear(
        db,
        tipo="mensualidad",
        operador_id=usuario.id,
        membresia_id=membresia.id,
        placa=vehiculo.placa,
        contenido=recibo_service.contenido_mensualidad(
            placa=vehiculo.placa,
            placa_alterna=placa_alterna,
            tipo_vehiculo=tipo_vehiculo,
            cliente=repo.nombre_completo(cliente),
            celular=cliente.telefono,
            tarjeta=tarjeta,
            periodo=periodo,
            jornada=jornada,
            fecha_inicio=inicio,
            fecha_fin=fin,
            valor=valor,
            medio_pago=medio_pago,
            referencia=referencia,
            operador=f"{usuario.nombre} {usuario.apellido}",
            es_renovacion=es_renovacion,
            tarifa_version_id=version.id,
        ),
    )
    return membresia, recibo


def _respuesta(db: Session, vehiculo_id: uuid.UUID, recibo, mensaje: str, hoy: date, umbral: int) -> MensualidadResponse:
    return MensualidadResponse(
        mensaje=mensaje,
        mensualidad=_a_out(_fila_o_error(db, vehiculo_id), hoy, umbral),
        recibo=recibo_service.a_recibo_out(recibo),
    )


def _validar_placas_y_tarjeta(
    db: Session, placas: list[str], tarjeta: str | None, hoy: date, excluir_vehiculo_id: uuid.UUID | None
) -> None:
    ocupadas = repo.placas_en_uso(db, placas, hoy, excluir_vehiculo_id)
    if ocupadas:
        raise NegocioError(409, f"La placa {ocupadas[0]} ya pertenece a otra mensualidad vigente")
    if tarjeta and repo.tarjeta_en_uso(db, tarjeta, hoy, excluir_vehiculo_id):
        raise NegocioError(409, f"La tarjeta {tarjeta} ya está asignada a otra mensualidad vigente")


# ------------------------------------------------------------------ registrar
def crear(db: Session, data: MensualidadCrear, usuario: Usuario) -> MensualidadResponse:
    with traducir_errores(db):
        ahora = op_repo.ahora_del_servidor(db)
        hoy, umbral = _contexto(db)
        caja_service.exigir_turno_abierto(db)  # el primer periodo se cobra: falla antes de escribir

        vehiculo = op_repo.obtener_vehiculo_por_placa(db, data.placa, bloquear=True)
        if vehiculo is not None:
            tipo_actual = op_repo.nombre_tipo_vehiculo(db, vehiculo.tipo_vehiculo_id)
            if tipo_actual != data.tipo_vehiculo:
                raise NegocioError(409, f"La placa {data.placa} está registrada como {tipo_actual}, no como {data.tipo_vehiculo}")
            if repo.vehiculo_tiene_mensualidad(db, vehiculo.id):
                raise NegocioError(409, f"La placa {data.placa} ya tiene una mensualidad. Usa «renovar».")

        placas = [data.placa] + ([data.placa_alterna] if data.placa_alterna else [])
        _validar_placas_y_tarjeta(db, placas, data.tarjeta, hoy, vehiculo.id if vehiculo else None)

        cliente = repo.crear_cliente(db, data.nombre, data.celular)
        if vehiculo is None:
            tipo_row = tarifa_repo.obtener_tipo_vehiculo(db, data.tipo_vehiculo)
            if tipo_row is None:
                raise NegocioError(422, f"El tipo de vehículo «{data.tipo_vehiculo}» no existe")
            vehiculo = op_repo.crear_vehiculo(db, data.placa, tipo_row.id)
        vehiculo.cliente_id = cliente.id

        _, recibo = _cobrar_periodo(
            db, usuario=usuario, vehiculo=vehiculo, cliente=cliente, tipo_vehiculo=data.tipo_vehiculo,
            placa_alterna=data.placa_alterna, tarjeta=data.tarjeta, periodo=data.periodo, jornada=data.jornada,
            inicio=hoy, ahora=ahora, medio_pago=data.medio_pago, referencia=data.referencia, es_renovacion=False,
        )
        respuesta = _respuesta(db, vehiculo.id, recibo, f"Mensualidad registrada: {data.placa}", hoy, umbral)
        db.commit()
    return respuesta


# ------------------------------------------------------------------ renovar
def renovar(db: Session, membresia_id: uuid.UUID, data: RenovarRequest, usuario: Usuario) -> MensualidadResponse:
    with traducir_errores(db):
        ahora = op_repo.ahora_del_servidor(db)
        hoy, umbral = _contexto(db)
        caja_service.exigir_turno_abierto(db)

        m = repo.obtener(db, membresia_id)
        if m is None:
            raise NegocioError(404, "La mensualidad no existe")
        vehiculo = repo.bloquear_vehiculo(db, m.vehiculo_id)
        ultima = repo.ultima_activa_del_vehiculo(db, m.vehiculo_id)
        if vehiculo is None or ultima is None:
            raise NegocioError(409, "La mensualidad fue cancelada y no se puede renovar")

        inicio = inicio_renovacion(ultima.fecha_fin, hoy)
        _, recibo = _cobrar_periodo(
            db,
            usuario=usuario,
            vehiculo=vehiculo,
            cliente=db.get(Cliente, ultima.cliente_id),  # type: ignore[arg-type]
            tipo_vehiculo=op_repo.nombre_tipo_vehiculo(db, vehiculo.tipo_vehiculo_id),
            placa_alterna=ultima.placa_alterna,
            tarjeta=ultima.tarjeta_codigo,
            periodo=data.periodo or ultima.periodo,
            jornada=data.jornada or ultima.jornada,
            inicio=inicio,
            ahora=ahora,
            medio_pago=data.medio_pago,
            referencia=data.referencia,
            es_renovacion=True,
        )
        respuesta = _respuesta(db, vehiculo.id, recibo, f"Mensualidad renovada: {vehiculo.placa}", hoy, umbral)
        db.commit()
    return respuesta


# ------------------------------------------------------------------ editar
def editar(db: Session, membresia_id: uuid.UUID, data: MensualidadEditar, usuario: Usuario) -> MensualidadOut:
    enviados = data.model_fields_set
    if not enviados:
        raise NegocioError(422, "No hay ningún dato para actualizar")
    for obligatorio in ("nombre", "placa", "jornada"):
        if obligatorio in enviados and getattr(data, obligatorio) is None:
            raise NegocioError(422, f"El campo «{obligatorio}» no se puede borrar")

    with traducir_errores(db):
        hoy, umbral = _contexto(db)
        m = repo.obtener(db, membresia_id)
        if m is None:
            raise NegocioError(404, "La mensualidad no existe")
        vehiculo = repo.bloquear_vehiculo(db, m.vehiculo_id)
        actual = repo.ultima_activa_del_vehiculo(db, m.vehiculo_id)
        if vehiculo is None or actual is None:
            raise NegocioError(409, "La mensualidad fue cancelada y no se puede editar")

        cambia_placa = "placa" in enviados and data.placa != vehiculo.placa
        if cambia_placa and not usuario.es_admin:
            raise NegocioError(403, "Solo un administrador puede cambiar la placa principal")

        placa_final = data.placa if cambia_placa else vehiculo.placa
        alterna_final = data.placa_alterna if "placa_alterna" in enviados else actual.placa_alterna
        tarjeta_final = data.tarjeta if "tarjeta" in enviados else actual.tarjeta_codigo
        if alterna_final == placa_final:
            raise NegocioError(422, "La placa alterna debe ser distinta de la principal")

        if cambia_placa or "placa_alterna" in enviados or "tarjeta" in enviados:
            placas = [placa_final] + ([alterna_final] if alterna_final else [])
            _validar_placas_y_tarjeta(
                db, placas, tarjeta_final if "tarjeta" in enviados else None, hoy, vehiculo.id
            )

        destino = vehiculo
        if cambia_placa:
            destino = _mover_a_otra_placa(db, vehiculo, placa_final)  # type: ignore[arg-type]

        objetivos = repo.periodos_a_editar(db, vehiculo.id, hoy)
        for periodo in objetivos:
            if cambia_placa:
                periodo.vehiculo_id = destino.id
            if "placa_alterna" in enviados:
                periodo.placa_alterna = alterna_final
            if "tarjeta" in enviados:
                periodo.tarjeta_codigo = tarjeta_final
            if "jornada" in enviados:
                periodo.jornada = data.jornada  # type: ignore[assignment]
        if cambia_placa:
            destino.cliente_id = actual.cliente_id
            vehiculo.cliente_id = None

        cliente = db.get(Cliente, actual.cliente_id)
        if cliente is not None:
            if "nombre" in enviados:
                cliente.nombres, cliente.apellidos = data.nombre, None  # type: ignore[assignment]
            if "celular" in enviados:
                cliente.telefono = data.celular
        db.flush()

        respuesta = _a_out(_fila_o_error(db, destino.id), hoy, umbral)
        db.commit()
    return respuesta


def _mover_a_otra_placa(db: Session, origen: Vehiculo, placa_nueva: str) -> Vehiculo:
    """Cambia la placa principal moviendo la mensualidad al vehículo de la placa nueva (se crea si no existe).
    No se renombra el vehículo: conserva su historial de ingresos con la placa anterior."""
    if op_repo.obtener_ingreso_activo(db, origen.id) is not None:
        raise NegocioError(409, f"No se puede cambiar la placa mientras {origen.placa} está dentro del parqueadero")
    destino = op_repo.obtener_vehiculo_por_placa(db, placa_nueva, bloquear=True)
    if destino is None:
        return op_repo.crear_vehiculo(db, placa_nueva, origen.tipo_vehiculo_id)
    if destino.tipo_vehiculo_id != origen.tipo_vehiculo_id:
        raise NegocioError(409, f"La placa {placa_nueva} está registrada con otro tipo de vehículo")
    if op_repo.obtener_ingreso_activo(db, destino.id) is not None:
        raise NegocioError(409, f"La placa {placa_nueva} está dentro del parqueadero; no se puede asignar ahora")
    if repo.vehiculo_tiene_mensualidad(db, destino.id):
        raise NegocioError(409, f"La placa {placa_nueva} ya tiene otra mensualidad")
    return destino
