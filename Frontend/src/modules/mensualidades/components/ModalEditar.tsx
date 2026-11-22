import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Campo, ErrorBanner } from "@/shared/components/ErrorBanner";
import { Modal } from "@/shared/components/Modal";
import { getApiError } from "@/shared/utils/formatters";
import { normalizarPlaca } from "@/shared/utils/placa";
import { useAuthStore } from "@/stores/authStore";
import { useEditarMensualidad } from "../hooks/useMensualidades";
import { NOMBRE_JORNADA, type EditarMensualidadDatos, type Jornada, type Mensualidad } from "../mensualidades.types";

const SELECT = "flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60";

interface ModalEditarProps {
  mensualidad: Mensualidad | null;
  onClose: () => void;
  onEditada: () => void;
}

/** Edición de datos, placas, tarjeta y jornada. Cambiar la placa principal solo lo puede hacer un administrador. */
export function ModalEditar({ mensualidad, onClose, onEditada }: ModalEditarProps) {
  const esAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [placa, setPlaca] = useState("");
  const [placaAlterna, setPlacaAlterna] = useState("");
  const [tarjeta, setTarjeta] = useState("");
  const [jornada, setJornada] = useState<Jornada>("completa");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const editar = useEditarMensualidad();

  useEffect(() => {
    if (!mensualidad) return;
    setNombre(mensualidad.cliente);
    setCelular(mensualidad.celular ?? "");
    setPlaca(mensualidad.placa);
    setPlacaAlterna(mensualidad.placaAlterna ?? "");
    setTarjeta(mensualidad.tarjeta ?? "");
    setJornada(mensualidad.jornada);
    setErrorLocal(null);
    editar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensualidad?.id]);

  const cerrar = () => {
    if (!editar.isPending) onClose();
  };

  /** Solo se envía lo que cambió; un campo opcional vaciado se envía como null para borrarlo. */
  const cambios = (): EditarMensualidadDatos => {
    const m = mensualidad as Mensualidad;
    const c: EditarMensualidadDatos = {};
    if (nombre.trim() !== m.cliente) c.nombre = nombre.trim();
    if (celular.trim() !== (m.celular ?? "")) c.celular = celular.trim() || null;
    if (placa !== m.placa) c.placa = placa;
    if (placaAlterna !== (m.placaAlterna ?? "")) c.placaAlterna = placaAlterna || null;
    if (tarjeta.trim() !== (m.tarjeta ?? "")) c.tarjeta = tarjeta.trim() || null;
    if (jornada !== m.jornada) c.jornada = jornada;
    return c;
  };

  const hayCambios = mensualidad !== null && Object.keys(cambios()).length > 0;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensualidad) return;
    setErrorLocal(null);
    if (placaAlterna && placaAlterna === placa) return setErrorLocal("La placa alterna debe ser distinta de la principal.");
    editar.mutate({ id: mensualidad.id, cambios: cambios() }, { onSuccess: onEditada });
  };

  return (
    <Modal open={mensualidad !== null} onClose={cerrar} titulo="Editar mensualidad" descripcion="Cambia solo lo necesario." ancho="max-w-xl">
      {mensualidad && (
        <form onSubmit={enviar} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombre del cliente">
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} required autoFocus className="h-11" />
            </Campo>
            <Campo etiqueta="Celular">
              <Input value={celular} onChange={(e) => setCelular(e.target.value)} maxLength={20} inputMode="tel" className="h-11" />
            </Campo>
            <Campo etiqueta="Placa principal" ayuda={esAdmin ? undefined : "Solo un administrador puede cambiarla."}>
              <Input
                value={placa}
                onChange={(e) => setPlaca(normalizarPlaca(e.target.value))}
                maxLength={10}
                disabled={!esAdmin}
                className="h-11 font-bold uppercase tracking-widest"
              />
            </Campo>
            <Campo etiqueta="Placa alterna">
              <Input
                value={placaAlterna}
                onChange={(e) => setPlacaAlterna(normalizarPlaca(e.target.value))}
                maxLength={10}
                className="h-11 font-bold uppercase tracking-widest"
              />
            </Campo>
            <Campo etiqueta="ID de la tarjeta">
              <Input value={tarjeta} onChange={(e) => setTarjeta(e.target.value.toUpperCase())} maxLength={32} className="h-11 font-mono" />
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

          <p className="text-xs text-text-subtle">
            El periodo y el valor no se editan aquí: para cambiarlos, renueva la mensualidad. Los cambios aplican al periodo vigente y a los ya pagados por adelantado.
          </p>

          <ErrorBanner mensaje={errorLocal ?? (editar.isError ? getApiError(editar.error, "No se pudo guardar la mensualidad") : null)} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cerrar} disabled={editar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={editar.isPending || !hayCambios || !nombre.trim() || !placa} className="gap-2 bg-brand font-semibold text-white hover:bg-brand-hover">
              {editar.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar cambios
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
