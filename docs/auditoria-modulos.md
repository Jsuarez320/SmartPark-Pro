# Auditoría de módulos funcionales — SmartPark Pro (Fase 0)

> Revisión estática (sin ejecutar la app ni tocar la BD). `tsc --noEmit` del frontend pasa sin errores.
> Leyenda: ✅ existe y funciona · ⚠️ parcial o con bug · ❌ no existe.
> Rutas relativas a la raíz del repo. `BE` = `Backend/app`, `FE` = `Frontend/src`.

## 0. Hallazgos clave (resumen)

1. **El backend no sigue la arquitectura declarada.** Solo existen modelos ORM de `usuarios` y `refresh_tokens`. Todo lo demás (vehículos, ingresos, salidas, pagos, caja, membresías) vive en **SQL crudo dentro de los services** (`text(...)`), sin models ni repositories. `BE/repositories/` solo tiene `user_repository.py`. Además hay lógica de negocio en la BD: funciones y triggers PL/pgSQL (`calcular_cobro`, `fn_registrar_en_caja`, `fn_generar_factura`, `fn_cerrar_ingreso`, `cerrar_turno_caja`).
2. **El modelo de negocio construido es otro.** Está pensado para tarjeta física + planes por bloque de 15 min / medio día / día completo / mensual / medio tiempo. Los requerimientos piden hora/día, mensualidad de 1 día/15 días/1 mes con jornada y placa alterna, festivos/domingos/nocturna, base de efectivo y de transferencias, y recibos con snapshot.
3. **No hay endpoint unificado** de entrada/salida. Hay dos pantallas y dos endpoints (`POST /vehiculos/entrada`, `POST /vehiculos/salida`), y el empleado elige el flujo. Viola 1.5.
4. **Recibos no se persisten.** La tabla `facturas` solo guarda `numero/subtotal/total`, y solo para pagos con monto > 0. No hay snapshot, ni recibo de ingreso guardado, ni reimpresión, ni buscador.
5. **Migraciones:** cadena lineal correcta (`c4d75ff938ea → 279a423f71ce → 6240f92434b5 → 2d0ac33476b1 → e5a9c3b81f27 → f1b7d2a94c05`, un solo head). Pero las migraciones del schema v4 son SQL escrito a mano, no autogenerate, porque no hay models ORM que lo respalden.
6. **No hay tests de backend** (no existe carpeta `tests/`, ni pytest en `requirements.txt`). Solo hay `Backend/scripts_validacion_fase3.py` (script manual de auth, crea/borra un usuario efímero). Frontend tiene `electron/printing/ticketBuilder.test.ts`.
7. **Regla de dependencias del frontend:** ningún módulo importa de otro ✅. Una violación: `FE/shared/api/api.ts:28` importa dinámicamente `@/modules/auth/services/auth.service` (shared → modules). Los módulos existentes se llaman `registro`, `receipt`, `vehiculos`, `caja`, `configuracion`, `dashboard`; no coinciden con `operaciones`, `mensualidades`, `tarifas`, `caja`, `recibos`.

## 1. Matriz de brechas

Columnas: Modelo/BD · Migración · Repository · Service · Endpoint · UI · Impresión.
"Repository" es ❌ en casi todas las filas porque no existen (ver hallazgo 1); la lógica está en el service.

### 1. Clientes por horas

