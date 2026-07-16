import { Search, CalendarDays, AlertTriangle, Clock, ShieldCheck, RefreshCw, Car, Bike } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useVehiculos } from "../hooks/useVehiculos";

export function VehiculosPage() {
  const {
    searchQuery,
    setSearchQuery,
    vehiculos,
    totalVehiculos,
    mensuales,
    totalMensuales,
    statsMensuales,
  } = useVehiculos();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gestión de Vehículos</h1>
          <p className="text-sm text-text-muted mt-1">
            Administra la información de todos los vehículos registrados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm border-l-4 border-l-brand">
          <p className="text-xs font-semibold tracking-wider uppercase text-text-muted">Total de Placas</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{totalVehiculos}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm border-l-4 border-l-brand">
          <p className="text-xs font-semibold tracking-wider uppercase text-text-muted">Clientes Mensuales</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{totalMensuales}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-text-primary">Placas Registradas</h2>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-subtle" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por placa..."
                className="pl-9 h-11"
              />
            </div>
            <span className="text-sm text-text-muted whitespace-nowrap">
              {vehiculos.length} vehículos
            </span>
          </div>
        </div>

        {vehiculos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Car className="size-10 text-text-subtle mb-3" />
            <p className="text-sm text-text-muted">No hay registros de placas</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <div className="inline-block min-w-full align-middle px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 font-medium text-text-muted">Placa</th>
                    <th className="text-left py-3 px-3 font-medium text-text-muted">Tipo</th>
                    <th className="text-left py-3 px-3 font-medium text-text-muted">Propietario</th>
                    <th className="text-left py-3 px-3 font-medium text-text-muted">Marca</th>
                    <th className="text-left py-3 px-3 font-medium text-text-muted">Mensualidad</th>
                    <th className="text-left py-3 px-3 font-medium text-text-muted">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {vehiculos.map((v) => (
                    <tr key={v.placa} className="border-b border-border-light hover:bg-background transition-colors">
                      <td className="py-3 px-3 font-bold text-text-primary">{v.placa}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 text-sm ${
                          v.tipo === "moto" ? "text-vehicle-moto" : "text-vehicle-auto"
                        }`}>
                          {v.tipo === "moto" ? <Bike className="size-3.5" /> : <Car className="size-3.5" />}
                          {v.tipo === "carro" ? "Carro" : "Moto"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text-secondary">{v.propietario || "—"}</td>
                      <td className="py-3 px-3 text-text-secondary">{v.marca || "—"}</td>
                      <td className="py-3 px-3">
                        {v.mensualidad ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                            Sí
                          </span>
                        ) : (
                          <span className="text-text-muted">No</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-text-muted">{v.fechaRegistro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-primary">Clientes Mensuales</h2>
          <span className="text-sm text-text-muted">{totalMensuales} activos</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg bg-red-50 border border-red-100 p-4">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-1">
              <AlertTriangle className="size-4" />
              Vencidos
            </div>
            <p className="text-2xl font-bold text-text-primary">{statsMensuales.vencidos}</p>
          </div>
          <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-4">
            <div className="flex items-center gap-2 text-yellow-600 text-sm font-medium mb-1">
              <Clock className="size-4" />
              Por vencer
            </div>
            <p className="text-2xl font-bold text-text-primary">{statsMensuales.porVencer}</p>
          </div>
          <div className="rounded-lg bg-orange-50 border border-orange-100 p-4">
            <div className="flex items-center gap-2 text-orange-500 text-sm font-medium mb-1">
              <CalendarDays className="size-4" />
              Alerta
            </div>
            <p className="text-2xl font-bold text-text-primary">{statsMensuales.alerta}</p>
          </div>
          <div className="rounded-lg bg-green-50 border border-green-100 p-4">
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-1">
              <ShieldCheck className="size-4" />
              Activos
            </div>
            <p className="text-2xl font-bold text-text-primary">{statsMensuales.activos}</p>
          </div>
        </div>

        {mensuales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="size-10 text-text-subtle mb-3" />
            <p className="text-sm text-text-muted">No hay clientes mensuales registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <div className="inline-block min-w-full align-middle px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 font-medium text-text-muted">Placa</th>
                    <th className="text-left py-3 px-3 font-medium text-text-muted">Propietario</th>
                    <th className="text-left py-3 px-3 font-medium text-text-muted">Vencimiento</th>
                    <th className="text-left py-3 px-3 font-medium text-text-muted">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {mensuales.map((m) => (
                    <tr key={m.placa} className="border-b border-border-light hover:bg-background transition-colors">
                      <td className="py-3 px-3 font-bold text-text-primary">{m.placa}</td>
                      <td className="py-3 px-3 text-text-secondary">{m.propietario || "—"}</td>
                      <td className="py-3 px-3 text-text-secondary">{m.vencimiento}</td>
                      <td className="py-3 px-3">{m.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
