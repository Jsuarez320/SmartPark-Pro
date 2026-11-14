import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Car, Bike, CreditCard, BadgeCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useRegistro } from "../hooks/useRegistro";
import { NotificacionTarjeta } from "@/shared/components/NotificacionTarjeta";
import { AlertaRegistro } from "./AlertaRegistro";
import type { PlanIngreso } from "../types";

const planes: { value: PlanIngreso; label: string; desc: string }[] = [
  { value: "bloque_15min", label: "Por tiempo", desc: "Bloques de 15 min" },
  { value: "medio_dia", label: "Medio día", desc: "Tarifa fija" },
  { value: "dia_completo", label: "Día completo", desc: "Tarifa fija" },
];

export function RegistroPage() {
  const {
    tarjeta, setTarjeta,
    placa, setPlaca,
    tipo, setTipo,
    marca, setMarca,
    plan, setPlan,
    consulta,
    envio,
    respuesta,
    alertaAbierta,
    precio,
    calculando,
    puedeRegistrar,
    registrar,
    cerrarAlerta,
  } = useRegistro();

  const [tarjetaDetectada, setTarjetaDetectada] = useState<string | null>(null);
  const tarjetaRef = useRef<HTMLInputElement>(null);
  const placaRef = useRef<HTMLInputElement>(null);

  // Los lectores de tarjetas se comportan como un teclado: "escriben" el código
  // y terminan con Enter. Si el foco está fuera de un campo editable, llevamos
  // el foco al campo de tarjeta para que el código se escriba ahí solo.
  useEffect(() => {
    if (envio || alertaAbierta) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const el = document.activeElement as HTMLElement | null;
      const editable =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el?.isContentEditable;
      if (editable || !tarjetaRef.current) return;
      tarjetaRef.current.focus();
      tarjetaRef.current.select(); // el nuevo código reemplaza al anterior
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [envio, alertaAbierta]);

  // Tras registrar (o cerrar la alerta) dejamos el campo listo para la próxima tarjeta.
  useEffect(() => {
    if (!envio && !alertaAbierta) tarjetaRef.current?.focus();
  }, [envio, alertaAbierta]);

  const handleTarjetaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // El Enter final del lector no debe enviar el formulario: pasamos a la placa.
    if (e.key === "Enter") {
      e.preventDefault();
      if (tarjeta.trim()) {
        // Enter = el lector terminó de enviar el código: tarjeta detectada.
        setTarjetaDetectada(tarjeta.trim());
        placaRef.current?.focus();
      }
    }
  };

  const cerrarNotificacion = useCallback(() => setTarjetaDetectada(null), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registrar();
  };

  const conMembresia = !!consulta?.membresia;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Registro de Ingreso</h1>
        <p className="text-sm text-text-muted mt-1">
          Asigne una tarjeta del parqueadero al vehículo que ingresa
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <CreditCard className="size-4" /> Tarjeta del Parqueadero
            </label>
            <Input
              ref={tarjetaRef}
              value={tarjeta}
              onChange={(e) => setTarjeta(e.target.value.toUpperCase())}
              onKeyDown={handleTarjetaKeyDown}
              onFocus={(e) => e.currentTarget.select()}
              placeholder="Pase la tarjeta por el lector"
              className="h-12 font-mono text-lg font-bold tracking-wider"
              disabled={envio}
              maxLength={32}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Nº de Placa</label>
            <Input
              ref={placaRef}
              value={placa}
              onChange={(e) => setPlaca(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="h-12 text-lg font-bold tracking-widest uppercase"
              disabled={envio}
              maxLength={10}
            />
            {conMembresia && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                <BadgeCheck className="size-4" />
                Membresía {consulta?.membresia?.plan} vigente hasta {consulta?.membresia?.fechaFin}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Tipo de Vehículo</label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as "carro" | "moto")}
                disabled={envio || !!consulta?.registrado}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carro">
                    <span className="flex items-center gap-2">
                      <Car className="size-4" /> Carro
                    </span>
                  </SelectItem>
                  <SelectItem value="moto">
                    <span className="flex items-center gap-2">
                      <Bike className="size-4" /> Moto
                    </span>
                  </SelectItem>
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
                maxLength={50}
              />
            </div>
          </div>

          <div className="rounded-xl bg-background border border-border p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Plan de Cobro</p>
            {conMembresia ? (
              <p className="text-sm text-text-secondary">
                Este vehículo ingresa con su membresía; no se cobra por tiempo.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {planes.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlan(p.value)}
                    disabled={envio}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      plan === p.value ? "border-brand bg-brand-light" : "border-border hover:border-brand/50"
                    }`}
                  >
                    <p className="text-sm font-medium text-text-primary">{p.label}</p>
                    <p className="text-xs text-text-muted">{p.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-text-secondary mb-1.5">Tarifa</p>
              <div className="flex h-12 items-center rounded-xl border border-border bg-background px-5 text-xl font-bold text-brand">
                {conMembresia ? (
                  <span className="text-base text-green-700">Incluido en membresía</span>
                ) : calculando ? (
                  <span className="flex items-center gap-2 text-text-muted text-base">
                    <Loader2 className="size-4 animate-spin" />
                    Calculando...
                  </span>
                ) : precio ? (
                  <span>
                    ${precio.monto.toLocaleString("es-CO")}
                    <span className="ml-2 text-sm font-medium text-text-muted">
                      {plan === "bloque_15min" ? "por bloque de 15 min" : "plan fijo"}
                    </span>
                  </span>
                ) : (
                  <span className="text-text-subtle text-base">—</span>
                )}
              </div>
              <p className="mt-1 text-xs text-text-subtle">El cobro se realiza al registrar la salida.</p>
            </div>
            <Button
              type="submit"
              disabled={envio || !puedeRegistrar}
              className="h-12 px-8 bg-brand hover:bg-brand-hover text-white font-bold text-base shadow-sm sm:self-start sm:mt-7"
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

      <NotificacionTarjeta codigo={tarjetaDetectada} onClose={cerrarNotificacion} />

      <AlertaRegistro open={alertaAbierta} data={respuesta} onClose={cerrarAlerta} />
    </div>
  );
}