| Req | Modelo/BD | Migración | Repository | Service | Endpoint | UI | Impresión |
|---|---|---|---|---|---|---|---|
| **1.1** Placa + tipo de vehículo | ⚠️ `vehiculos`, `tipos_vehiculo` (`e5a9c3b81f27`). Placa con `CHECK ^[A-Z0-9]{3,10}$`. Solo Carro/Moto. | ✅ `e5a9c3b81f27` | ❌ | ⚠️ `BE/services/vehiculo_service.py::registrar_entrada` | ⚠️ `BE/routers/vehiculos.py` `POST /vehiculos/entrada` | ⚠️ `FE/modules/registro/components/RegistroPage.tsx`: además pide tarjeta, marca y **plan** (el empleado elige bloque/medio día/día) | n/a |
| **1.2** Revisar ingreso activo | ⚠️ Índice único parcial `uq_ingresos_vehiculo_activo ON ingresos(vehiculo_id) WHERE estado='activo'` (equivale a `fecha_salida IS NULL`; `ingresos` no tiene `fecha_salida`, está en `salidas`). | ✅ | ❌ | ❌ No decide entrada vs salida. Solo reacciona al `IntegrityError` → 409 (`BE/core/errors.py`). `consultar_placa` existe pero no mira ingreso activo. | ❌ | ❌ | n/a |
| **1.3** Entrada + recibo imprimible | ✅ `ingresos` (`fecha_ingreso TIMESTAMPTZ DEFAULT NOW()`) | ✅ `e5a9c3b81f27`, `f1b7d2a94c05` (`seq_tiquete_diario`) | ❌ | ⚠️ `registrar_entrada`: el tiquete `D-000123` se guarda en `ingresos.tarjeta_codigo` (reutiliza el campo de tarjeta). **El recibo no se guarda**. | ⚠️ `POST /vehiculos/entrada` | ⚠️ `registro/hooks/useRegistro.ts`, `AlertaRegistro.tsx` (avisa si falla la impresora ✅) | ⚠️ `electron/printing/ticketBuilder.ts::componerIngreso`, IPC `printer:imprimir-ingreso`. Mensuales no imprimen. |
| **1.4** Salida: tiempo + valor + recibo + medio de pago obligatorio | ⚠️ `salidas`, `pagos`, `facturas`. Medio de pago: dominio `metodo_pago` = efectivo/tarjeta/nequi/transferencia (el req. pide efectivo o transferencia). | ✅ | ❌ | ⚠️ `registrar_salida`: una transacción, exige método si total>0 ✅ y caja abierta ✅. **Bugs/brechas:** cálculo en PL/pgSQL (no función pura testeable); fracción = bloque de 15 min; sin gracia; sin domingo/festivo/nocturna; `ticket` = nº de factura o `ingreso_id[:8]` si valor 0. | ⚠️ `POST /vehiculos/salida` (requiere `ingresoId`, no placa) | ⚠️ `FE/modules/receipt/` (`PagoPage`, `BuscarTarjetaModal`, `PagoModal`): se busca el vehículo en el patio y luego se paga | ⚠️ `printer:imprimir-factura` (`componerRecibo`), botón manual en `PagoModal`; no hay impresión automática ni mensaje de "reimprimir" si falla (solo `errorImpresion`) |
| **1.5** Nunca elegir entrada/salida a mano | ❌ | n/a | ❌ | ❌ | ❌ No existe `POST /operaciones/registrar` | ❌ Dos rutas (`/` Registro, `/pago`) y menú separado: el empleado elige | n/a |

### 2. Mensualidades

