import type { EstadoMensualidad } from "../mensualidades.types";

const ESTILOS: Record<EstadoMensualidad, { texto: string; clase: string }> = {
  vigente: { texto: "Vigente", clase: "bg-green-50 text-green-700" },
  por_vencer: { texto: "Por vencer", clase: "bg-amber-50 text-amber-700" },
  vencida: { texto: "Vencida", clase: "bg-red-50 text-red-700" },
};

export function EstadoBadge({ estado }: { estado: EstadoMensualidad }) {
  const { texto, clase } = ESTILOS[estado];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${clase}`}>{texto}</span>;
}

/** "Vence hoy", "Faltan 3 días", "Venció hace 2 días". */
export function textoDias(dias: number): string {
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  if (dias > 1) return `Faltan ${dias} días`;
  return dias === -1 ? "Venció ayer" : `Venció hace ${-dias} días`;
}
