# Tipografía

## Fuente

- Familia configurada: `Inter, system-ui, sans-serif`.
- **Inter nunca se carga** (sin `<link>`, `@import` ni paquete de fuentes) → se renderiza `system-ui` del SO. Diseño no reproducible entre Windows/macOS/Linux.
- Recibo impreso: `Courier New` monospace 12px, ancho 80mm.

## Escala de tamaños

| Clase | px | Uso |
|---|---|---|
| `text-xs` | 12 | Captions, badges, labels de tarjeta, notas |
| `text-sm` | 14 | Cuerpo, tablas, descripciones, labels de form |
| `text-base` | 16 | Botones principales |
| `text-lg` | 18 | Subtítulos de tarjeta, montos de fila |
| `text-xl` | 20 | Títulos de modal, subtítulos de sección |
| `text-2xl` | 24 | H1 de página, montos de tarjeta |
| `text-3xl` | 30 | KPIs grandes (Dashboard, Vehículos) |

## Pesos

| Clase | Peso | Uso |
|---|---|---|
| `font-medium` | 500 | Labels, encabezados de tabla |
| `font-semibold` | 600 | Botones, badges |
| `font-bold` | 700 | Títulos, placas, montos |

## Detalles

- Placa de vehículo: `font-mono font-bold tracking-widest uppercase` (input y ticket).
- Etiquetas de tarjeta: mayúsculas + `tracking-wider`.

## Jerarquía

1. H1 de página: `text-2xl font-bold` + subtítulo `text-sm text-text-muted`.
2. Métricas: `text-2xl/3xl font-bold`.
3. Título de sección: `text-lg font-bold`.
4. Labels de form: `text-sm font-medium`.
5. Texto auxiliar/placeholder: `text-sm text-text-muted`.

Escala compacta y sin uso de `text-4xl+`: apropiada para operación de escritorio.
