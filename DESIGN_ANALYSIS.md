# DESIGN_ANALYSIS.md — Auditoría de Diseño UI/UX

**Proyecto:** SmartPark Pro (Sistema de Gestión de Parqueadero)
**Alcance auditado:** `Frontend/` (React 18 + TypeScript + Vite + TailwindCSS + Radix UI + Electron)
**Versión del proyecto:** 0.1.0 — Fase 1 (Configuración Base)
**Fecha de la auditoría:** Agosto 2026
**Rol:** Auditoría de UX/UI independiente previa a cualquier rediseño.

> Nota de contexto: el repositorio raíz contiene además `Backend/` (FastAPI, únicamente scaffolding vacío, sin archivos de código) y documentación. Como no existe superficie visual en el Backend, toda la auditoría se centra en el Frontend, que es donde vive el 100% del diseño implementado.

---

## 1. Resumen general

SmartPark Pro es una aplicación de escritorio (Electron) para gestionar un parqueadero: registro de ingreso de vehículos, cobro de salidas, caja, vehículos mensuales, tarifas y un panel de control.

### Estilo visual

- **Lenguaje dominante:** administrativo / empresarial limpio, inspirado directamente en **shadcn/ui + Tailwind** (radio `rounded-xl/2xl`, bordes `slate`, fondos claros, sombras `shadow-sm`, hover con transiciones).
- **Sensación:** moderna y sobria. Paleta **cyan + slate** que transmite profesionalismo técnico y "producto de software" más que "marca física de estacionamiento".
- **Nivel de madurez:** el diseño *looks like* un dashboard SaaS actual (2023–2026), pero el **producto está a medio construir**: la mayoría de las pantallas muestran datos simulados, valores en cero, o mensajes tipo "Conecta la API". La UI está "maquetada" con calidad visual alta, pero muchas superficies son cascarones.
- **Mezcla:** es predominantemente **minimalista-empresarial-técnico**. No es antiguo ni sobrecargado. Hay una mezcla leve entre el sistema de tokens (cyan/slate) y colores hardcodeados de Tailwind (green/red/yellow/orange/blue) para estados.

### Qué transmite la interfaz

Transmite **orden, control y eficiencia**: formularios grandes, tarjetas de métricas, montos en negrita, etiquetas en mayúsculas con tracking. El lenguaje visual favorece la lectura rápida de datos (propio de un sistema de caja/operación). También transmite **incompletitud**: placeholders "Conecta la API", montos en `$0`, secciones vacías y botones que no ejecutan acción.

### Veredicto de estilo

Moderno y bien ejecutado en forma; incompleto en contenido. La base visual es sólida y rediseñable sobre los mismos cimientos.

---

## 2. Arquitectura visual

### Layout principal

- **Estructura:** una sola columna centrada, contenido en `max-w-6xl` (1152px) con `px-4 sm:px-6` y `py-6` (`src/layout/AppLayout.tsx:20-24`).
- **Header fijo** (`sticky top-0 z-40`, 56px `h-14`) con `backdrop-blur` y fondo `bg-surface/95` (`src/layout/Header.tsx:37`).
- **No existe sidebar, ni footer, ni breadcrumbs.** La navegación es 100% horizontal en el header.
- El layout se re-monta en cada cambio de ruta mediante `key={location.pathname}` (`AppLayout.tsx:22`), forzando re-render total por navegación.
- **Fondo:** `#f8fafc` (slate-50). **Superficies:** `#ffffff`. Baja saturación, mucho aire.

### Header / Navegación

- Logo: caja cuadrada `rounded-lg` cyan con las letras **"SP"** + texto "SmartPark Pro" (oculto en móvil).
- Nav centrada con ítems filtrados por rol (`admin` ve 5 rutas; `employee` ve 3).
- Ítem activo: fondo `bg-brand-light` + texto `text-brand` (cyan-50/cyan-600). Ítem inactivo: `text-text-muted`.
- En pantallas < `sm`, los **labels se ocultan** y quedan solo íconos sin `aria-label` ni tooltip (`Header.tsx:63`).
- Zona derecha: toggle de tema (luna/sol) + botón "Salir" (`variant="outline"`).

### Jerarquía visual

1. **H1 de página** — `text-2xl font-bold` con subtítulo `text-sm text-text-muted` (patrón repetido en todas las páginas).
2. **Tarjetas de métricas** — números `text-2xl/3xl font-bold`.
3. **Títulos de sección** — `text-lg font-bold`.
4. **Labels de formulario** — `text-sm font-medium`.
5. **Texto auxiliar/placeholder** — `text-sm text-text-muted`.

### Rutas y roles

| Ruta | Página | Acceso |
|---|---|---|
| `/login` | LoginPage | público |
| `/` | HomePage → Dashboard (admin) / Registro (employee) | autenticado |
| `/dashboard` | DashboardPage | admin |
| `/vehiculos` | VehiculosPage | admin |
| `/pago` | PagoPage (Cobrar) | admin, employee |
| `/caja` | CajaPage | admin, employee |
| `/configuracion` | ConfiguracionPage | admin |

---

## 3. Paleta de colores

El sistema tiene **dos mundos cromáticos paralelos**: (A) tokens semánticos definidos en `src/styles/globals.css` y (B) colores Tailwind hardcodeados en los componentes.

### A. Tokens semánticos (globals.css)

#### Modo claro

