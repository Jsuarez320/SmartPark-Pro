# Catálogo de componentes

## Formales (`src/shared/components/ui/`)

### Button
- Propósito: acción principal/secundaria.
- Variantes: default, destructive, outline, secondary, ghost, link.
- Tamaños: default (h-10), sm (h-9), lg (h-11), icon.
- Estados: disabled (opacity-50), loading (spinner), focus-visible ring.
- Reuso: todas las pantallas.
- Nota: default/secondary/ghost/link rotos (tokens inexistentes); el primario real requiere override `bg-brand hover:bg-brand-hover text-white`. `destructive` funciona.

### Input
- Propósito: captura de texto.
- Tamaños: h-10 default; en páginas h-11/h-12.
- Estados: default, disabled, focus (anillo azul), placeholder.
- Reuso: login, registro, vehículos, pago, configuración.

### Select (Radix)
- Propósito: selector desplegable (tipo de vehículo).
- Estados: valor, placeholder, disabled, open/closed.
- Reuso: solo RegistroPage.
- Nota: dropdown con fondo transparente (`bg-popover` inexistente) y sin highlight de items.

### Card / Tabs / Checkbox — muertos (0 imports; las páginas usan divs inline).

## De facto (inline, repetidos entre pantallas)

### KPI card
- Propósito: métrica numérica.
- Patrón: `rounded-xl border border-border bg-surface p-5 shadow-sm` + ícono en chip `size-8`.
- Variantes: chip de icono (Dashboard/Caja) | acento `border-l-4 border-l-brand` (Vehículos) | fondo de tinte (red/yellow/orange/green) para estados.

### Badge / pill
- Propósito: estado corto.
- Patrón: `rounded-full px-2.5 py-0.5 text-xs font-semibold` + punto `size-1.5`.
- Estados: éxito (green-50/700), error (destructive/10), o crudo sin formato (`m.estado` en tabla de mensuales).

### Modal (3 hand-rolled, sin Radix Dialog)
- AlertaRegistro: éxito/error de ingreso + impresión de ticket.
- PagoModal: cobro (métodos, monto, cambio) + recibo.
- Confirmación Cerrar Caja (inline en CajaPage).
- Patrón: `fixed inset-0 z-50 bg-black/40` + panel `rounded-2xl p-6 shadow-xl`.
- Sin focus trap/Escape/`role=dialog`; click-outside solo en PagoModal.

### Formulario
- Patrón: form card + labels + inputs + grid 2 col.
- Tarjetas de opción de pago: label clicable; activo = `border-brand bg-brand-light`; mutuamente excluyentes.

### Tabla
- `table w-full text-sm`, thead muted, filas hover. Sin paginación/orden/acciones por fila.

### Empty state
- Ícono `size-10/12 text-subtle` + texto `text-sm muted` centrado. PagoPage usa `border-dashed` (el resto no).

### Loader
- Solo `Loader2 animate-spin` en botones. Sin skeletons ni indicadores de carga de tabla.

### Alertas
- No hay toasts. Errores: banner inline (login) | modal (registro) | silencio (tablas).

### Header / Nav
- Ítems ícono+label con estado activo/inactivo. Sin dropdown de usuario.

## Inventario

| Componente | Usado | Tokens | Estado |
|---|---|---|---|
| Button | ✓ | parcial | default/ghost/link rotos |
| Input | ✓ | parcial | ring azul |
| Select | ✓ | ✗ | dropdown transparente |
| Card | ✗ | ✗ | muerto |
| Tabs | ✗ | ✗ | muerto |
| Checkbox | ✗ | parcial | muerto |
| Radix Dialog/Label/Progress/Separator | ✗ | — | deps sin uso |
