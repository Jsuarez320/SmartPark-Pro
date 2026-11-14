import { Car, Bike, DollarSign, Users, Clock, Loader2 } from "lucide-react";
import { formatCurrencyCOP, formatDuracion, formatFechaHora } from "@/shared/utils/formatters";
import { useDashboard } from "../hooks/useDashboard";

export function DashboardPage() {
  const { data, cargando, error } = useDashboard();

  const enPatio = data?.vehiculosEnPatio ?? 0;
  const pct = (n: number) => (enPatio > 0 ? Math.round((n / enPatio) * 100) : 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Panel de Control</h1>
        <p className="text-sm text-text-muted mt-1">Resumen general del parqueadero</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Vehículos en Patio</p>
            <Car className="size-4 text-brand" />
          </div>
          <p className="text-3xl font-bold text-text-primary">{cargando ? "—" : enPatio}</p>
          <p className="text-xs text-text-subtle mt-1">
            {data ? `${data.carrosEnPatio} carros · ${data.motosEnPatio} motos` : " "}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Ingresos Hoy</p>
            <DollarSign className="size-4 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {cargando ? "—" : formatCurrencyCOP(data?.ingresosHoy ?? 0)}
          </p>
          <p className="text-xs text-text-subtle mt-1">Todos los métodos de pago</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Clientes Mensuales</p>
            <Users className="size-4 text-brand" />
          </div>
          <p className="text-3xl font-bold text-text-primary">{cargando ? "—" : (data?.clientesMensuales ?? 0)}</p>
          <p className="text-xs text-text-subtle mt-1">Membresías vigentes</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Tiempo Promedio</p>
            <Clock className="size-4 text-text-muted" />
          </div>
          <p className="text-3xl font-bold text-text-primary">
            {data?.tiempoPromedioMin != null ? formatDuracion(data.tiempoPromedioMin) : "—"}
          </p>
          <p className="text-xs text-text-subtle mt-1">Salidas de hoy</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-text-primary mb-4">Ocupación</h2>
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
            <Loader2 className="size-4 animate-spin" /> Cargando...
          </div>
        ) : enPatio === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-text-muted">
            No hay vehículos en el parqueadero
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { label: "Carros", n: data!.carrosEnPatio, Icono: Car, barra: "bg-brand" },
              { label: "Motos", n: data!.motosEnPatio, Icono: Bike, barra: "bg-vehicle-moto" },
            ].map(({ label, n, Icono, barra }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="flex items-center gap-2 text-text-secondary font-medium">
                    <Icono className="size-4" /> {label}
                  </span>
                  <span className="text-text-muted">{n} ({pct(n)}%)</span>
                </div>
                <div className="h-2.5 rounded-full bg-background border border-border overflow-hidden">
                  <div className={`h-full rounded-full ${barra}`} style={{ width: `${pct(n)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-text-primary mb-4">Transacciones Recientes</h2>
        {!data || data.recientes.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-text-muted">
            {cargando ? "Cargando..." : "Aún no hay transacciones"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {data.recientes.map((t) => (
                  <tr key={t.id} className="border-b border-border-light last:border-0">
                    <td className="py-2.5 px-2 text-text-muted">{formatFechaHora(t.fecha)}</td>
                    <td className="py-2.5 px-2 font-bold text-text-primary">{t.placa}</td>
                    <td className="py-2.5 px-2 text-text-secondary">{t.concepto}</td>
                    <td className="py-2.5 px-2 capitalize text-text-secondary">{t.metodoPago}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-text-primary">{formatCurrencyCOP(t.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
