import { useState, useEffect } from "react";
import { Loader2, Car } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useRegistro } from "../hooks/useRegistro";
import { AlertaRegistro } from "./AlertaRegistro";
import { calcularPrecio } from "../services/registro.service";

export function RegistroPage() {
  const {
    placa, setPlaca,
    tipo, setTipo,
    marca, setMarca,
    mensualidad, setMensualidad,
    pagoDiario, setPagoDiario,
    diaEspecial, setDiaEspecial,
    envio,
    respuesta,
    alertaAbierta,
    registrar,
    cerrarAlerta,
  } = useRegistro();

  const [precio, setPrecio] = useState<number | null>(null);
  const [calculando, setCalculando] = useState(false);

  useEffect(() => {
    const obtenerPrecio = async () => {
      setCalculando(true);
      try {
        const res = await calcularPrecio({ tipo, mensualidad, pagoDiario, diaEspecial });
        setPrecio(res.monto);
      } catch {
        setPrecio(null);
      } finally {
        setCalculando(false);
      }
    };
    obtenerPrecio();
  }, [tipo, mensualidad, pagoDiario, diaEspecial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registrar();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Registro de Ingreso</h1>
        <p className="text-sm text-text-muted mt-1">
          Registre un nuevo vehículo que ingresa al parqueadero
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Nº de Placa</label>
            <Input
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="h-12 text-lg font-bold tracking-widest uppercase"
              disabled={envio}
              maxLength={10}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Tipo de Vehículo</label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "carro" | "moto")} disabled={envio}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">
                    <span className="flex items-center gap-2">
                      <Car className="size-4" /> Carro
                    </span>
                  </SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Marca (opcional)</label>
              <Input
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej: Yamaha"
                className="h-12"
                disabled={envio}
              />
            </div>
          </div>

          <div className="rounded-xl bg-background border border-border p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Opciones de Pago</p>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                  mensualidad ? "border-brand bg-brand-light" : "border-border hover:border-brand/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={mensualidad}
                  onChange={(e) => {
                    setMensualidad(e.target.checked);
                    if (e.target.checked) { setPagoDiario(false); setDiaEspecial(false); }
                  }}
                  disabled={envio}
                  className="size-4 rounded accent-brand"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Mensualidad</p>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                  pagoDiario ? "border-brand bg-brand-light" : "border-border hover:border-brand/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={pagoDiario}
                  onChange={(e) => {
                    setPagoDiario(e.target.checked);
                    if (e.target.checked) { setMensualidad(false); setDiaEspecial(false); }
                  }}
                  disabled={envio}
                  className="size-4 rounded accent-brand"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Pago Diario</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-text-secondary mb-1.5">Total a Pagar</p>
              <div className="flex h-12 items-center rounded-xl border border-border bg-background px-5 text-xl font-bold text-brand">
                {calculando ? (
                  <span className="flex items-center gap-2 text-text-muted text-base">
                    <Loader2 className="size-4 animate-spin" />
                    Calculando...
                  </span>
                ) : precio !== null ? (
                  `$${precio.toLocaleString()}`
                ) : (
                  <span className="text-text-subtle text-base">—</span>
                )}
              </div>
            </div>
            <Button
              type="submit"
              disabled={envio || !placa}
              className="h-12 px-8 bg-brand hover:bg-brand-hover text-white font-bold text-base shadow-sm sm:self-end"
            >
              {envio ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin" />
                  Registrando...
                </span>
              ) : (
                "Registrar Entrada"
              )}
            </Button>
          </div>
        </form>
      </div>

      <AlertaRegistro
        open={alertaAbierta}
        data={respuesta}
        onClose={cerrarAlerta}
      />
    </div>
  );
}
