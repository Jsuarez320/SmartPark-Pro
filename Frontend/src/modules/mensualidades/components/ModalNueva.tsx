import { useState } from "react";
import { Bike, Car, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Campo, ErrorBanner } from "@/shared/components/ErrorBanner";
import { MedioPagoSelector } from "@/shared/components/MedioPagoSelector";
import { Modal } from "@/shared/components/Modal";
import { formatCurrencyCOP, getApiError } from "@/shared/utils/formatters";
import { normalizarPlaca } from "@/shared/utils/placa";
import { useCrearMensualidad, usePreciosMensualidad } from "../hooks/useMensualidades";
import {
  NOMBRE_JORNADA,
  NOMBRE_PERIODO,
  type Jornada,
  type MedioPago,
  type PeriodoMensualidad,
  type RespuestaMensualidad,
  type TipoVehiculo,
} from "../mensualidades.types";

const SELECT = "flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

interface ModalNuevaProps {
  open: boolean;
  onClose: () => void;
  onCreada: (respuesta: RespuestaMensualidad) => void;
}

/** Registro de una mensualidad: datos del cliente y del vehículo, periodo, jornada y cobro del primer periodo. */
export function ModalNueva({ open, onClose, onCreada }: ModalNuevaProps) {
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [placa, setPlaca] = useState("");
  const [placaAlterna, setPlacaAlterna] = useState("");
  const [tipo, setTipo] = useState<TipoVehiculo>("carro");
  const [tarjeta, setTarjeta] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoMensualidad>("1_mes");
  const [jornada, setJornada] = useState<Jornada>("completa");
  const [medio, setMedio] = useState<MedioPago>("efectivo");
  const [referencia, setReferencia] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const crear = useCrearMensualidad();
  const precios = usePreciosMensualidad();
  const precio = precios.data?.[tipo]?.[periodo];

  const cerrar = () => {
    if (crear.isPending) return;
    crear.reset();
    setErrorLocal(null);
    onClose();
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);
    if (placa.length < 3) return setErrorLocal("La placa debe tener al menos 3 letras o números.");
    if (placaAlterna && placaAlterna === placa) return setErrorLocal("La placa alterna debe ser distinta de la principal.");
    crear.mutate(
      {
        nombre: nombre.trim(),
        celular: celular.trim() || undefined,
        placa,
        placaAlterna: placaAlterna || undefined,
        tipoVehiculo: tipo,
        tarjeta: tarjeta.trim() || undefined,
        periodo,
        jornada,
        medioPago: medio,
        referencia: medio === "transferencia" ? referencia.trim() || undefined : undefined,
      },
      {
        onSuccess: (r) => {
          setNombre("");
          setCelular("");
          setPlaca("");
          setPlacaAlterna("");
          setTarjeta("");
          setReferencia("");
          setMedio("efectivo");
          onCreada(r);
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={cerrar} titulo="Nueva mensualidad" descripcion="Registra al cliente y cobra el primer periodo." ancho="max-w-2xl">
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre del cliente">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} required autoFocus className="h-11" />
          </Campo>
          <Campo etiqueta="Celular">
            <Input value={celular} onChange={(e) => setCelular(e.target.value)} maxLength={20} inputMode="tel" className="h-11" />
          </Campo>
          <Campo etiqueta="Placa principal">
            <Input
              value={placa}
              onChange={(e) => setPlaca(normalizarPlaca(e.target.value))}
              maxLength={10}
              required
              className="h-11 font-bold uppercase tracking-widest"
            />
          </Campo>
          <Campo etiqueta="Placa alterna (opcional)">
            <Input
              value={placaAlterna}
              onChange={(e) => setPlacaAlterna(normalizarPlaca(e.target.value))}
              maxLength={10}
              className="h-11 font-bold uppercase tracking-widest"
            />
          </Campo>
          <Campo etiqueta="Tipo de vehículo">
            <div role="radiogroup" aria-label="Tipo de vehículo" className="grid grid-cols-2 gap-2">
              {([["carro", "Carro", Car], ["moto", "Moto", Bike]] as const).map(([valor, etiqueta, Icono]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={tipo === valor}
                  onClick={() => setTipo(valor)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold ${
                    tipo === valor ? "border-brand bg-brand-light text-brand" : "border-border text-text-secondary hover:bg-background"
                  }`}
                >
                  <Icono className="size-4" /> {etiqueta}
                </button>
              ))}
            </div>
          </Campo>
          <Campo etiqueta="ID de la tarjeta (opcional)">
            <Input value={tarjeta} onChange={(e) => setTarjeta(e.target.value.toUpperCase())} maxLength={32} className="h-11 font-mono" />
          </Campo>
          <Campo etiqueta="Periodo">
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoMensualidad)} className={SELECT}>
              {(Object.keys(NOMBRE_PERIODO) as PeriodoMensualidad[]).map((p) => (
                <option key={p} value={p}>
                  {NOMBRE_PERIODO[p]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Jornada">
            <select value={jornada} onChange={(e) => setJornada(e.target.value as Jornada)} className={SELECT}>
              {(Object.keys(NOMBRE_JORNADA) as Jornada[]).map((j) => (
                <option key={j} value={j}>
                  {NOMBRE_JORNADA[j]}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-text-muted">Total a cobrar</span>
            <span className="text-2xl font-bold text-text-primary" aria-live="polite">
              {precio === undefined ? "—" : formatCurrencyCOP(precio)}
            </span>
          </div>
          <MedioPagoSelector value={medio} onChange={setMedio} disabled={crear.isPending} />
          {medio === "transferencia" && (
            <div className="mt-3">
              <Campo etiqueta="Referencia de la transferencia (opcional)">
                <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={100} className="h-11" />
              </Campo>
            </div>
          )}
        </div>

        <ErrorBanner mensaje={errorLocal ?? (crear.isError ? getApiError(crear.error, "No se pudo registrar la mensualidad") : null)} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={cerrar} disabled={crear.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={crear.isPending || !nombre.trim() || !placa} className="gap-2 bg-brand font-semibold text-white hover:bg-brand-hover">
            {crear.isPending && <Loader2 className="size-4 animate-spin" />}
            Registrar y cobrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
