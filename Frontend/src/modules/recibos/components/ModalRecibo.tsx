import { Loader2, Printer } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ErrorBanner } from "@/shared/components/ErrorBanner";
import { Modal } from "@/shared/components/Modal";
import { formatFechaHoraCompleta, getApiError } from "@/shared/utils/formatters";
import { useAuthStore } from "@/stores/authStore";
import { useRecibo, useReimpresiones } from "../hooks/useRecibos";
import { VistaRecibo } from "./VistaRecibo";

interface ModalReciboProps {
  id: string | null;
  onClose: () => void;
  onReimprimir: (id: string) => void;
  reimprimiendo: boolean;
}

/** Recibo con su contenido guardado, opción de reimprimir y (administrador) el historial de copias. */
export function ModalRecibo({ id, onClose, onReimprimir, reimprimiendo }: ModalReciboProps) {
  const esAdmin = useAuthStore((s) => s.user?.role === "admin");
  const { data, isLoading, error } = useRecibo(id);
  const historial = useReimpresiones(id, esAdmin && (data?.reimpresiones ?? 0) > 0);

  return (
    <Modal open={id !== null} onClose={onClose} titulo="Recibo" descripcion="Contenido guardado al momento de la operación." ancho="max-w-xl">
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Cargando...
        </div>
      )}
      <ErrorBanner mensaje={error ? getApiError(error, "No se pudo cargar el recibo") : null} />
      {data && (
        <div className="space-y-4">
          <VistaRecibo recibo={data} />

          {esAdmin && (historial.data ?? []).length > 0 && (
            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="mb-1 font-semibold text-text-secondary">Reimpresiones ({data.reimpresiones})</p>
              <ul className="space-y-0.5 text-text-muted">
                {historial.data!.map((r) => (
                  <li key={r.fecha}>
                    {formatFechaHoraCompleta(r.fecha)} · {r.usuario}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              type="button"
              disabled={reimprimiendo}
              onClick={() => onReimprimir(data.id)}
              className="gap-2 bg-brand font-semibold text-white hover:bg-brand-hover"
            >
              {reimprimiendo ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
              Reimprimir copia
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
