/** Placa como la espera el backend: mayúsculas, sin espacios ni guiones ("abc-123" → "ABC123"). */
export const normalizarPlaca = (texto: string): string => texto.replace(/[\s-]+/g, "").toUpperCase();
