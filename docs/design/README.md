# Design System — SmartPark Pro

Base de conocimiento del diseño del frontend (React 18 + TS + Vite + TailwindCSS + Radix UI + Electron). Derivado de `DESIGN_ANALYSIS.md` (agosto 2026). Proyecto en Fase 1: UI de alta fidelidad, pero Dashboard/Pago/Caja/Configuración usan datos simulados o placeholders.

## Uso recomendado para agentes de IA

| Necesidad | Archivo |
|---|---|
| Diseñar pantallas o componentes | `components.md` + `pages.md` |
| Colores / tokens | `colors.md` + `design-tokens.json` |
| Tipografía | `typography.md` |
| Estructura / layout | `layouts.md` |
| Rutas / roles / flujos | `navigation.md` |
| Problemas y mejoras de UX | `ux.md` |
| Accesibilidad | `accessibility.md` |
| Identidad y tono | `branding.md` |
| Reglas de consistencia y fallas técnicas | `technical-notes.md` |
| Datos crudos (hex, radios, espaciados, z-index…) | `design-tokens.json` |

## Índice de archivos

| Archivo | Contenido |
|---|---|
| `design-tokens.json` | Datos estructurados: colores, radios, espaciado, tipografía, sombras, z-index, breakpoints, contenedores, tamaños e iconografía |
| `colors.md` | Paleta light/dark + hardcodeada, variables y semántica de estados |
| `typography.md` | Fuentes, escala de tamaños, pesos y jerarquía |
| `layouts.md` | Layout principal, header, grids y contenedores (no hay sidebar/footer) |
| `navigation.md` | Rutas, roles, redirecciones, flujos y relaciones entre pantallas |
| `components.md` | Catálogo de componentes formales y de facto: propósito, variantes, estados, reuso |
| `pages.md` | Fichas de las 7 pantallas: propósito, componentes y flujo principal |
| `ux.md` | Fortalezas, problemas, fricciones y oportunidades de UX |
| `accessibility.md` | Contraste, teclado, foco, legibilidad y prioridades |
| `branding.md` | Identidad visual, personalidad, estilo y tono |
| `technical-notes.md` | Reglas de consistencia visual y fallas técnicas conocidas |

## Reglas de partición

- Cada dato vive en un solo archivo; los demás solo lo referencian.
- Para consistencia, priorizar siempre `technical-notes.md` sobre cualquier otro detalle.
- Contrastes → `accessibility.md`. Estados de color → `colors.md`. Deuda de UX → `ux.md`.
