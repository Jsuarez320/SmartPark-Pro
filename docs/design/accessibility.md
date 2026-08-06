# Accesibilidad

## Contraste (WCAG 2.1: AA = 4.5:1 normal, 3:1 grande)

| Par | Ratio aprox. | Resultado |
|---|---|---|
| brand `#0891b2` sobre blanco | ~3.9:1 | Falla AA (texto normal) |
| brand `#0891b2` sobre brand-light `#ecfeff` | ~3.1:1 | Falla (nav activa, badges) |
| text-muted `#64748b` sobre blanco | ~4.7:1 | Pasa (justo) |
| text-subtle `#94a3b8` sobre blanco | ~2.9:1 | Falla (subtítulos, placeholders, metadata) |
| text-muted sobre dark `#020617` | ~5.5:1 | Pasa |
| green-700 `#15803d` sobre green-50 | ~4.9:1 | Pasa |
| blanco sobre brand (botones) | ~3.9:1 | Falla AA para `text-sm font-semibold` |
| red-600 `#dc2626` sobre blanco | ~4.8:1 | Pasa |
| yellow-600 `#ca8a04` sobre yellow-50 | ~3.6:1 | Falla |

Conclusión: el cyan de marca sobre blanco/claro (activos, totales, badges, links) no cumple AA; es la deuda de contraste más difundida.

## Tamaño de texto

- Base 14px (`text-sm`): correcto para escritorio.
- 12px (`text-xs`) en badges/captions: tolerable para metadata.
- Sin escalado de fuente ni `rem` personalizados.

## Áreas clicables

- `h-10` (40px) default < objetivo de 44px (WCAG 2.5.5, AAA).
- Botones operativos `h-11/h-12` (44/48px): correctos.
- Opciones de pago y métodos de pago (p-3): ~42-48px: aceptables.

## Teclado / foco

- Inputs y botones: `focus-visible:ring-2`, pero anillo **azul por defecto de Tailwind** (no cyan de marca).
- Toggle de tema del header: sin `focus-visible` explícito.
- Los 3 modales no son accesibles por teclado: sin focus trap, sin foco inicial, sin manejo de Escape, sin restauración de foco, sin `role="dialog"`/`aria-modal`.
- Periodos de Caja y métodos de pago: `<button>` navegables.
- Labels de form con `<label>` correcto; toggle de tema y cierres con `aria-label`.

## Legibilidad

- Buena jerarquía tipográfica, sin texto justificado.
- Dark mode mejora el contraste general.
- Placa `tracking-widest uppercase`: legible.

## Prioridades de corrección

1. Contraste del cyan sobre blanco/claro (texto y botones).
2. Contraste de `text-subtle`.
3. Modales: focus trap, Escape, roles.
4. Focus ring azul + foco ausente en íconos del header.
5. Nav móvil: íconos sin `aria-label`/tooltip.
6. Verificar etiqueta accesible del trigger del Select.
7. Error de login sin `aria-live` (solo `role="alert"`).
