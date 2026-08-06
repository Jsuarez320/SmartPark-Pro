# Notas técnicas de consistencia

Reglas para mantener la consistencia visual y fallas conocidas. Sin código.

## Estado del design system

- Tokens reales definidos (globals.css): `brand`, `vehicle`, `destructive`, `background`, `surface`, `border`, `text`.
- Los componentes shadcn referencian tokens **que no existen**: `primary`, `primary-foreground`, `ring`, `accent`, `accent-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `popover`, `popover-foreground`, `card`, `card-foreground`, `border-input`, `foreground`.
- Regla global `* { @apply border-border }` pinta el borde de todo elemento → compensa `border-input` ausente.
- Conviven 3 capas cromáticas: tokens custom, tokens shadcn inexistentes, colores Tailwind directos.

## Fallas conocidas (no propagar)

- `Button variant="default"` → invisible (`bg-primary` inexistente). En la práctica todo botón primario lleva override explícito `bg-brand hover:bg-brand-hover text-white font-semibold shadow-sm`.
- `secondary`/`ghost`/`link` → rotos. `outline` → hover nulo (`bg-accent` inexistente).
- `Select` dropdown → fondo transparente (`bg-popover`) y sin highlight de items (`focus:bg-accent`).
- Focus ring → azul por defecto de Tailwind, no cyan (`ring-ring` inexistente).
- `Card`/`Tabs`/`Checkbox` → 0 imports (muertos); las páginas usan divs inline.
- Radix `Dialog`/`Label`/`Progress`/`Separator` instalados y sin uso; los 3 modales son hand-rolled.
- `VehiculosPage` importa `Button` sin usarlo.
- Tema: `uiStore` alterna la clase `.dark` en `<html>`; inicia light; sin persistencia.
- Inter declarado pero nunca cargado → renderiza `system-ui` (ver `typography.md`).
- Redirección por rol duplicada en 3 lugares + `HomeRedirect` muerto (ver `navigation.md`).

## Patrones que respetar (fuente de verdad visual)

- Jerarquía de títulos: H1 `text-2xl font-bold` + subtítulo `text-sm text-text-muted`.
- Tarjeta estándar: `rounded-xl border border-border bg-surface shadow-sm` (p-5/p-6).
- Tarjeta de formulario: `rounded-2xl border bg-surface p-6 sm:p-8`.
- Botón primario: `bg-brand hover:bg-brand-hover text-white font-semibold shadow-sm` (h-11/h-12).
- Label de form: `text-sm font-medium text-text-secondary`.
- Hover: `transition-colors`/`transition-all` uniformes.
- Íconos Lucide 16px (`size-4`) dentro de chips 32px (`size-8`).
- Badge: `rounded-full px-2.5 py-0.5 text-xs font-semibold` + punto `size-1.5`.
- Modal: `fixed inset-0 z-50 bg-black/40` + panel `rounded-2xl border bg-surface p-6 shadow-xl`.
- Tabla: `table w-full text-sm`; thead `text-text-muted`; filas `border-b border-border-light hover:bg-background`; scroll horizontal `overflow-x-auto`.
- Z-index: header `z-40`, modales `z-50`.

## Inconsistencias actuales (no repetirlas)

- Radios: `rounded-md` (componentes) vs `rounded-xl/2xl` (páginas).
- KPI cards: chip de icono (Dashboard/Caja) vs `border-l-4` (Vehículos).
- Éxito en verde con 4 tonos distintos según pantalla.
- 3 modales con comportamientos divergentes (click-outside sí/no, max-w-sm/md/lg).
- Errores: banner inline (login) vs modal (registro) vs silencio (tablas).
- Empty states: PagoPage con `border-dashed`, el resto sin él.
- "Cancelar" usa variante destructive en Configuración.
- `vehicle-auto` = mismo cyan de marca; la distinción carro/moto depende del contexto (chip vs texto).

## Fuentes de datos (estado)

- API real: Vehículos. Simulado/placeholder: Dashboard, Pago, Caja, Configuración (services ya existen sin uso).
- Impresión de recibo: ventana separada, formato 80mm, `Courier New`.