| Req | Modelo/BD | Migración | Repository | Service | Endpoint | UI | Impresión |
|---|---|---|---|---|---|---|---|
| **2.a** Registrar: nombre, placa principal, placa alterna, tipo, celular, ID tarjeta | ⚠️ `clientes` (exige nombres, apellidos, **documento**; `telefono` ok), `vehiculos`, `membresias`. ❌ Sin placa alterna. ❌ Sin tarjeta en la membresía (la tarjeta se teclea en cada ingreso y vive en `ingresos.tarjeta_codigo`). | ⚠️ tablas existen; faltan columnas | ❌ | ⚠️ `BE/services/membresia_service.py::contratar_membresia` (SQL crudo; upsert de cliente por documento) | ⚠️ `POST /membresias` — **solo admin** (`BE/routers/membresias.py`) | ⚠️ `FE/modules/vehiculos/components/MembresiaModal.tsx` (pide documento, no placa alterna ni tarjeta) | ❌ |
| **2.b** Periodo 1 día / 15 días / 1 mes | ⚠️ `planes` tiene `mensual` y `medio_tiempo`; **no hay periodos**. | ❌ | ❌ | ⚠️ Fecha fin fija a `inicio + 1 mes − 1 día` (mes calendario, hardcoded en SQL) | ❌ (`plan` ∈ mensual/medio_tiempo) | ❌ | n/a |
| **2.c** Jornada mañana/tarde/completa | ❌ | ❌ | ❌ | ❌ (`medio_tiempo` ≠ jornada: no define horario) | ❌ | ❌ | n/a |
| **2.d** Consultar listado + estado | ⚠️ `estado_membresia` = activa/vencida/cancelada; "vencida" se deriva de `fecha_fin` | ✅ | ❌ | ⚠️ `vehiculo_service.py::listar_mensuales` (no está en un service de membresías; solo devuelve placa/propietario/plan/vencimiento/estado; sin celular/tarjeta/jornada; `DISTINCT ON` vehículo) | ⚠️ `GET /vehiculos/mensuales` (admin) | ⚠️ tab "mensuales" en `VehiculosPage.tsx` | n/a |
| **2.e** Editar datos, placas, tarjeta, jornada | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | n/a |
| **2.f** Renovar (pago nuevo + extiende) | ⚠️ `pagos.membresia_id` único por membresía → cada renovación = nueva fila en `membresias` | ✅ | ❌ | ⚠️ Se hace volviendo a llamar `contratar_membresia` (arranca al día siguiente del vencimiento). No hay operación "renovar" explícita. Movimiento de caja: trigger `fn_registrar_en_caja` ✅ | ⚠️ mismo `POST /membresias` | ⚠️ mismo modal | ❌ Sin recibo de mensualidad |
| **2.g** Control de vencimientos | ⚠️ | n/a | ❌ | ⚠️ `_ESTADO_MENSUAL`: vencido / por_vencer ≤3 d / alerta ≤7 d (3 hardcoded, no configurable) | ⚠️ idem 2.d | ⚠️ badges en `VehiculosPage.tsx`; sin filtro dedicado verificado | n/a |

### 3. Configuración y administración

| Req | Modelo/BD | Migración | Repository | Service | Endpoint | UI | Impresión |
|---|---|---|---|---|---|---|---|
| **3.1** Tarifas (admin): hora, día, mensualidad 1d/15d/1m, domingo/festivo, nocturna opcional; versionadas o snapshot | ⚠️ `tarifas(plan_id, tipo_vehiculo_id, valor)` + `planes` (bloque_15min, medio_dia, dia_completo, medio_tiempo, mensual). ❌ hora, mensualidad 1d/15d, domingo/festivo, nocturna, activación. **Snapshot parcial:** `ingresos.tarifa_valor` y `salidas.tarifa_valor_bloque` ✅, pero `tarifas` se edita con `UPDATE` (sin historial) y `calcular_cobro` lee el valor **vigente** del bloque para planes medio día/día. | ⚠️ `e5a9c3b81f27` (tarifas iniciales sembradas) | ❌ | ⚠️ `BE/services/configuracion_service.py` (solo cambia `valor` de tarifas existentes; no crea/borra planes) | ⚠️ `GET /configuracion`, `PUT /configuracion/tarifas` (admin ✅) | ⚠️ `FE/modules/configuracion/components/ConfiguracionPage.tsx` | n/a |
| **3.2.1** Apertura con base efectivo (+ base transferencias) | ⚠️ `turnos_caja.monto_inicial` único. ❌ base de transferencias. `uq_turno_abierto` ✅ (una caja abierta). | ⚠️ | ❌ | ⚠️ `BE/services/caja_service.py::abrir_turno` | ⚠️ `POST /caja/turno/abrir` (`montoInicial`) | ⚠️ `FE/modules/caja/components/CajaPage.tsx` | n/a |
| **3.2.2** Cada cobro exige medio de pago y suma a caja, separado por medio | ⚠️ `caja_transacciones(metodo)` ✅; trigger `fn_registrar_en_caja` bloquea si no hay turno ✅ (horas y membresías). Pero resúmenes agrupan solo `efectivo` vs "otros" (`v_resumen_turno_actual`), no por medio. | ✅ | ❌ | ⚠️ salida y membresía exigen caja abierta ✅. Salida con total 0 no genera movimiento. | ✅ vía `/vehiculos/salida`, `/membresias` | ⚠️ `CajaPage` muestra efectivo/otros | n/a |
| **3.2.3** Cierre: resumen (bases, totales por medio, nº movimientos, esperado en efectivo, detalle) imprimible | ⚠️ `cerrar_turno_caja`, vista `v_historial_turnos`: tiene bases, efectivo/otros, `monto_contado`, `diferencia`. ❌ totales por medio, ❌ detalle de movimientos en el cierre. | ⚠️ | ❌ | ⚠️ `cerrar_turno` devuelve `TurnoHistorial` (sin detalle ni conteo de movimientos; `GET /caja/transacciones` es por periodo, no por turno) | ⚠️ `POST /caja/turno/cerrar` | ⚠️ `CajaPage` | ❌ Sin plantilla de cierre en `electron/printing/` |

