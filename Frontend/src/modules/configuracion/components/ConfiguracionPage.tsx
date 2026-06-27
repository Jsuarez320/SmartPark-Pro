import { Pencil, Bike, Car } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Configuración</h1>
        <Button
          onClick={toggleEditando}
          className="bg-brand hover:bg-brand-hover text-white font-semibold gap-2"
        >
          <Pencil className="size-4" />
          Editar
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-xl font-bold text-brand mb-6">Tarifas</h2>

        <div className="grid grid-cols-2 gap-8">
          <div className="rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-6">
              <Bike className="size-5 text-brand" />
              <h3 className="text-lg font-bold text-text-primary">Moto</h3>
            </div>
            <div className="space-y-4">
              {motos.map((t, i) => (
                <div key={t.label}>
                  <label className="text-sm text-text-muted">{t.label}</label>
                  <Input
                    type="number"
                    value={t.value}
                    disabled={!editando}
                    onChange={(e) => actualizarMoto(i, e.target.value)}
                    className="mt-1 h-11"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-6">
              <Car className="size-5 text-brand" />
              <h3 className="text-lg font-bold text-text-primary">Carro</h3>
            </div>
            <div className="space-y-4">
              {carros.map((t, i) => (
                <div key={t.label}>
                  <label className="text-sm text-text-muted">{t.label}</label>
                  <Input
                    type="number"
                    value={t.value}
                    disabled={!editando}
                    onChange={(e) => actualizarCarro(i, e.target.value)}
                    className="mt-1 h-11"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-background border border-border p-4">
          <p className="text-sm text-text-muted">
            En Registro, escriba <span className="font-bold text-text-secondary">0101</span> para reimprimir la última factura.
          </p>
        </div>

        <div className="mt-4 rounded-lg bg-background border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary">Dia especial / Evento activo hoy</p>
            <p className="text-xs text-text-subtle">Habilita la tarifa fija de 3 horas para hoy</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={eventoActivo}
              onChange={toggleEvento}
              className="size-4 rounded border-border accent-brand"
            />
            <span className="text-sm text-text-muted">{eventoActivo ? "Activo" : "Inactivo"}</span>
          </label>
        </div>
      </div>
    </div>
  );
}
