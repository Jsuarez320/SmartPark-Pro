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

/** "2026-12-22" -> "22 dic 2026". Fecha de calendario: se formatea por texto para evitar desfases de zona horaria. */
export function formatDia(dia: string | undefined | null) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dia ?? "");
  if (!m) return dia ?? "";
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${m[3]} ${meses[Number(m[2]) - 1]} ${m[1]}`;
}

/** Fecha y hora completas con año: "22 nov 2026, 10:05 a. m.". */
export function formatFechaHoraCompleta(iso: string | undefined | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hoy como "YYYY-MM-DD" en hora local (para inputs de fecha). */
export function hoyISO(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
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
