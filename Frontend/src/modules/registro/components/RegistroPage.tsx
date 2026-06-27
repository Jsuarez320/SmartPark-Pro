import { CalendarDays, Clock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useRegistro } from "../hooks/useRegistro";

export function RegistroPage() {
  const {
    placa, setPlaca,
    tipo, setTipo,
    marca, setMarca,
    mensualidad, setMensualidad,
    pagoDiario, setPagoDiario,
    diaEspecial, setDiaEspecial,
    fecha, hora,
  } = useRegistro();

  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-full max-w-2xl flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-2 text-sm text-text-muted capitalize">
          <CalendarDays className="size-4 text-brand" />
          {fecha}
        </div>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Clock className="size-4 text-brand" />
          {hora}
        </div>
      </div>

      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h2 className="text-center text-2xl font-bold text-brand mb-8">
          Registro de Vehículo
        </h2>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Nº Placa</label>
            <Input
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="EJ: ABC123"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Tipo de Vehículo</label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "carro" | "moto")}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Marca</label>
              <Input
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej: Yamaha"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={mensualidad}
                onChange={(e) => setMensualidad(e.target.checked)}
                className="size-4 rounded border-border accent-brand"
              />
              <span className="text-sm text-text-secondary">Mensualidad</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pagoDiario}
                onChange={(e) => setPagoDiario(e.target.checked)}
                className="size-4 rounded border-border accent-brand"
              />
              <span className="text-sm text-text-secondary">Pago Diario</span>
            </label>
            <label className="flex items-center gap-3 cursor-not-allowed opacity-40">
              <input
                type="checkbox"
                checked={diaEspecial}
                onChange={() => {}}
                disabled
                className="size-4 rounded border-border"
              />
              <span className="text-sm text-text-muted">Dia especial / Evento</span>
            </label>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-text-secondary">Precio a Pagar</label>
              <div className="flex h-11 items-center rounded-md border border-border bg-background px-4 text-lg font-bold text-text-subtle">
                $$$$
              </div>
            </div>
            <Button
              type="submit"
              variant="outline"
              className="h-11 px-8 border-brand text-brand hover:bg-brand-light font-semibold mt-6"
            >
              Registrar entrada
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
