export function formatCurrencyCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);
}


/** Hora local (es-CO) de un ISO string del backend. */
export function formatHora(iso: string | undefined | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

/** Fecha y hora local de un ISO string del backend. */
export function formatFechaHora(iso: string | undefined | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 95 -> "1h 35min" */
export function formatDuracion(minutos: number) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
}

/** Extrae el mensaje de error que devuelve la API (`detail`) o uno por defecto. */
export function getApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((d) => (d as { msg?: string })?.msg).filter(Boolean);
    if (msgs.length) return msgs.join(". ");
  }
  return e?.message || fallback;
}
