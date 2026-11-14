import { Pencil, Bike, Car, Save, X, Info, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useConfiguracion } from "../hooks/useConfiguracion";
import type { Tarifa } from "../configuracion.types";

export function ConfiguracionPage() {
  const {
    tarifas,
    editando,
    toggleEditando,
    cargando,
    guardando,
    error,
    guardado,
    valorDe,
    actualizar,
    guardar,
  } = useConfiguracion();

  const bloques = (titulo: string, icono: React.ReactNode, lista: Tarifa[]) => (
    <div className="rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-light">{icono}</div>
        <h3 className="text-lg font-bold text-text-primary">{titulo}</h3>
      </div>
      <div className="space-y-4">
        {lista.map((t) => (
          <div key={t.id}>
            <label className="text-sm text-text-muted">{t.label}</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle text-sm">$</span>
              <Input
                type="number"
                value={valorDe(t.id)}
                disabled={!editando}
                onChange={(e) => actualizar(t.id, e.target.value)}
                className={`h-11 pl-7 ${!editando ? "opacity-75" : ""}`}
                min={1}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Configuración</h1>
          <p className="text-sm text-text-muted mt-1">Administra las tarifas del parqueadero</p>
        </div>
        <Button
          onClick={toggleEditando}
          disabled={cargando}
          className={`font-semibold gap-2 shadow-sm ${
            editando
              ? "bg-destructive hover:bg-destructive text-white"
              : "bg-brand hover:bg-brand-hover text-white"
          }`}
        >
          {editando ? (
            <>
              <X className="size-4" />
              Cancelar
            </>
          ) : (
            <>
              <Pencil className="size-4" />
              Editar Tarifas
            </>
          )}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-xl font-bold text-brand mb-6">Tarifas</h2>

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}
        {guardado && !editando && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Tarifas actualizadas.
          </div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted">
            <Loader2 className="size-4 animate-spin" /> Cargando tarifas...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bloques("Moto", <Bike className="size-4 text-brand" />, tarifas.moto)}
            {bloques("Carro", <Car className="size-4 text-brand" />, tarifas.carro)}
          </div>
        )}

        {editando && (
          <div className="mt-6 flex justify-end">
            <Button
              onClick={guardar}
              disabled={guardando}
              className="bg-brand hover:bg-brand-hover text-white font-semibold gap-2 shadow-sm"
            >
              {guardando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Guardar Cambios
            </Button>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-background border border-border p-4 flex items-start gap-3">
          <Info className="size-4 text-brand shrink-0 mt-0.5" />
          <p className="text-sm text-text-muted">
            El plan <span className="font-bold text-text-secondary">Bloque 15 min</span> es el precio de cada bloque de 15 minutos.
            Los demás planes tienen precio fijo. Un cambio de tarifa aplica a los vehículos que ingresen después; los que
            ya están en el parqueadero conservan la tarifa con la que entraron.
          </p>
        </div>
      </div>
    </div>
  );
}
