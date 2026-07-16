import { Car, Bike, DollarSign, Users, Clock } from "lucide-react";

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Panel de Control</h1>
        <p className="text-sm text-text-muted mt-1">
          Resumen general del parqueadero
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Vehículos en Patio</p>
            <Car className="size-4 text-brand" />
          </div>
          <p className="text-3xl font-bold text-text-primary">—</p>
          <p className="text-xs text-text-subtle mt-1">Conecta la API</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Ingresos Hoy</p>
            <DollarSign className="size-4 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-text-primary">$0</p>
          <p className="text-xs text-text-subtle mt-1">Conecta la API</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Clientes Mensuales</p>
            <Users className="size-4 text-brand" />
          </div>
          <p className="text-3xl font-bold text-text-primary">—</p>
          <p className="text-xs text-text-subtle mt-1">Conecta la API</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-text-muted">Tiempo Promedio</p>
            <Clock className="size-4 text-text-muted" />
          </div>
          <p className="text-3xl font-bold text-text-primary">—</p>
          <p className="text-xs text-text-subtle mt-1">Conecta la API</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-text-primary mb-4">Ocupación</h2>
        <div className="flex items-center justify-center py-12 text-sm text-text-muted">
          Conecta con la API para ver datos en tiempo real
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-text-primary mb-4">Transacciones Recientes</h2>
        <div className="flex items-center justify-center py-8 text-sm text-text-muted">
          Conecta con la API para ver transacciones
        </div>
      </div>
    </div>
  );
}
