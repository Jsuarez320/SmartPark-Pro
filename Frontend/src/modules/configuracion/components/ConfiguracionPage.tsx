import { Pencil, Bike, Car, Save, X, Info } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useConfiguracion } from "../hooks/useConfiguracion";

export function ConfiguracionPage() {
  const {
    editando,
    toggleEditando,
    motos,
    carros,
    actualizarMoto,
    actualizarCarro,
    eventoActivo,
    toggleEvento,
  } = useConfiguracion();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Configuración</h1>
          <p className="text-sm text-text-muted mt-1">
            Administra las tarifas y opciones del sistema
          </p>
        </div>
        <Button
          onClick={toggleEditando}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand-light">
                <Bike className="size-4 text-brand" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">Moto</h3>
            </div>
            <div className="space-y-4">
              {motos.map((t, i) => (
                <div key={t.label}>
                  <label className="text-sm text-text-muted">{t.label}</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle text-sm">$</span>
                    <Input
                      type="number"
                      value={t.value}
                      disabled={!editando}
                      onChange={(e) => actualizarMoto(i, e.target.value)}
                      className={`h-11 pl-7 ${!editando ? "opacity-75" : ""}`}
                      min={0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand-light">
                <Car className="size-4 text-brand" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">Carro</h3>
            </div>
            <div className="space-y-4">
              {carros.map((t, i) => (
                <div key={t.label}>
                  <label className="text-sm text-text-muted">{t.label}</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle text-sm">$</span>
                    <Input
                      type="number"
                      value={t.value}
                      disabled={!editando}
                      onChange={(e) => actualizarCarro(i, e.target.value)}
                      className={`h-11 pl-7 ${!editando ? "opacity-75" : ""}`}
                      min={0}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {editando && (
          <div className="mt-6 flex justify-end">
            <Button className="bg-brand hover:bg-brand-hover text-white font-semibold gap-2 shadow-sm">
              <Save className="size-4" />
              Guardar Cambios
            </Button>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-background border border-border p-4 flex items-start gap-3">
          <Info className="size-4 text-brand shrink-0 mt-0.5" />
          <p className="text-sm text-text-muted">
            En la pantalla de Registro, escriba <span className="font-bold text-text-secondary">0101</span> como placa para reimprimir la última factura.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-xl font-bold text-brand mb-4">Eventos</h2>
        <div className="rounded-lg bg-background border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand-light shrink-0">
              <Info className="size-5 text-brand" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Día especial / Evento activo</p>
              <p className="text-xs text-text-subtle">Habilita la tarifa fija de 3 horas para hoy</p>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={eventoActivo}
              onChange={toggleEvento}
              className="size-5 rounded border-border accent-brand"
            />
            <span className={`text-sm font-medium ${eventoActivo ? "text-brand" : "text-text-muted"}`}>
              {eventoActivo ? "Activo" : "Inactivo"}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