### 6. Reimpresión de recibos

| Req | Modelo/BD | Migración | Repository | Service | Endpoint | UI | Impresión |
|---|---|---|---|---|---|---|---|
| **6.a** Todo recibo se guarda ligado a su registro (ingreso, pago horas, mensualidad) | ⚠️ `facturas(pago_id, numero, subtotal, total)` solo para pagos; **sin snapshot** (placa, tiempos, tarifa, medio de pago, items). ❌ Sin recibo de ingreso ni de mensualidad persistido (el de mensualidad sí tiene `factura`, vacío de contenido). | ⚠️ `e5a9c3b81f27` | ❌ | ❌ | ❌ | n/a | n/a |
| **6.b** Reimprimir recibo de una salida | ⚠️ solo recalculable desde `salidas+pagos+ingresos` | n/a | ❌ | ❌ | ❌ | ⚠️ solo botón "imprimir" inmediatamente tras el cobro (`PagoModal`) | ⚠️ `printer:imprimir-factura` existe |
| **6.c** Buscador de recibos (placa, fecha, número) + reimprimir | ⚠️ `facturas.numero` único, `idx_facturas_fecha` | ✅ | ❌ | ❌ | ❌ | ❌ | n/a |
| **6.d** Reimpresión usa contenido guardado, no recalcula | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 2. Tablas y columnas: actuales vs. necesarias

### ¿El esquema de 13 tablas cubre los requerimientos?

Las 13 tablas de `e5a9c3b81f27` son: `tipos_vehiculo, clientes, planes, tarifas, convenios, vehiculos, membresias, ingresos, salidas, pagos, facturas, turnos_caja, caja_transacciones` (más `usuarios` y `refresh_tokens` de migraciones previas). **Cubre ~40 %**: la base transaccional (ingreso/salida/pago/caja) sirve, pero no cubre tarifas versionadas con domingo/festivo/nocturna, periodos y jornada de mensualidades, placa alterna, bases de caja por medio, ni recibos con snapshot.

