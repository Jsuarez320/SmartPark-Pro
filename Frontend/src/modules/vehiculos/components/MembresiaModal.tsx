import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { formatCurrencyCOP, getApiError } from "@/shared/utils/formatters";
import type { MembresiaCreada, MetodoPagoMembresia, NuevaMembresia, PlanMembresia } from "../vehiculos.types";
import { contratarMembresia, obtenerPrecioMembresia } from "../services/vehiculos.service";

interface MembresiaModalProps {
  open: boolean;
  onClose: () => void;
  onCreada: () => void;
}

const vacio: NuevaMembresia = {
  nombres: "",
  apellidos: "",
  documento: "",
  tipoDocumento: "CC",
  telefono: "",
  placa: "",
  tipo: "carro",
  marca: "",
  plan: "mensual",
  metodoPago: "efectivo",
};

const campo = "text-sm font-medium text-text-secondary";
const nativo =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MembresiaModal({ open, onClose, onCreada }: MembresiaModalProps) {
  const [form, setForm] = useState<NuevaMembresia>(vacio);
  const [precio, setPrecio] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<MembresiaCreada | null>(null);

  const set = <K extends keyof NuevaMembresia>(k: K, v: NuevaMembresia[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Medio tiempo solo existe para carros
  useEffect(() => {
    if (form.tipo === "moto" && form.plan === "medio_tiempo") set("plan", "mensual");
  }, [form.tipo, form.plan]);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    setPrecio(null);
    obtenerPrecioMembresia(form.tipo, form.plan)
      .then((p) => !cancelado && setPrecio(p))
      .catch(() => !cancelado && setPrecio(null));
    return () => {
      cancelado = true;
    };
  }, [open, form.tipo, form.plan]);

  if (!open) return null;

  const completo =
    form.nombres.trim() && form.apellidos.trim() && form.documento.trim().length >= 3 && form.placa.trim().length >= 3;

  const cerrar = () => {
    setForm(vacio);
    setError(null);
    setCreada(null);
    onClose();
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      setCreada(await contratarMembresia(form));
      onCreada();
    } catch (err) {
      setError(getApiError(err, "No se pudo registrar la membresía"));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-xl mx-4 max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <button
          onClick={cerrar}
          className="absolute right-4 top-4 text-text-subtle hover:text-text-muted"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>

        {creada ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="size-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Membresía registrada</h2>
            <div className="rounded-xl bg-background border border-border p-4 text-sm space-y-2 text-left">
              <div className="flex justify-between"><span className="text-text-muted">Placa</span><b>{creada.placa}</b></div>
              <div className="flex justify-between"><span className="text-text-muted">Plan</span><span>{creada.plan}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Vigencia</span><span>{creada.fechaInicio} → {creada.fechaFin}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Factura</span><span className="font-mono">{creada.factura}</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="text-text-muted">Pagado</span><b>{formatCurrencyCOP(creada.valor)}</b></div>
            </div>
            <Button onClick={cerrar} className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold">
              Aceptar
            </Button>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Nueva Membresía</h2>
              <p className="text-sm text-text-muted mt-1">
                Se cobra al contratar y se registra en el turno de caja abierto
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={campo}>Nombres</label>
                <Input value={form.nombres} onChange={(e) => set("nombres", e.target.value)} className="h-11 mt-1" maxLength={100} />
              </div>
              <div>
                <label className={campo}>Apellidos</label>
                <Input value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)} className="h-11 mt-1" maxLength={100} />
              </div>
              <div>
                <label className={campo}>Tipo de documento</label>
                <select
                  className={`${nativo} mt-1`}
                  value={form.tipoDocumento}
                  onChange={(e) => set("tipoDocumento", e.target.value as NuevaMembresia["tipoDocumento"])}
                >
                  {["CC", "CE", "NIT", "PAS", "TI"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={campo}>Documento</label>
                <Input value={form.documento} onChange={(e) => set("documento", e.target.value)} className="h-11 mt-1" maxLength={20} />
              </div>
              <div>
                <label className={campo}>Teléfono (opcional)</label>
                <Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} className="h-11 mt-1" maxLength={20} />
              </div>
              <div>
                <label className={campo}>Placa</label>
                <Input
                  value={form.placa}
                  onChange={(e) => set("placa", e.target.value.toUpperCase())}
                  className="h-11 mt-1 font-bold tracking-widest"
                  maxLength={10}
                />
              </div>
              <div>
                <label className={campo}>Tipo de vehículo</label>
                <select className={`${nativo} mt-1`} value={form.tipo} onChange={(e) => set("tipo", e.target.value as "carro" | "moto")}>
                  <option value="carro">Carro</option>
                  <option value="moto">Moto</option>
                </select>
              </div>
              <div>
                <label className={campo}>Marca (opcional)</label>
                <Input value={form.marca} onChange={(e) => set("marca", e.target.value)} className="h-11 mt-1" maxLength={50} />
              </div>
              <div>
                <label className={campo}>Plan</label>
                <select className={`${nativo} mt-1`} value={form.plan} onChange={(e) => set("plan", e.target.value as PlanMembresia)}>
                  <option value="mensual">Mensual</option>
                  {form.tipo === "carro" && <option value="medio_tiempo">Medio tiempo</option>}
                </select>
              </div>
              <div>
                <label className={campo}>Método de pago</label>
                <select
                  className={`${nativo} mt-1`}
                  value={form.metodoPago}
                  onChange={(e) => set("metodoPago", e.target.value as MetodoPagoMembresia)}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="nequi">Nequi</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
              <span className="text-sm text-text-muted">Valor a cobrar</span>
              <span className="text-xl font-bold text-brand">{precio === null ? "—" : formatCurrencyCOP(precio)}</span>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={cerrar} className="flex-1 h-11 border-border text-text-muted font-semibold">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={enviando || !completo || precio === null}
                className="flex-1 h-11 bg-brand hover:bg-brand-hover text-white font-semibold"
              >
                {enviando ? <Loader2 className="size-4 animate-spin" /> : "Cobrar y registrar"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