| Token | HEX | Nota |
|---|---|---|
| `--color-brand-primary` | `#0891b2` | cyan-600. Color de marca / acción principal |
| `--color-brand-hover` | `#0e7490` | cyan-700 |
| `--color-brand-light` | `#ecfeff` | cyan-50. Fondos de estados activos / iconos |
| `--color-brand-dark` | `#164e63` | cyan-900 |
| `--color-vehicle-auto` | `#0891b2` | mismo cyan que marca |
| `--color-vehicle-moto` | `#dc2626` | red-600. Distinción por tipo de vehículo |
| `--color-destructive` | `#dc2626` | red-600. Error / peligro |
| `--color-destructive-foreground` | `#ffffff` | |
| `--color-background` | `#f8fafc` | slate-50. Fondo de página |
| `--color-surface` | `#ffffff` | Tarjetas, header, modales |
| `--color-border` | `#e2e8f0` | slate-200 |
| `--color-border-light` | `#f1f5f9` | slate-100. Filas de tabla |
| `--color-text-primary` | `#0f172a` | slate-900. Títulos y datos |
| `--color-text-secondary` | `#334155` | slate-700. Labels |
| `--color-text-muted` | `#64748b` | slate-500. Descripciones |
| `--color-text-subtle` | `#94a3b8` | slate-400. Muy atenuado |
| `--color-text-disabled` | `#cbd5e1` | slate-300 |

#### Modo oscuro

| Token | HEX | Nota |
|---|---|---|
| `--color-brand-primary` | `#22d3ee` | cyan-400 |
| `--color-brand-hover` | `#67e8f9` | cyan-300 — **hover más claro que el primario** (inusual) |
| `--color-brand-light` | `#164e63` | cyan-900 |
| `--color-brand-dark` | `#155e75` | cyan-800 |
| `--color-vehicle-auto` | `#22d3ee` | |
| `--color-vehicle-moto` | `#f87171` | red-400 |
| `--color-destructive` | `#ef4444` | red-500 |
| `--color-background` | `#020617` | slate-950 |
| `--color-surface` | `#0f172a` | slate-900 |
| `--color-border` / `border-light` | `#1e293b` | slate-800 — **pierden distinción entre sí** |
| `--color-text-*` | slate-100 a slate-600 | escala correcta |

### B. Colores hardcodeados en componentes (sin token)

| Color | HEX (Tailwind default) | Uso |
|---|---|---|
| `green-50/100/500/600/700` | `#f0fdf4 / #dcfce7 / #22c55e / #16a34a / #15803d` | Éxito, badges "Sí/Mensualidad", "Cambio", check de éxito, iconos de ingreso |
| `red-50/100` | `#fef2f2 / #fee2e2` | Tarjetas "Vencidos", "Por Motos", "Entregado Hoy" |
| `yellow-50/100/600` | `#fefce8 / #fef9c3 / #ca8a04` | Estado "Por vencer" |
| `orange-50/100/500` | `#fff7ed / #ffedd5 / #f97316` | Estado "Alerta" |
| `blue-50/100/400/600` | `#eff6ff / #dbeafe / #60a5fa / #2563eb` | Tarjeta "Total del Día" |
| `gray-300` | `#d1d5db` | Borde del checkbox no usado (checkbox.tsx) |
| `black/40` | rgba(0,0,0,0.40) | Overlay de modales |
| `white` | `#ffffff` | Texto sobre botones brand |

### Lectura semántica

- **Éxito:** verde (múltiples tonos sin token único).
- **Error/peligro:** rojo (`destructive`).
- **Advertencia:** amarillo y naranja coexistiendo (sin límite claro de cuándo usar cada uno).
- **Información:** azul (solo en caja).
- **Atención pendiente:** los estados **no tienen tokens**; se pintan ad-hoc. Esto rompe la escalabilidad del sistema.

### Gaps detectados

- No existe token de **success / warning / info / alert** en el design system, a pesar de que la UI los usa en 4 páginas.
- `text-subtle #94a3b8` sobre blanco falla contraste (ver §9).
- En oscuro, `brand-hover` es más claro que `brand` y `border` == `border-light`.

---

## 4. Tipografía

### Familia

- Configurada como `Inter, system-ui, sans-serif` (`tailwind.config.ts:38`, `globals.css:60`).
- **Hallazgo crítico:** **Inter nunca se carga** (no hay `<link>` en `index.html`, ni `@import`, ni paquete `@fontsource`). El sistema renderiza con `system-ui` de cada SO. El diseño no es reproducible entre Windows/macOS/Linux.

### Escala de tamaños detectada

| Clase | Tamaño | Uso |
|---|---|---|
| `text-xs` | 12px | Captions, badges, labels en tarjetas, notas |
| `text-sm` | 14px | Cuerpo, tablas, descripciones, labels de form |
| `text-base` | 16px | Texto de botones principales |
| `text-lg` | 18px | Subtítulos de tarjetas, montos de fila |
| `text-xl` | 20px | Títulos de modal, subtítulos de sección |
| `text-2xl` | 24px | H1 de página, montos de tarjeta |
| `text-3xl` | 30px | KPIs grandes (Dashboard, Vehículos) |

### Pesos

- `font-medium` (500) — labels, encabezados de tabla.
- `font-semibold` (600) — botones, badges.
- `font-bold` (700) — títulos, placas, montos.

### Detalles tipográficos notables

- **Placa del vehículo:** `font-mono font-bold tracking-widest uppercase` en el input (RegistroPage:65) y `font-mono` en el ticket (AlertaRegistro:58) — buen toque de identidad técnica.
- **Recibo impreso:** `'Courier New', monospace` a 12px, ancho 80mm (`receipt.service.ts:24-25`).
- **Etiquetas de tarjeta:** mayúsculas con `tracking-wider` (Vehículos, Caja) — patrón repetido.
- **Jerarquía:** correcta y consistente (H1 24px bold → subtítulos 14px muted). No hay uso de `text-4xl+` ni letras capitales; la escala es compacta, apropiada para operación de escritorio.

---

## 5. Sistema de espaciado

No hay tokens de espaciado propios: se usa la **escala por defecto de Tailwind (base 4px)**.

### Patrones recurrentes

