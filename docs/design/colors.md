# Colores

Fuente única de datos: `design-tokens.json`. Existen dos capas: tokens semánticos (globals.css) y colores Tailwind hardcodeados en componentes.

## Tokens — modo claro

| Token | HEX |
|---|---|
| `--color-brand-primary` | `#0891b2` |
| `--color-brand-hover` | `#0e7490` |
| `--color-brand-light` | `#ecfeff` |
| `--color-brand-dark` | `#164e63` |
| `--color-vehicle-auto` | `#0891b2` |
| `--color-vehicle-moto` | `#dc2626` |
| `--color-destructive` | `#dc2626` |
| `--color-destructive-foreground` | `#ffffff` |
| `--color-background` | `#f8fafc` |
| `--color-surface` | `#ffffff` |
| `--color-border` | `#e2e8f0` |
| `--color-border-light` | `#f1f5f9` |
| `--color-text-primary` | `#0f172a` |
| `--color-text-secondary` | `#334155` |
| `--color-text-muted` | `#64748b` |
| `--color-text-subtle` | `#94a3b8` |
| `--color-text-disabled` | `#cbd5e1` |

## Tokens — modo oscuro

| Token | HEX |
|---|---|
| `--color-brand-primary` | `#22d3ee` |
| `--color-brand-hover` | `#67e8f9` |
| `--color-brand-light` | `#164e63` |
| `--color-brand-dark` | `#155e75` |
| `--color-vehicle-auto` | `#22d3ee` |
| `--color-vehicle-moto` | `#f87171` |
| `--color-destructive` | `#ef4444` |
| `--color-background` | `#020617` |
| `--color-surface` | `#0f172a` |
| `--color-border` | `#1e293b` |
| `--color-border-light` | `#1e293b` |
| `--color-text-*` | slate-100 → slate-600 |

## Hardcodeados en componentes (sin token)

| Color | HEX | Uso |
|---|---|---|
| green-50/100/500/600/700 | `#f0fdf4 #dcfce7 #22c55e #16a34a #15803d` | Éxito, badges, cambio, check, iconos de ingreso |
| red-50/100 | `#fef2f2 #fee2e2` | Vencidos, Por Motos, Entregado Hoy |
| yellow-50/100/600 | `#fefce8 #fef9c3 #ca8a04` | Por vencer |
| orange-50/100/500 | `#fff7ed #ffedd5 #f97316` | Alerta |
| blue-50/100/400/600 | `#eff6ff #dbeafe #60a5fa #2563eb` | Total del Día (Caja) |
| gray-300 | `#d1d5db` | Borde checkbox (checkbox.tsx, sin uso) |
| black/40 | `rgba(0,0,0,0.40)` | Overlay modales |
| white | `#ffffff` | Texto sobre botones brand |

## Semántica de estados

- Éxito → verde (múltiples tonos, sin token único).
- Error/peligro → destructive rojo.
- Advertencia → amarillo + naranja coexistiendo (sin regla de cuándo usar cada uno).
- Información → azul (solo en Caja).

## Gaps

- No existen tokens `success/warning/info/alert` aunque la UI los usa en 4 pantallas (hardcode).
- Dark: `brand-hover` (#67e8f9) es más claro que `brand` (#22d3ee); `border` == `border-light` (#1e293b).
- `text-subtle` (#94a3b8) falla contraste sobre blanco → ver `accessibility.md`.
