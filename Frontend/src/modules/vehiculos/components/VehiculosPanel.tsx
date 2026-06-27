import { Search, CarFront } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export function VehiculosPanel() {
  return (
    <div className="flex-1 rounded-xl border border-border bg-surface p-6 shadow-sm">
      <Tabs defaultValue="activos" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b rounded-none p-0 h-auto gap-6 mb-6">
          <TabsTrigger
            value="activos"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent-foreground rounded-none px-2 py-3 font-bold text-xs tracking-wider uppercase text-text-muted"
          >
            ACTIVOS EN PATIO (0)
          </TabsTrigger>
          <TabsTrigger
            value="historial"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent-foreground rounded-none px-2 py-3 font-bold text-xs tracking-wider uppercase text-text-muted"
          >
            HISTORIAL DE SALIDAS (0)
          </TabsTrigger>
          <TabsTrigger
            value="abonados"
            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-accent-foreground rounded-none px-2 py-3 font-bold text-xs tracking-wider uppercase text-text-muted"
          >
            ABONADOS MENSUALES (0)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="space-y-6 mt-0">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-subtle" />
              <Input
                placeholder="Buscar por placa, propietario o celda..."
                className="pl-9 bg-background border-border"
              />
            </div>
            <div className="w-[200px]">
              <Select defaultValue="todos">
                <SelectTrigger className="bg-surface border-border">
                  <SelectValue placeholder="Todos los vehículos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los vehículos</SelectItem>
                  <SelectItem value="autos">Automóviles</SelectItem>
                  <SelectItem value="motos">Motocicletas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-dashed bg-background py-16 px-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-border-light mb-4">
              <CarFront className="size-8 text-text-subtle" />
            </div>
            <h3 className="text-lg font-bold text-text-tertiary mb-1">No se encontraron vehículos activos</h3>
            <p className="text-sm text-text-muted">
              Intente remover filtros o registrar nuevos ingresos en el panel lateral.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="historial">
          <div className="flex items-center justify-center py-10 text-text-muted">
            Contenido del historial...
          </div>
        </TabsContent>
        <TabsContent value="abonados">
          <div className="flex items-center justify-center py-10 text-text-muted">
            Contenido de abonados...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
