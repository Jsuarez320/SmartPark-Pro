import { useState } from "react";
import { Search, Car, Clock, Bike } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { PagoModal } from "./PagoModal";

interface VehiculoPatio {
  placa: string;
  tipo: string;
  horaIngreso: string;
  tiempo: string;
  monto: number;
}

const vehiculosSimulados: VehiculoPatio[] = [
  { placa: "ABC123", tipo: "Carro", horaIngreso: "18:30", tiempo: "1h 30min", monto: 3200 },
  { placa: "XYZ789", tipo: "Moto", horaIngreso: "19:00", tiempo: "1h 00min", monto: 1300 },
  { placa: "DEF456", tipo: "Carro", horaIngreso: "17:15", tiempo: "2h 45min", monto: 6400 },
  { placa: "GHI789", tipo: "Moto", horaIngreso: "20:00", tiempo: "0h 30min", monto: 1000 },
  { placa: "JKL012", tipo: "Carro", horaIngreso: "16:45", tiempo: "3h 45min", monto: 9600 },
];

export function PagoPage() {
  const [search, setSearch] = useState("");
  const [selectedPlaca, setSelectedPlaca] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtrados = vehiculosSimulados.filter((v) =>
    v.placa.toLowerCase().includes(search.toLowerCase())
  );

  const abrirPago = (placa: string) => {
    setSelectedPlaca(placa);
    setModalOpen(true);
  };

  const totalACobrar = filtrados.reduce((sum, v) => sum + v.monto, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Cobrar Salida</h1>
          <p className="text-sm text-text-muted mt-1">
            Seleccione un vehículo para registrar su salida y cobrar
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
          <Car className="size-4 text-brand" />
          <span className="text-sm text-text-muted">En patio:</span>
          <span className="font-bold text-text-primary">{filtrados.length}</span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-subtle" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar vehículo por placa..."
          className="pl-10 h-12"
          autoFocus
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border bg-surface">
          <Car className="size-12 text-text-subtle mb-4" />
          <p className="text-base font-medium text-text-muted">No hay vehículos en patio</p>
          <p className="text-sm text-text-subtle mt-1">
            {search ? "No se encontraron resultados para esa búsqueda" : "Registra un ingreso para verlo aquí"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((v) => (
            <div
              key={v.placa}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`flex size-11 items-center justify-center rounded-lg ${
                  v.tipo === "Moto" ? "bg-red-50" : "bg-brand-light"
                }`}>
                  {v.tipo === "Moto" ? (
                    <Bike className={`size-5 ${v.tipo === "Moto" ? "text-vehicle-moto" : "text-brand"}`} />
                  ) : (
                    <Car className="size-5 text-brand" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-text-primary text-base">{v.placa}</p>
                  <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                    <span>{v.tipo}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {v.horaIngreso} ({v.tiempo})
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-text-primary">${v.monto.toLocaleString()}</p>
                <Button
                  onClick={() => abrirPago(v.placa)}
                  className="bg-brand hover:bg-brand-hover text-white font-semibold shadow-sm"
                >
                  Cobrar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PagoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        placa={selectedPlaca ?? undefined}
      />
    </div>
  );
}
