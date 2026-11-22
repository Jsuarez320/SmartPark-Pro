import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  titulo: string;
  descripcion?: string;
  /** Clase de ancho máximo (Tailwind). */
  ancho?: string;
  /** Elemento que recibe el foco al abrir (por defecto, el primer control del diálogo). */
  enfocarAlAbrir?: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}

/** Diálogo accesible (Radix): Esc cierra, el foco queda atrapado y vuelve al elemento anterior. */
export function Modal({ open, onClose, titulo, descripcion, ancho = "max-w-lg", enfocarAlAbrir, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(abierto) => !abierto && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            if (enfocarAlAbrir?.current) {
              e.preventDefault();
              enfocarAlAbrir.current.focus();
            }
          }}
          className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] ${ancho} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl focus:outline-none`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-bold text-text-primary">{titulo}</Dialog.Title>
              <Dialog.Description className={descripcion ? "mt-1 text-sm text-text-muted" : "sr-only"}>
                {descripcion ?? titulo}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 text-text-subtle transition-colors hover:text-text-muted" aria-label="Cerrar">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
