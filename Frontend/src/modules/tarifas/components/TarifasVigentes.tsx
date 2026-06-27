import { DollarSign, Settings2, Car, Bike, Zap, Accessibility } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export function TarifasVigentes() {
  return (
    <div className="w-full rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-secondary">
            <span className="text-accent font-extrabold text-xl"><DollarSign className="size-5" /></span>
            Tarifas de Cobro por Hora (Vigentes)
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Establezca las tarifas oficiales. Las liquidaciones de salida se calcularán con estos valores en tiempo real.
          </p>
        </div>
        <Button variant="outline" className="text-destructive border-destructive-border bg-destructive-light hover:bg-destructive-hover font-semibold tracking-wide text-xs">
          <Settings2 className="size-4 mr-2" />
          CONTROL DE TARIFAS COP
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Automoviles */}
        <div className="flex items-center justify-between rounded-xl bg-background p-4 border border-border-light">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-vehicle-auto text-white">
              <Car className="size-5" />
            </div>
            <div>
              <p className="font-bold text-text-secondary text-sm">Automóviles</p>
              <p className="text-[10px] font-bold text-text-subtle tracking-wider">VEHÍCULOS LIVIANOS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-bold text-sm text-accent">$</span>
            <Input
              type="number"
              defaultValue={4700}
              className="w-20 text-right font-bold text-text-secondary bg-surface border-border h-9"
            />
          </div>
        </div>

        {/* Motocicletas */}
        <div className="flex items-center justify-between rounded-xl bg-background p-4 border border-border-light">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-vehicle-moto text-white">
              <Bike className="size-5" />
            </div>
            <div>
              <p className="font-bold text-text-secondary text-sm">Motocicletas</p>
              <p className="text-[10px] font-bold text-text-subtle tracking-wider">MOTOS Y SCOOTERS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-bold text-sm text-accent">$</span>
            <Input
              type="number"
              defaultValue={2200}
              className="w-20 text-right font-bold text-text-secondary bg-surface border-border h-9"
            />
          </div>
        </div>

        {/* Celdas Electricas */}
        <div className="flex items-center justify-between rounded-xl bg-background p-4 border border-border-light">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-vehicle-ev text-white">
              <Zap className="size-5" />
            </div>
            <div>
              <p className="font-bold text-text-secondary text-sm leading-tight">Celdas Eléctricas</p>
              <p className="text-[10px] font-bold text-text-subtle tracking-wider leading-tight">VEHÍCULOS LV /<br/>HÍBRIDOS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-bold text-sm text-accent">$</span>
            <Input
              type="number"
              defaultValue={5000}
              className="w-20 text-right font-bold text-text-secondary bg-surface border-border h-9"
            />
          </div>
        </div>

        {/* Espacios PMR */}
        <div className="flex items-center justify-between rounded-xl bg-background p-4 border border-border-light">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-vehicle-pmr text-white">
              <Accessibility className="size-5" />
            </div>
            <div>
              <p className="font-bold text-text-secondary text-sm">Espacios PMR</p>
              <p className="text-[10px] font-bold text-text-subtle tracking-wider">MOVILIDAD<br/>REDUCIDA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-bold text-sm text-accent">$</span>
            <Input
              type="number"
              defaultValue={3000}
              className="w-20 text-right font-bold text-text-secondary bg-surface border-border h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
