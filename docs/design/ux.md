# Experiencia de Usuario

## Fortalezas

- Registro: mejor flujo del sistema (precio en vivo, auto-mayúsculas de placa, opciones excluyentes, modal de éxito + impresión).
- PagoModal: selector de métodos con ícono, montos rápidos, botón "Exacto", cambio destacado, recibo termal.
- Micro-interacciones: spinners en botones, disabled durante envío, hover en filas/tarjetas.
- Header sticky con backdrop-blur.
- Navegación por roles con guard de rutas.
- Responsive real (1→2→4 columnas) pese a ser escritorio.
- Empty states útiles en PagoPage (distingue búsqueda sin resultado vs sin vehículos).
- Aviso contextual de reimpresión (placa `0101`).
- Código TSX tipado por módulo → rediseño seguro.

## Problemas / fricciones

- Falsa operación: "Guardar Cambios" (Configuración) y "Confirmar Cierre" (Caja) no ejecutan ninguna acción.
- Datos simulados: PagoPage hardcodea vehículos; `useReceipt` usa tarifa fija $3.200 + 800ms fake; Dashboard/Caja son placeholders; Configuración ignora la API (services ya existen).
- Dashboard del admin vacío ("Conecta la API").
- Error silencioso en tablas (Vehículos): "sin datos" y "API caída" se ven igual.
- Recálculo de precio: POST sin debounce por cada cambio de opción; si falla → `—` sin explicación.
- Cierre de caja ambiguo: sin desglose previo ni consecuencias; confirmar no hace nada.
- Sin feedback global (no hay toasts; errores en banner o modal según la pantalla).
- Tema no persistido (reinicia en light).
- Búsqueda de placa rígida (no normaliza espacios/guiones/minúsculas).
- Pagos: montosRápidos acumulativos (montos incoherentes); sin validación de monto recibido ≥ total.
- Tablas sin paginación/orden; carga todo-o-nada.

## Procesos lentos

- `PagoModal` fuerza 800ms de "Procesando..." artificiales.
- Tablas sin carga incremental.

## Oportunidades

- Dashboard real con ocupación del patio (métrica central del negocio).
- Turno activo visible en el header (usuario, rol, reloj).
- Confirmaciones/undo para acciones irreversibles (cierre de caja).
- Empty states que distingan sin-datos vs error de conexión + retry.
- Validación inline de placa con feedback inmediato.
- Debounce en el cálculo de precio.
- Persistencia de preferencias (tema, último periodo de caja).

## Deuda priorizada (resumen; detalles en technical-notes.md y accessibility.md)

- P0: tokens de componentes shadcn inexistentes; modales inaccesibles.
- P1: falsa operación; datos simulados; contraste del cyan; sin tokens de estados; Inter no cargado; Select defectuoso.
- P2: patrón de tarjeta duplicado (Card muerto); tema no persistido; tablas sin paginación; error silencioso; sin debounce; focus ring azul; nav móvil sin labels; redirección duplicada.
- P3: sin toasts; empty states distintos; KPIs border-l-4; "Cancelar" destructive; montos rápidos acumulativos; sin validación de monto; imports/deps sin uso; login text-white en dark; dark border==border-light.
