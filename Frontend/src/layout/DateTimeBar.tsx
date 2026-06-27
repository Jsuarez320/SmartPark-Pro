import { CalendarDays, Clock } from "lucide-react";

export function DateTimeBar() {
  const now = new Date();

  const dateStr = now.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const timeStr = now.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <CalendarDays className="size-4" />
        <span className="capitalize">{dateStr}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-brand">
        <Clock className="size-4" />
        <span>{timeStr}</span>
      </div>
    </div>
  );
}
