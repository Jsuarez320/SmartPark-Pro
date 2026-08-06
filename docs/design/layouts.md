# Layouts

## Layout principal (AppLayout)

- Una sola columna centrada: `max-w-6xl` (1152px), `px-4 sm:px-6`, `py-6`.
- Fondo `background` (#f8fafc light / #020617 dark), texto `text-primary`.
- `min-h-screen`; se re-monta en cada cambio de ruta (`key=location.pathname`).
- **No existe sidebar, ni footer, ni breadcrumbs.** La navegación vive solo en el header.

## Header (sticky)

- `sticky top-0 z-40`, `h-14` (56px), `border-b`, `bg-surface/95` + `backdrop-blur`.
- Logo: caja 32px `rounded-lg bg-brand` con "SP" en blanco + texto "SmartPark Pro" (oculto < sm).
- Nav centrada con ítems ícono + label (gap 0.5–1).
- Zona derecha: toggle de tema (luna/sol) + botón "Salir" (`variant="outline"`).

## Contenedores

| Contexto | Tamaño |
|---|---|
| App | `max-w-6xl` (1152px) |
| Registro | `max-w-2xl` (672px) |
| Login | `max-w-sm` (384px), `min-h-screen` centrado |
| Modales | `max-w-sm/md/lg`, `mx-4` |

## Grids

| Contenido | Grid |
|---|---|
| KPIs | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` |
| Formularios | `grid-cols-1 sm:grid-cols-2 gap-4` |
| Opciones de pago | `grid-cols-2 gap-3` |
| Desglose ingresos (Caja) | `grid-cols-1 sm:grid-cols-3 gap-4` |
| Estados mensuales | `grid-cols-2 sm:grid-cols-4 gap-4` |
| Tarifas Moto/Carro | `grid-cols-1 lg:grid-cols-2 gap-6` |

## Patrones de superficie

- Tarjeta estándar: `rounded-xl border border-border bg-surface p-5/p-6 shadow-sm`.
- Tarjeta de formulario: `rounded-2xl border border-border bg-surface p-6 sm:p-8`.
- Modal: `fixed inset-0 z-50 bg-black/40` + panel `rounded-2xl border bg-surface p-6 shadow-xl`.
- Separación de página: `space-y-6`. Grids `gap-4`. Forms `space-y-6` / label-input `space-y-2`.
- Tabla: `overflow-x-auto -mx-6`; `table w-full text-sm`; filas `py-3 px-3 border-b border-border-light hover:bg-background`.
- Separadores internos de tarjeta: `space-y-3/4` + `border-t`/`border-b`.