| Elemento | Espaciado |
|---|---|
| Contenedor principal | `max-w-6xl` (1152px), `px-4 sm:px-6 py-6` |
| Separación entre bloques de página | `space-y-6` (24px) |
| Grid de tarjetas | `gap-4` (16px) |
| Padding interno de tarjetas | `p-5` (20px) y `p-6` (24px); formularios `p-6 sm:p-8` |
| Formularios | `space-y-6` entre grupos, `space-y-2` entre label e input |
| Header | `h-14` (56px) |
| Altura de inputs | `h-10` (default), `h-11` (común), `h-12` (registro/pago) |
| Modales | `max-w-md` / `max-w-lg`, `p-6`, `mx-4`, radio `rounded-2xl` |
| Tablas | `py-3 px-3` en celdas, borde inferior `border-border-light` |
| Separadores internos de tarjeta | `space-y-3/4`, `border-t` / `border-b` |

### Radios

- `rounded-md` (6px): botones/inputs del sistema shadcn.
- `rounded-lg` (8px): logo, chips, badges.
- `rounded-xl` (12px): tarjetas, contenedores de formulario internos.
- `rounded-2xl` (16px): tarjetas de formulario principales, modales.
- `rounded-full`: badges de estado, avatares de icono.

### Observaciones

- **Doble estándar de radio:** el componente `Button`/`Input` usa `rounded-md`, pero los botones reales en páginas se ven dentro de contextos `rounded-xl/2xl`. No es grave, pero el sistema "copia shadcn" convive con un sistema "custom" más redondeado sin decisión explícita.
- Alineaciones: consistente — los formularios usan grid `sm:grid-cols-2 gap-4`; las tarjetas métricas `grid-cols-1 sm:2 lg:4 gap-4`.
- El espaciado es **generoso y equilibrado**; no hay sensación de hacinamiento.

---

## 6. Componentes

### Componentes reutilizables formales (`src/shared/components/ui/`)