| Tabla actual | Estado | Cambio propuesto |
|---|---|---|
| `tipos_vehiculo` | ✅ | Mantener (Carro, Moto). |
| `clientes` | ⚠️ exige `apellidos`, `documento` NOT NULL | Para mensualidad el req. pide nombre+celular. Proponer `documento` y `apellidos` opcionales o reutilizar `nombres` como nombre completo. |
| `planes` | ⚠️ catálogo de tipos de plan por bloque | Reemplazar semántica: `hora`, `dia`, `mensual_1d`, `mensual_15d`, `mensual_1m`, `recargo_dominical`, `nocturna` (o columnas en `tarifas`). |
| `tarifas` | ⚠️ una fila por (plan, vehículo), editable por UPDATE | Añadir versionado (`vigente_desde`, `vigente_hasta`, o tabla `tarifas_historial`) y campos: `valor_hora`, `valor_dia`, `valor_dominical_festivo`, `nocturna_activa`, `valor_nocturna`, `nocturna_inicio/fin`. |
| `convenios` | no pedido | Mantener sin uso o deprecar (`salidas.convenio_id`, `horas_descontadas`). Propuesta: no exponer. |
| `vehiculos` | ✅ | Mantener. `placa` ya único y validado en BD. |
| `membresias` | ⚠️ falta placa alterna, tarjeta, jornada, periodo | Añadir `placa_alterna`, `tarjeta_codigo`, `jornada` (manana/tarde/completa), `periodo` (1d/15d/1m). Hoy `fecha_fin > fecha_inicio` (un periodo de 1 día no cumple `CHECK`) → relajar a `>=`. |
| `ingresos` | ⚠️ `tarjeta_codigo` NOT NULL guarda tiquete diario; `tarifa_id/tarifa_valor` fijan plan al entrar | Para por horas: snapshot de reglas (gracia, tope). `tarjeta_codigo` pasa a opcional; el tiquete va a `recibos`. |
| `salidas` | ⚠️ modelo por bloques | Ajustar columnas (tiempo cobrado, tarifa aplicada, concepto: hora/dia/dominical/nocturna). |
| `pagos` | ✅ | Mantener. Reducir `metodo` a efectivo/transferencia (o dejar el dominio y mapear). Hoy no tiene `turno_id`; depende del trigger. |
| `facturas` | ❌ insuficiente | Reemplazar por `recibos`. |
| `turnos_caja` | ⚠️ solo `monto_inicial` | Añadir `base_efectivo`, `base_transferencia`; `monto_cierre` → conteo de efectivo. |
| `caja_transacciones` | ✅ base | Mantener; asegurar `metodo` y `turno_id`. |

**Tablas nuevas necesarias:** `recibos` (número consecutivo, `tipo` ingreso/pago/mensualidad/cierre, `ingreso_id`/`salida_id`/`membresia_id`, `contenido JSONB` con snapshot, `impreso_count`, `created_at`), `festivos` (si se elige lista configurable), `configuracion` clave/valor (umbral de vencimiento, gracia, horario nocturno, tope diario).

## 3. Pantallas de UI que apuntan a endpoints inexistentes

El cruce de `api.get/post/put` del frontend contra los routers: **todas las llamadas existentes tienen endpoint**. Brechas inversas (UI no existe / UI incompleta):

| UI | Estado |
|---|---|
| `registro` → `/vehiculos/calcular-precio`, `/consulta/{placa}`, `/entrada` | ✅ existen, pero el diseño es de tarjeta + plan, no de flujo unificado |
| `receipt` → `/vehiculos/patio`, `/patio/{id}`, `/salida` | ✅ existen |
| `vehiculos` → `/vehiculos`, `/mensuales`, `/stats`, `/membresias` | ✅ existen |
| `caja` → `/caja/turno`, `/turno/abrir`, `/turno/cerrar`, `/ingresos`, `/transacciones`, `/turnos` | ✅ existen |
| `configuracion` → `/configuracion`, `/configuracion/tarifas` | ✅ existen |
| `dashboard` → `/dashboard` | ✅ existe |
| Pantallas **sin UI**: unificada de operaciones, edición/renovación de mensualidades, buscador y reimpresión de recibos, tarifas avanzadas (domingo/festivo/nocturna), impresión de cierre | ❌ |

> Nota: `Frontend/src/modules/configuracion/mocks/facturaEjemplo.ts` es un mock (prueba de impresora), no una pantalla rota.

## 4. Ambigüedades de negocio (necesitan decisión) — con propuesta por defecto

