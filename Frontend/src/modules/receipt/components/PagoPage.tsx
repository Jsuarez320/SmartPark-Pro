import { useState } from "react";
import { Search, Car, Clock } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { PagoModal } from "./PagoModal";

interface VehiculoSimulado {
  placa: string;
  tipo: string;
  horaIngreso: string;
  tiempo: string;
  monto: number;
}

const vehiculosSimulados: VehiculoSimulado[] = [
  { placa: "ABC123", tipo: "Carro", horaIngreso: "18:30", tiempo: "1h 30min", monto: 3200 },
  { placa: "XYZ789", tipo: "Moto", horaIngreso: "19:00", tiempo: "1h 00min", monto: 1300 },
  { placa: "DEF456", tipo: "Carro", horaIngreso: "17:15", tiempo: "2h 45min", monto: 6400 },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Pagos</h1>
        <p className="text-sm text-text-muted mt-1">
          Seleccione un vehículo para registrar su salida y cobrar
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-subtle" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por placa..."
          className="pl-9 h-11"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Car className="size-10 text-text-subtle mb-3" />
          <p className="text-sm text-text-muted">No hay vehículos en patio</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((v) => (
            <div
              key={v.placa}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-brand-light">
                  <Car className="size-5 text-brand" />
                </div>
                <div>
                  <p className="font-bold text-text-primary">{v.placa}</p>
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
                <p className="text-lg font-bold text-text-primary">
                  ${v.monto.toLocaleString()}
                </p>
                <Button
                  onClick={() => abrirPago(v.placa)}
                  className="bg-brand hover:bg-brand-hover text-white font-semibold"
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