#### Button (`button.tsx`) — shadcn
- **Propósito:** acción principal/secundaria.
- **Estilo:** `rounded-md`, 5 variantes (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`), 4 tamaños.
- **Consistencia:** media. El botón default usa `bg-primary text-primary-foreground` y el outline `border-input hover:bg-accent`, **tokens que NO existen** en `tailwind.config.ts` ni en `globals.css`. En la práctica, cada página compensa con `className="bg-brand hover:bg-brand-hover text-white ..."`, de modo que **ningún botón usa realmente la variante default tal cual**. `destructive` sí funciona (token definido). `secondary`, `ghost` y `link` están rotos.
- **Fortalezas:** buena base accesible (`focus-visible:ring-2`, `disabled:opacity-50`), API limpia con `cva` y `Slot` (asChild).
- **Debilidades:** variantes inutilizables sin override; el "sistema" está a medias.

#### Input (`input.tsx`) — shadcn
- **Propósito:** captura de texto.
- **Estilo:** `rounded-md h-10`, foco con ring.
- **Fortalezas:** `md:text-sm` + `text-base` en móvil (evita zoom de iOS), focus visible.
- **Debilidades:** usa `border-input` (no definido; se salva por el `* { border-color }` global) y `ring-ring` (no definido → anillo azul por defecto de Tailwind, no cyan).

#### Select (`select.tsx`) — Radix
- **Propósito:** selector desplegable (tipo de vehículo).
- **Estilo:** trigger shadcn + portal Radix.
- **Debilidades críticas:** el panel usa `bg-popover text-popover-foreground` (**indefinido** → fondo transparente, se ve la página detrás); los items usan `focus:bg-accent focus:text-accent-foreground` (**indefinido** → sin highlight de hover/foco). El dropdown del Registro es visualmente defectuoso.

#### Card (`card.tsx`) — shadcn
- **Propósito:** contenedor.
- **Estado:** **no se usa en ninguna pantalla** (0 imports). Todas las páginas construyen sus tarjetas con `<div className="rounded-xl border border-border bg-surface p-5 shadow-sm">` inline. Además usa tokens `bg-card`/`card-foreground` no definidos.
- **Debilidad:** componente muerto + patrón duplicado en 7 archivos.

#### Tabs (`tabs.tsx`) — Radix
- **No usado** (0 imports). En Caja los "periodos" se implementan con botones raw. Tokens `bg-muted`/`muted-foreground` no definidos.

#### Checkbox (`checkbox.tsx`)
- **No usado** (0 imports). Las páginas usan `<input type="checkbox">` raw con `accent-brand`. Borde `border-gray-300` hardcodeado (rompe el sistema).

### Componentes "de facto" (implementados inline, repetidos en varias pantallas)

Estos son los verdaderos componentes del sistema, aunque estén copiados en cada página:

#### Tarjeta de métrica (KPI card)
- **Uso:** Dashboard, Vehículos, Caja. Patrón `rounded-xl border border-border bg-surface p-5 shadow-sm` con icono en chip de color.
- **Inconsistencia:** en Vehículos las dos primeras tarjetas usan `border-l-4 border-l-brand` (acento izquierdo) en vez del chip de icono; el resto del sistema usa chip. Dos patrones distintos para lo mismo.

#### Badge / pill de estado
- **Uso:** AlertaRegistro ("Activo"), Vehículos (mensualidad "Sí", estados), PagoModal.
- **Estilo:** `rounded-full px-2.5 py-0.5 text-xs font-semibold`, fondo `green-50` + texto `green-700`, con punto de color (`size-1.5 rounded-full`).
- **Debilidad:** los estados de Vehículos (vencido/por vencer/alerta/activo) **no usan badge** en la tabla; se imprime el string crudo `{m.estado}` (VehiculosPage:170), dejando los valores `por_vencer`/`vencido` sin formato ni color.

#### Modal / Diálogo
- **Existen 3 modales hand-rolled** (sin Radix Dialog pese a estar en deps):
  1. `AlertaRegistro` (éxito/error de ingreso).
  2. `PagoModal` (cobro + recibo).
  3. Confirmación de "Cerrar Caja" (inline en CajaPage:157).
- **Estilo:** `fixed inset-0 z-50 bg-black/40` + panel `rounded-2xl border bg-surface p-6 shadow-xl max-w-md/max-w-lg`.
- **Debilidades:** sin `aria-modal`, sin focus trap, sin manejo de `Escape`, sin `role="dialog"`. PagoModal cierra por click en overlay; AlertaRegistro no. Comportamiento inconsistente entre modales.

#### Formulario
- **Patrón:** card `rounded-2xl`, campos con label `text-sm font-medium` + input `h-11/12`, grupos en grid `sm:grid-cols-2 gap-4`, separadores de sección con título uppercase.
- **Tarjetas de opción de pago** (RegistroPage:104-141): labels clicables tipo tarjeta con borde que se activa en `border-brand bg-brand-light` — bien resuelto visualmente.

#### Tabla
- **Patrón:** `table w-full text-sm`, thead `text-text-muted font-medium`, filas con `border-b border-border-light hover:bg-background`, scroll horizontal `overflow-x-auto -mx-6`.
- **Debilidad:** sin paginación, sin ordenamiento, sin acciones por fila. El estado "mensualidad" de la columna depende de valores crudos del backend.

#### Estado vacío / Empty state
- **Patrones:** ícono grande `size-10/12 text-text-subtle` + mensaje `text-sm text-text-muted`, centrado. En PagoPage usa `border-dashed` (distinto al resto). Mensajes de "Conecta la API" usados como estado vacío (no es un empty state real: es un placeholder de desarrollo).

#### Loader
- **Solo spinner `Loader2 animate-spin`** en botones ("Ingresando...", "Calculando...", "Registrando..."). No hay skeletons, ni spinners de página, ni indicadores de carga de tablas (las tablas de Vehículos simplemente aparecen vacías si la API falla — error silencioso en `useVehiculos`).

#### Alertas / toasts
- **No existe sistema de toasts/notificaciones.** Los errores de login se muestran como banner inline (`role="alert"`, LoginPage:106). Los errores de registro como modal. Dos patrones distintos para "error".

#### Header / Nav
- Ítems de navegación con ícono lucide + label, estados activo/inactivo. Sin dropdown de usuario (el header no muestra quién está logueado ni rol).

### Resumen del inventario

| Componente | Usado | Tokens correctos | Observación |
|---|---|---|---|
| Button | ✓ | parcial | default/ghost/link rotos |
| Input | ✓ | parcial | ring azul |
| Select | ✓ | ✗ | dropdown transparente |
| Card | ✗ | ✗ | muerto |
| Tabs | ✗ | ✗ | muerto |
| Checkbox | ✗ | parcial | muerto |
| Radix Dialog/Progress/Separator/Label | ✗ | — | dependencias sin uso |

---

## 7. Pantallas

### 7.1 Login (`/login` — LoginPage)
- **Objetivo:** autenticar operador.
- **Estructura:** pantalla completa centrada; logo (caja cyan 64px con ícono `Car` + sombra `brand/20`), título "SmartPark Pro", formulario en card `rounded-2xl` con Usuario/Contraseña, toggle de visibilidad, banner de error y botón submit full-width con spinner.
- **Fortalezas:** diseño limpio y centrado, autofocus en usuario, `autoComplete` correcto, toggle de password con `aria-label` y `tabIndex={-1}`, botón deshabilitado durante carga, el error limpia al editar.
- **Problemas:** sin "mostrar/ocultar" bien accesible en contraste (ícono `text-text-subtle`), sin opción de recuperar credenciales (puede no ser necesaria en app interna), el mensaje de error genérico no distingue "usuario no existe" de "servidor caído", y en modo oscuro el logo mantiene `text-white` sobre `bg-brand` (cyan-600) con contraste bajo sobre el mismo cyan-600 (el ícono cyan-400 sobre cyan-600 en dark: ok pero subóptimo).
- **Complejidad:** baja.
- **UX:** buena. Flujo de 2 campos + submit. Redirige por rol.

### 7.2 Home / Panel de Control (`/` y `/dashboard` — HomePage → DashboardPage para admin)
- **Objetivo:** resumen del parqueadero.
- **Estructura:** H1 + 4 KPIs (Vehículos en patio, Ingresos hoy, Clientes mensuales, Tiempo promedio) + 2 tarjetas grandes ("Ocupación", "Transacciones Recientes").
- **Fortalezas:** grid responsive 1/2/4, jerarquía numérica clara (`text-3xl font-bold`).
- **Problemas:** **toda la pantalla es placeholder** — KPIs en `—`/`$0`, subtítulos "Conecta la API", secciones con texto de desarrollo. El ícono de Ingresos usa `text-green-600` hardcodeado; el resto `text-brand`. No hay gráfica de ocupación (en una app de parqueadero es la vista más valiosa).
- **Complejidad:** baja (estática).
- **UX:** decepcionante para el rol admin; no permite tomar ninguna decisión.

### 7.3 Registro de Ingreso (`/` — RegistroPage, home del empleado)
- **Objetivo:** registrar la entrada de un vehículo (flujo primario del operador).
- **Estructura:** card `rounded-2xl` con: placa (input grande `h-12 text-lg font-bold tracking-widest` uppercase, `maxLength=10`), tipo (Select Radix), marca opcional, opciones de pago (tarjetas clicables Mensualidad/Pago Diario), calculadora de precio en vivo ("Total a Pagar"), botón "Registrar Entrada" + modal de confirmación con impresión.
- **Fortalezas:** **la mejor pantalla del sistema.** Cálculo de precio reactivo al cambiar opciones (con spinner "Calculando..."), auto-mayúsculas en placa, opciones mutuamente excluyentes bien implementadas, tarjeta de total prominente, modal de éxito con ticket e impresión, el formulario se limpia tras registrar.
- **Problemas:** el Select de tipo tiene el dropdown defectuoso (fondo transparente, sin highlight de items); la opción "Día especial/Evento" no aparece pese a existir en la lógica (`diaEspecial` está en el hook y en el cálculo, pero **no hay control en la UI**); el modal no es accesible (sin focus trap/Escape); no hay validación de formato de placa (acepta cualquier cosa ≤ 10 chars); "Total a Pagar" se muestra `—` si la API falla sin explicación.
- **Complejidad:** media.
- **UX:** flujo principal bueno y rápido (4 campos + 1 click). La ausencia del toggle de evento y la falta de feedback de validación son las fricciones principales.

### 7.4 Gestión de Vehículos (`/vehiculos` — admin)
- **Objetivo:** listar placas y clientes mensuales.
- **Estructura:** 2 KPIs con acento izquierdo (`border-l-4`), tabla "Placas Registradas" con buscador (filtro local por placa), y sección "Clientes Mensuales" con 4 tarjetas de estado (Vencidos/Por vencer/Alerta/Activos) + tabla.
- **Fortalezas:** datos reales vía API (`useVehiculos` hace 3 llamadas), buscador con ícono dentro del input, estados con semántica de color clara (red/yellow/orange/green), filas con hover.
- **Problemas:** los KPIs usan un patrón de tarjeta distinto al resto; la tabla de mensuales imprime `{m.estado}` **crudo** (sin badge/formato); el filtro solo busca por placa exacta con `includes` (no ignora espacios/guiones); no hay paginación; la carga no muestra skeleton y el error es silencioso (si la API falla parece "no hay datos"); el contador "N vehículos" refleja los filtrados, no el total. `Button` se importa pero no se usa.
- **Complejidad:** media.
- **UX:** funcional; la confusión entre "no hay datos" y "error de red" es el mayor problema.

### 7.5 Cobrar Salida (`/pago` — PagoPage + PagoModal)
- **Objetivo:** cobrar la salida de un vehículo en patio.
- **Estructura:** contador "En patio", buscador, lista de tarjetas de vehículo (ícono de tipo, placa, hora de ingreso, tiempo, monto, botón "Cobrar"), modal de pago con métodos (Efectivo/Tarjeta/Nequi), montos rápidos, cálculo de cambio y vista de recibo con impresión.
- **Fortalezas:** **la segunda mejor pantalla.** El modal de pago es excelente: selector de método tipo tarjeta, montos rápidos `+5000/+10000/+20000/+50000`, botón "Exacto", cálculo de cambio en tarjeta verde, recibo tipo termal (`font-mono`, bordes punteados) y botón imprimir.
- **Problemas:** **todos los datos son simulados** (`vehiculosSimulados` hardcodeado, PagoPage:15-21); `useReceipt.pagar` usa `setTimeout(800)` y genera datos falsos con **tarifa fija $3.200** sin importar el vehículo ni el método (`useReceipt.ts:23-38`); el recibo no refleja el monto del vehículo seleccionado; `procesarPago` del service existe pero no se usa; `montosRápidos` suma acumulativamente (puede crear montos raros); en efectivo, si `montoRecibido > 0` pero `< total`, el botón queda habilitado y acepta el pago (falta validación de monto suficiente); el modal no tiene focus trap.
- **Complejidad:** media-alta (el modal más complejo del sistema).
- **UX:** el flujo conceptual es bueno, pero al ser demo no se puede validar la experiencia real de cobro.

### 7.6 Caja (`/caja` — CajaPage)
- **Objetivo:** resumen de dinero y cierre de caja.
- **Estructura (rol employee):** 3 KPIs (Dinero en caja, Ingresos del día, Entregado hoy) + tarjeta "Cierre de Caja" con botón.
- **Estructura (rol admin):** + 2 KPIs (Carros/Motos hoy), tarjeta "Historial de Ingresos" con filtros de periodo (Día/Semana/Mes/Año hechos con botones raw), desglose (Total del Día / Por Carros / Por Motos) y lista "Transacciones Recientes".
- **Problemas:** **todo es cero/placeholder** (`dineroEnCaja=0`, `useCaja` con estado hardcodeado, sin llamadas API a pesar de que `caja.service.ts` ya define los endpoints); los periodos son botones **sin estado activo funcional** (`periodoActivo` es constante `"Día"` en el componente, no del hook); el desglose usa colores no consistentes (blue/brand/red); "Cerrar Caja" muestra un modal de confirmación que **no hace nada** al confirmar (CajaPage:177-182); "Transacciones Recientes" es un placeholder.
- **Complejidad:** media (muchos estados condicionados por rol).
- **UX:** estructura clara pero vacía; el flujo de cierre de caja está inconcluso (peligroso para un producto real: un operador creería que cerró la caja).

### 7.7 Configuración (`/configuracion` — admin)
- **Objetivo:** editar tarifas y activar evento del día.
- **Estructura:** botón "Editar Tarifas" (toggle), 2 columnas Moto/Carro con inputs de tarifa (disabled salvo en modo edición), "Guardar Cambios", aviso de reimpresión con placa `0101`, y toggle "Día especial/Evento activo".
- **Fortalezas:** modo edición claro (campos se habilitan), prefijo `$` dentro del input, el aviso de reimpresión es un buen patrón de ayuda contextual.
- **Problemas:** **"Guardar Cambios" no tiene `onClick`** (ConfiguracionPage:110) — no persiste nada; los valores vienen de defaults hardcodeados en el hook (`useConfiguracion`), no de la API aunque `configuracion.service.ts` ya tiene los endpoints; el botón "Editar" cambia a rojo/destructive para "Cancelar" (semántica discutible: Cancelar no es destructivo); al salir de edición sin guardar no hay confirmación de descarte; el evento es un checkbox sin confirmación.
- **Complejidad:** baja-media.
- **UX:** edición estática y no persistente; el "Guardar" sin efecto es la fricción principal.

---

## 8. Consistencia

### Lo consistente
- Jerarquía de títulos idéntica en las 7 páginas (H1 2xl bold + subtítulo muted).
- Patrón de tarjeta `rounded-xl border bg-surface p-5/6 shadow-sm` dominante.
- Esquema de color cyan+slate en todas las superficies.
- Labels de formulario idénticos (`text-sm font-medium text-text-secondary`).
- Botones primarios siempre `bg-brand hover:bg-brand-hover text-white font-semibold shadow-sm` con alturas `h-11/h-12`.
- Estados hover con `transition-colors/transition-all` uniformes.
- Uso consistente de íconos Lucide de 16px (`size-4`) en chips de 32px (`size-8`) para KPIs.

### Inconsistencias principales
1. **Tokens vs hardcode:** el sistema formal (shadcn) referencia tokens inexistentes (`primary`, `popover`, `accent`, `card`, `muted`, `ring`), mientras las páginas usan tokens custom (`brand`, `surface`, `text-*`) o colores Tailwind directos. Tres capas mezcladas.
2. **Radios:** `rounded-md` (componentes UI) vs `rounded-xl/2xl` (páginas). 
3. **Tarjetas de métrica:** chip de icono (Dashboard/Caja) vs `border-l-4` (Vehículos).
4. **Estados:** éxito siempre verde pero en 4 tonos distintos según pantalla (`green-100/500/600/700`, `green-50/700`...). Rojo como `destructive` (token) y como `red-50/100` (hardcode).
5. **Modales:** 3 implementaciones con comportamientos distintos (click-outside sí/no, tamaños `max-w-sm/md/lg`, botón cerrar siempre presente).
6. **Errores:** banner inline (login) vs modal (registro) vs silencio (tablas).
7. **Empty states:** PagoPage con `border-dashed`, resto sin él.
8. **Botones `variant="default"`** del sistema no funcionan sin override → cada página reinventa el "primario".
9. **HomeRedirect vs HomePage:** dos componentes que hacen la misma redirección por rol; `HomeRedirect` es código muerto.
10. **Tipo de vehículo:** token `vehicle-auto` es el mismo cyan de marca; la distinción visual carro/moto depende del contexto (bg chip vs texto).

---

## 9. Accesibilidad

### Contraste (WCAG 2.1, AA = 4.5:1 texto normal, 3:1 texto grande)

| Par | Ratio aprox. | Resultado |
|---|---|---|
| `brand #0891b2` sobre blanco | ~3.9:1 | **Falla AA** para texto normal (ok solo texto grande/UI) |
| `brand #0891b2` sobre `brand-light #ecfeff` | ~3.1:1 | **Falla** (índice activo del nav, badges) |
| `text-muted #64748b` sobre blanco | ~4.7:1 | Pasa AA (justo) |
| `text-subtle #94a3b8` sobre blanco | ~2.9:1 | **Falla** (muy usado: subtítulos, placeholders, metadata) |
| `text-muted #94a3b8` sobre `#020617` (dark) | ~5.5:1 | Pasa |
| `green-700 #15803d` sobre `green-50` | ~4.9:1 | Pasa |
| `white` sobre `brand` (botones) | ~3.9:1 | **Falla AA** para `text-sm font-semibold` en botones |
| `red-600 #dc2626` sobre blanco | ~4.8:1 | Pasa |
| `yellow-600 #ca8a04` sobre `yellow-50` | ~3.6:1 | Falla para texto normal |

**Conclusión:** el color de marca cyan sobre blanco (usado como texto en activos, totales, badges y links) **no cumple AA**. Es la deuda de contraste más difundida.

### Tamaño de texto
- Base 14px (`text-sm`) en la mayoría del contenido: correcto para escritorio.
- `text-xs` (12px) en badges, captions y notas: pequeño pero tolerable para metadata.
- No hay opción de escalado de fuente ni `rem` personalizados fuera de Tailwind.

### Áreas clicables
- Altura estándar `h-10` (40px) en botones/inputs default → **por debajo del objetivo de 44px** (WCAG 2.5.5, AAA). Los botones operativos principales usan `h-11/h-12` (44/48px) → correctos.
- Chips de icono decorativos (`size-8`) no clicables — bien.
- Targets de opciones de pago y métodos de pago: `p-3/py-3` → ~42-48px, aceptable.

### Navegación por teclado / foco
- Los inputs y botones tienen `focus-visible:ring-2` (pero anillo **azul por defecto de Tailwind**, no cyan de marca → inconsistente con el sistema).
- El toggle de tema del header es un `<button>` sin `focus-visible` explícito (heredaría default).
- **Los 3 modales no son accesibles por teclado:** no hay focus trap, no se mueve el foco al abrir, no se maneja `Escape`, no se restaura el foco al cerrar, y no tienen `role="dialog"`/`aria-modal`.
- Los botones de periodo de Caja y los métodos de pago son `<button>` — navegables.
- Los labels usan `<label>` correcto en formularios (click enfoca el input). Los toggle de tema y botones de cierre tienen `aria-label`.
- El checkbox personalizado de checkbox.tsx es un `<input type="checkbox">` nativo (accesible).

### Legibilidad
- Buena jerarquía tipográfica, interlineado por defecto, no hay texto justificado.
- En dark mode el contraste general mejora (texto claro sobre slate-950).
- La placa en `tracking-widest uppercase` es legible y aporta identidad.

### Problemas de accesibilidad a corregir (prioridad)
1. Contraste del cyan de marca sobre blanco/claro (texto y botones).
2. Contraste de `text-subtle`.
3. Modales sin semántica ni teclado (focus trap, Escape, roles).
4. Anillo de foco azul inconsistente + estados de foco ausentes en iconos del header.
5. Nav móvil con íconos sin `aria-label`/tooltip.
6. Falta de `lang`/atributos ARIA en el Select de Radix (Radix lo maneja por defecto — verificar etiqueta accesible del trigger).
7. Notificación de error de login sin `aria-live` (solo `role="alert"`, que ya lo provee en cierta medida).

---

## 10. Experiencia de Usuario

### Flujo completo del operador (rol employee)
```
Login → [Registro de Ingreso] (home)
      → Cobrar salida → PagoModal (método + efectivo/cambio) → Recibo → Imprimir
      → Caja → Cerrar Caja (modal)
```

### Flujo del admin
```
Login → Dashboard (placeholder)
      → Vehículos (listado/búsqueda)
      → Configuración (tarifas/evento)
      → Caja (resumen/periodos)
```

### Fricción y pasos innecesarios
1. **Dashboard de admin sin datos:** la primera pantalla del admin es un "Conecta la API". Decepciona y no da contexto.
2. **Guardar sin guardar:** en Configuración, "Guardar Cambios" no persiste. En Caja, "Confirmar Cierre" no cierra. Ambos crean **falsa confianza** (el operador cree que su acción tuvo efecto).
3. **Flujo de pago demo:** los datos de patio y los montos son simulados; no se puede probar el flujo real end-to-end.
4. **Error silencioso en tablas:** si el backend falla, Vehículos parece vacío (mensaje "No hay registros") en lugar de mostrar un error. El usuario no distingue vacío real de falla técnica.
5. **Recálculo de precio por red:** cada cambio de opción de pago dispara un POST (`calcularPrecio`) sin debounce; a alta latencia la UX se siente lenta y frágil (más si falla → `—`).
6. **Cierre de caja ambiguo:** el modal no muestra desglose previo ni consecuencias; confirmar no hace nada.
7. **Sin feedback global:** no hay toasts; los resultados dependen de modales o banners puntuales.
8. **Tema no persistido:** cada reinicio de la app vuelve a light, aunque el operador eligió dark.
9. **Doble redirección de login:** `LoginPage` redirige a `/dashboard` o `/`, y `HomePage` decide de nuevo; `RoleGuard` protege `/dashboard` — lógica duplicada en 3 lugares.
10. **Buscar por placa rígido:** no normaliza espacios/guiones/minúsculas en Vehículos (`v.placa.includes(searchQuery.toUpperCase())`).

### Procesos lentos
- `PagoModal` fuerza 800ms de "Procesando..." artificiales (`useReceipt.ts:23`) — en producción esto debe ser latencia real o feedback instantáneo.
- Tablas sin carga incremental; la app carga todo o nada.

### Oportunidades de mejora (a detallar en fase de rediseño)
- Un dashboard real con la ocupación del patio (la métrica central de un parqueadero).
- Turno activo visible en el header (usuario, rol, turno, reloj).
- Confirmaciones/undo para acciones irreversibles (cierre de caja).
- Estados vacíos que distingan "sin datos" de "error de conexión" + retry.
- Validación inline de placa con feedback inmediato.
- Debounce en el cálculo de precio.
- Persistencia de preferencias (tema, último periodo de caja).

---

## 11. Deuda de diseño (priorizada)

Prioridad: **P0 = bloqueante**, **P1 = alto impacto**, **P2 = mejora**, **P3 = pulido**.

### P0 — Bloqueante

1. **Componentes shadcn con tokens inexistentes.**
   `Button` default → `bg-primary`, `text-primary-foreground`; `Select` dropdown → `bg-popover`; `Tabs`/`Card` → `bg-card`/`bg-muted`; `Input` → `border-input`/`ring-ring`. Nada de esto existe en `tailwind.config.ts` ni `globals.css`. Consecuencias visibles: botones default invisibles, dropdown del Select transparente, focus ring azul, hover nulo en botones outline/secondary/ghost. *Por qué importa:* es la base del design system; cada corrección futura se hace sobre cimientos rotos.
2. **Modales no accesibles y con comportamiento divergente.**
   Sin `role="dialog"`, focus trap, Escape ni restauración de foco; click-outside inconsistente entre modales. *Por qué importa:* un operador con teclado no puede operar el flujo de cobro/cierre; es un problema legal (accesibilidad) y operativo.

### P1 — Alto impacto

3. **Falsa operación:** "Guardar Cambios" (Configuración) y "Confirmar Cierre" (Caja) no ejecutan ninguna acción. *Por qué importa:* el usuario cree haber realizado un registro; en caja esto es un riesgo financiero/operativo real.
4. **Datos simulados en pantallas de operación.** PagoPage hardcodea vehículos; useReceipt inventa montos con tarifa fija $3.200; Dashboard/Caja son placeholders; Configuración ignora la API (aunque los services ya existen). *Por qué importa:* la app no es usable en producción y la UX no se puede validar.
5. **Contraste insuficiente del cyan de marca y de `text-subtle`** (≈3.9:1 y ≈2.9:1 sobre blanco). *Por qué importa:* falla WCAG AA en textos de uso frecuente (totales, badges, nav activa, placeholders).
6. **Paleta de estados sin tokens** (éxito/advertencia/info hardcodeados en green/yellow/orange/blue con tonos inconsistentes entre pantallas). *Por qué importa:* impide consistencia y provoca retoques ad-hoc en cada pantalla.
7. **Inter nunca se carga.** `font-family: Inter` declarado pero el archivo no existe → renderiza `system-ui` variable por SO. *Por qué importa:* la identidad tipográfica no es reproducible.
8. **Select de tipo de vehículo defectuoso** (dropdown transparente, sin highlight de items). *Por qué importa:* es un campo obligatorio del flujo primario.

### P2 — Mejora

9. **Patrón de tarjeta duplicado en 7 archivos** mientras el componente `Card` (y `Tabs`/`Checkbox`) están muertos. *Por qué importa:* cambio de diseño = 7 ediciones manuales; hay componentes y dependencias que pagan mantenimiento sin uso.
10. **Tema no persistido** y siempre inicia light. *Por qué importa:* preferencia del usuario ignorada; en un escritorio POS con luz cambiante es relevante.
11. **Tablas sin paginación, orden ni acciones**; contador "N vehículos" mezcla filtrados con totales; estado `m.estado` sin formatear. *Por qué importa:* a volumen real, la tabla se vuelve inmanejable.
12. **Error silencioso en carga de datos** (useVehiculos traga excepciones). *Por qué importa:* "no hay datos" y "API caída" se ven igual; fomenta decisiones erróneas.
13. **Recálculo de precio sin debounce** (POST por cada cambio de opción). *Por qué importa:* latencia y carga innecesaria en el flujo más usado.
14. **Foco del anillo inconsistente (azul)** y falta de `focus-visible` en controles de ícono del header. *Por qué importa:* coherencia de navegación por teclado.
15. **Nav móvil sin labels ni `aria-label`/tooltip** en íconos. *Por qué importa:* en ventanas pequeñas (min 1024px de Electron, pero la web corre en 5173) la navegación se vuelve ambigua.
16. **`HomeRedirect` duplicado y lógica de redirección triple** (LoginPage/HomePage/RoleGuard). *Por qué importa:* código muerto y comportamiento difícil de predecir.

### P3 — Pulido

17. **Sin sistema de notificaciones/toasts**; errores con 2 patrones distintos (banner vs modal).
18. **Empty states con estilos distintos** (PagoPage con borde punteado, resto sin él).
19. **KPIs de Vehículos con `border-l-4`** vs chip de icono del resto del sistema.
20. **"Cancelar" con variante destructive** en Configuración (semántica engañosa).
21. **`montosRápidos` acumulativos** en el modal de pago (puede generar montos incoherentes).
22. **Sin validación de monto recibido ≥ total** en efectivo (permite cobrar de menos).
23. **Import no usado** (`Button` en VehiculosPage) y dependencias Radix sin uso (Dialog, Label, Progress, Separator).
24. **Icono del login con `text-white`** que puede desvanecerse sobre cyan en dark.
25. **Modo oscuro:** `border` == `border-light`, `brand-hover` más claro que `brand`.

---

## 12. Fortalezas

1. **Base visual moderna y coherente:** paleta cyan/slate, tarjetas redondeadas, sombras sutiles, transiciones — está al nivel de un dashboard SaaS contemporáneo.
2. **Arquitectura de código por features** (`modules/` autocontenidos con components/hooks/services) que facilita iterar el diseño sin acoplar pantallas.
3. **Design tokens por CSS variables** con modo oscuro ya implementado y funcional.
4. **Jerarquía tipográfica y de datos sólida:** H1 uniformes, montos en negrita grandes, metadata muted — lectura de datos rápida.
5. **El flujo de Registro de Ingreso es excelente:** cálculo de precio en vivo, auto-mayúsculas de placa, opciones mutuamente excluyentes, modal de éxito con impresión directa.
6. **El modal de Pago es muy bueno conceptualmente:** métodos de pago con ícono, montos rápidos, botón "Exacto", cálculo de cambio destacado, recibo tipo termal con print.
7. **Micro-interacciones cuidadas:** spinners en botones ("Ingresando...", "Calculando...", "Registrando..."), disabled states durante envío, hover en filas y tarjetas.
8. **Header con backdrop-blur y sticky** — detalle de pulido que pocas apps de escritorio tienen.
9. **Navegación por roles** (employee ve solo lo suyo) con guard de rutas.
10. **Detalles de identidad técnica:** placa `font-mono tracking-widest`, recibo de 80mm, badges con punto de estado.
11. **Responsive real** en las grillas (1→2→4 columnas) pese a ser una app de escritorio.
12. **Empty states con mensajería útil** en PagoPage (distingue búsqueda sin resultado vs sin vehículos en patio).
13. **Aviso contextual de reimpresión** (placa `0101`) — buena ayuda embebida.
14. **Código TSX limpio y tipado** (types por módulo), lo que hace el rediseño seguro y rápido.

---

## 13. Conclusión

**Estado actual:** SmartPark Pro tiene una **piel visual sólida y moderna** montada sobre una **operación aún no construida**. A nivel de diseño, lo que existe es un excelente prototipo de alta fidelidad: la dirección estética es correcta, el lenguaje visual es consistente en su forma, y las dos pantallas de flujo primario (Registro y Pago) muestran decisiones de UX por encima de la media (cálculo reactivo de tarifas, métodos de pago con cambio, recibo imprimible).

Sin embargo, como producto, el sistema está en un punto de **falsa completitud**: el administrador y el cajero pueden tocar botones que no persisten nada, ver métricas en cero y recibir recibos generados por código de demostración. Desde la perspectiva de un Product Designer senior, esto no es "diseño mal hecho" sino **un sistema a medio implementar que mantiene la fachada visual del destino final** — la parte más difícil (consistencia del design system y flujo operativo real) sigue pendiente.

**Las tres conclusiones accionables (para la fase siguiente, no para esta auditoría):**
1. El **design system formal está roto en sus cimientos** (tokens shadcn inexistentes) y convive con un sistema informal de clases inline. Antes de rediseñar conviene **decidir un único sistema de tokens** y eliminar las capas paralelas.
2. La **experiencia se valida sobre datos falsos**; el valor de la auditoría de UX está condicionado a completar la integración con el backend real.
3. Las **deudas de accesibilidad y de "acciones que no accionan"** son las de mayor prioridad de negocio: en una app de caja, un botón que no guarda es un riesgo mayor que una paleta desalineada.

En resumen: **base visual moderna, arquitectura de componentes prometedora, flujos primarios bien pensados, pero sistema de diseño incompleto y operación simulada.** El producto está listo para un rediseño ordenado que cierre el sistema de tokens, haga funcionales las superficies y proteja la accesibilidad — no para uno que parta de cero.

---

*Anexo metodológico: la auditoría se realizó por inspección estática de `Frontend/src` (7 módulos, 7 pantallas, 6 componentes UI compartidos, 3 stores, router y Electron), más `globals.css` (tokens), `tailwind.config.ts`, `components.json`, `index.html`, documentación raíz (`README.md`, `ARCHITECTURE.md`, `docs/`) y verificación de ausencia de lógica en `Backend/`. No se ejecutó la aplicación ni se modificó ningún archivo.*