| # | Ambigüedad | Propuesta por defecto |
|---|---|---|
| 1 | Fracciones de hora y minutos de gracia | Cobro por hora completa desde el minuto 1; gracia configurable, default **5 min** (≤5 min = sin cobro; nota: hoy el sistema cobra bloques de 15 min). |
| 2 | Tope diario | Si el cobro por horas de un día calendario supera `valor_dia`, se cobra `valor_dia` (por cada periodo de 24 h). |
| 3 | Nocturna y dominical; cruce de franjas | Nocturna 7 pm–6 am (configurable, activable). Una estadía que cruza franjas se cobra **por tramos**, cada hora con la tarifa de la franja donde cae su minuto inicial. Dominical/festivo aplica a las horas dentro de ese día. |
| 4 | Festivos | Lista configurable por el admin, **precargada** con el calendario colombiano del año en curso y siguiente (Ley Emiliani). |
| 5 | Placa con mensualidad vigente | Dentro de su jornada: entrada sin cobro + aviso en pantalla. Fuera de jornada: se avisa y se cobra por horas (el empleado confirma). Vencida: cobra por horas con aviso de renovación. |
| 6 | Placa principal y alterna dentro a la vez | **No**: la mensualidad es un cupo; si una placa está dentro, la otra se rechaza (409). |
| 7 | Tipo de vehículo de salida igual al de entrada | La salida usa el tipo registrado en la entrada; el empleado no lo cambia. Si el campo se envía y difiere → error. |
| 8 | Caja | Una sola caja abierta a la vez (ya existe `uq_turno_abierto`). **No** se cobra sin caja abierta (ya implementado). Entrada y salida sin valor sí se permiten. |
| 9 | Umbral "próxima a vencer" | **3 días**, configurable (hoy hardcoded en `_ESTADO_MENSUAL`, y hay un estado extra `alerta` a 7 días que propongo eliminar). |
| 10 | Mensualidad "1 mes" | **Mes calendario** (de la fecha de inicio a la misma fecha del mes siguiente − 1 día, como hoy). 15 días = 15 días corridos; 1 día = el mismo día. |

Preguntas adicionales que surgieron:

- **Medios de pago:** hoy son efectivo/tarjeta/nequi/transferencia; el requerimiento dice efectivo o transferencia. Propuesta: dejar solo esos dos (nequi/tarjeta se registran como transferencia).
- **Convenios** (descuento por horas): fuera del alcance pedido. Propuesta: no exponerlos.
- **Quién gestiona mensualidades:** hoy `POST /membresias` es solo admin. Propuesta: el empleado puede registrar, consultar y renovar; solo el admin edita datos sensibles/borra.
- **Cierre de caja "diario":** hoy es por turno. Propuesta: mantener turno = día, con aviso si el turno lleva más de 24 h abierto.
- **Un registro de recibos por reimpresión:** propuesta: no se crea recibo nuevo; se incrementa un contador `reimpresiones` y se marca "COPIA" en el ticket.

## 5. Decisión arquitectónica que necesito de ti

Hay dos caminos para el backend; es la decisión que más afecta el plan:

- **A (recomendado):** construir lo nuevo según lo que describes: models SQLAlchemy 2.0 + repositories + services con **cálculo de tarifa como función pura en Python** (testeable con pytest) + migraciones Alembic. La lógica nueva no va en triggers. Se migra gradualmente: lo existente de caja/ingresos se refactoriza fase a fase.
- **B:** seguir con SQL crudo y funciones PL/pgSQL. Más rápido, pero no cumple la regla "función pura con tests de pytest" y contradice la arquitectura declarada.

Con A hay que decidir qué hacer con los **triggers actuales** (`fn_registrar_en_caja`, `fn_generar_factura`, `fn_cerrar_ingreso`, `calcular_cobro`): propongo reemplazarlos en una migración (los movimientos de caja y recibos se crean en el service, dentro de la misma transacción).

## 6. Plan de fases propuesto

