# Referencia de la API

Documentación interactiva: `http://localhost:8000/docs` (Swagger). Todos los endpoints exigen un usuario
autenticado (`Authorization: Bearer <token>`, ver `/auth/login`) salvo `GET /` y el login. Lo administrativo
exige `es_admin`. Los cuerpos y respuestas van en **camelCase**; el dinero, en **pesos COP enteros**; las fechas
con zona horaria y siempre con la **hora del servidor** (nunca la del cliente).

Errores: `{ "detail": "mensaje en español" }` con 401 (sin sesión), 403 (sin permiso), 404, 409 (regla de negocio
o conflicto) y 422 (datos inválidos).

## Operaciones — entrada y salida en un solo endpoint

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| `POST` | `/operaciones/registrar` | todos | Decide **entrada o salida** según la placa. |
| `GET` | `/operaciones/patio?q=` | todos | Vehículos dentro, con lo que se cobraría si salieran ahora. |

`POST /operaciones/registrar` — `{ placa, tipoVehiculo?, medioPago?, referencia?, totalConfirmado? }`

- Sin ingreso activo → **ENTRADA** (201): guarda la hora y el recibo de ingreso. `tipoVehiculo` es obligatorio si la placa es nueva.
- Con ingreso activo → **SALIDA** (200): calcula el cobro. Si hay valor y falta `medioPago`, responde
  `registrado: false, requierePago: true` **sin guardar nada**; se reenvía con `medioPago` (y `totalConfirmado`, para
  detectar que el valor cambió). Con medio de pago guarda salida, pago, movimiento de caja y recibo en **una transacción**.
- Sin caja abierta no se cobra (409). Dentro de la gracia o con mensualidad vigente no hay cobro.
- Respuesta: `{ tipo: "entrada" | "salida", registrado, requierePago, mensaje, aviso, placa, tipoVehiculo, esMensualidad,
  ingresoId, salidaId, horaEntrada, horaSalida, cobro, medioPago, recibo }`.

## Mensualidades

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/mensualidades?estado=&q=` | Listado con estado (`vigente`, `por_vencer`, `vencida`), más próximas a vencer primero. |
| `GET` | `/mensualidades/resumen` | Contadores para la alerta de vencimientos. |
| `GET` | `/mensualidades/{id}` | Datos y todos los periodos pagados. |
| `POST` | `/mensualidades` | Registra y **cobra** el primer periodo (caja abierta + medio de pago). |
| `PUT` | `/mensualidades/{id}` | Edita nombre, celular, placas, tarjeta y jornada (la placa principal, solo admin). |
| `POST` | `/mensualidades/{id}/renovar` | Registra un pago nuevo y extiende la vigencia. |

Periodos: `1_dia` (el mismo día), `15_dias` (15 días corridos), `1_mes` (mes calendario). Jornadas: `manana`, `tarde`, `completa`.
La renovación empieza el día siguiente al vencimiento (o hoy si ya venció). Una placa o tarjeta pertenece a una sola mensualidad vigente.

## Tarifas y reglas de cobro

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| `GET` | `/tarifas/vigentes` | todos | Precios vigentes por tipo de vehículo. |
| `PUT` | `/tarifas/vigentes/{tipo}` | admin | Guarda los precios como una **nueva versión** (la anterior no se modifica). |
| `GET` | `/tarifas/historial/{tipo}` | admin | Todas las versiones. |
| `GET` / `PUT` | `/tarifas/configuracion` | todos / admin | Gracia, umbral de «por vencer», franja nocturna y jornadas. |
| `GET` / `POST` / `DELETE` | `/tarifas/festivos` | todos / admin | Festivos; `POST /tarifas/festivos/precargar/{anio}` carga los oficiales de Colombia. |
| `POST` | `/tarifas/simular` | todos | Cuánto se cobraría por una estadía (no guarda nada). |

Cálculo (`app/services/cobro_service.py`, función pura con tests): gracia de N minutos sobre la estadía total; toda hora
iniciada se cobra completa; cada hora usa la tarifa de la franja donde empieza (domingo/festivo › nocturna › normal);
tope diario por cada periodo de 24 h contado desde la entrada.

## Caja

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| `GET` | `/caja/turno` | todos | Caja abierta con su resumen en vivo (o `null`). |
| `POST` | `/caja/turno/abrir` | todos | `{ baseEfectivo, baseTransferencia? }`. Una sola caja abierta a la vez. |
| `POST` | `/caja/turno/cerrar` | todos | `{ efectivoContado, notas? }`. Devuelve el resumen y guarda el recibo de cierre. |
| `GET` | `/caja/turnos/{id}` | todos | Resumen de un turno con el detalle de movimientos. |
| `GET` | `/caja/turnos` | admin | Historial. |
| `GET` | `/caja/ingresos?periodo=` · `/caja/transacciones` | admin | Reportes por Día / Semana / Mes / Año. |

El resumen trae las bases, lo cobrado y lo esperado **por medio de pago** (efectivo y transferencia), el número de
movimientos, el efectivo contado, la diferencia y el detalle de cada movimiento.

## Recibos

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| `GET` | `/recibos` | todos | Buscador: `numero`, `placa`, `tipo`, `fecha` o `desde`/`hasta`, `salidaId`, `ingresoId`, `membresiaId`, `turnoId`, `limit`, `offset`. |
| `GET` | `/recibos/{id}` | todos | Recibo con su contenido guardado. |
| `POST` | `/recibos/{id}/reimprimir` | todos | Devuelve el contenido **guardado** (nunca recalculado) y cuenta la copia. |
| `GET` | `/recibos/{id}/reimpresiones` | admin | Quién reimprimió y cuándo. |

Tipos de recibo: `ingreso`, `pago`, `mensualidad`, `cierre_caja`. Un recibo guardado no se puede modificar ni borrar
(lo garantiza un trigger de la BD), así la reimpresión es idéntica al original. El ticket impreso dice COPIA cuando `reimpresiones > 0`.

## Panel

`GET /dashboard` (admin): vehículos dentro, ingresos de hoy, mensualidades vigentes, tiempo promedio y últimos cobros.