0. ✅ Auditoría (este documento). Decisiones de la sección 4 y 5.
1. **Modelos y migraciones.** Models ORM de todo; una migración nueva sobre `f1b7d2a94c05` (columnas nuevas, `recibos`, `festivos`, `configuracion`, ajustes de `turnos_caja`/`membresias`/`tarifas`); revisar a mano. Normalización de placa (quitar espacios/guiones) en el schema Pydantic. Instalar pytest.
2. **Tarifas.** CRUD admin con versionado, festivos, configuración; función pura `calcular_cobro` + tests (horas exactas, fracciones, gracia, medianoche, domingo, festivo, nocturna, tope diario).
3. **Caja.** Apertura con base efectivo/transferencia, movimientos por medio, cierre con resumen detallado.
4. **Operaciones.** `POST /operaciones/registrar` unificado (decide entrada/salida; salida + pago + movimiento + recibo en una transacción); retirar `/vehiculos/entrada` y `/salida` al final.
5. **Mensualidades.** CRUD, jornada, placa alterna, renovación explícita con movimiento de caja, estados y vencimientos; mover lo que hoy está en `vehiculo_service`.
6. **Recibos.** Snapshot JSONB, listado, búsqueda (placa/fecha/número), reimpresión.
7. **Frontend.** Renombrar/crear módulos `operaciones`, `mensualidades`, `tarifas`, `caja`, `recibos` con services y hooks de TanStack Query; placa con flujo solo teclado (Enter envía, foco vuelve a la placa). Corregir la violación de `shared/api/api.ts → modules/auth`.
8. **Impresión.** Plantillas de recibo de mensualidad y cierre de caja en `electron/printing/` (ya existen ingreso y pago); mensaje "reimprimir" cuando la impresora falla.

## 7. Qué no se verificó

- No se ejecutó la app, ni Docker, ni se consultó la BD. No se comprobó que el schema real de PostgreSQL coincida con las migraciones (`docker compose exec backend alembic current`).
- No se probó el comportamiento real de `calcular_cobro` ni de los triggers; el análisis es por lectura del SQL.

---

## 8. Estado final (después de construir las fases 1 a 8)

Todas las filas de la matriz de la sección 1 quedaron en ✅ salvo lo indicado:

| Requerimiento | Estado | Dónde |
|---|---|---|
| 1.1–1.5 Clientes por horas, un solo apartado | ✅ | `POST /operaciones/registrar`, `modules/operaciones` |
| 2 Mensualidades (registrar, periodo, jornada, consultar, editar, renovar, vencimientos) | ✅ | `/mensualidades`, `modules/mensualidades` |
| 3.1 Tarifas versionadas (admin) | ✅ | `/tarifas`, `modules/tarifas` |
| 3.2 Caja: apertura con bases, cobros por medio, cierre imprimible | ✅ | `/caja`, `modules/caja` |
| 6 Recibos guardados, buscador y reimpresión sin recalcular | ✅ | `/recibos`, `modules/recibos` |
| Impresión ESC/POS (ingreso, pago, mensualidad, cierre, COPIA) | ✅ | `Frontend/electron/printing/` |
| Cancelar una mensualidad | ❌ (no pedido) | el estado `cancelada` existe en la BD, sin endpoint |

Se retiró el flujo legacy (endpoints `/vehiculos`, `/membresias`, `/configuracion`, sus services y schemas, los módulos
`registro`, `receipt` y `vehiculos` del frontend, y los triggers/funciones/vistas del esquema por planes).

**Pendiente de decisión (datos):** las tablas legacy `planes`, `tarifas`, `convenios` y `facturas`, y las columnas
`ingresos.tarifa_*`, `salidas.convenio_id / horas_descontadas / tarifa_valor_bloque / bloques / valor_plan`,
`membresias.plan_id / tarifa_id`, se conservan **con su historial** (las facturas viejas no tienen recibo equivalente).
Quitarlas es una migración destructiva que conviene hacer solo después de respaldar la BD.
