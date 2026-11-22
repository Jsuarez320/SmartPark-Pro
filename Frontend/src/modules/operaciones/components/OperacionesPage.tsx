import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { AvisoImpresion } from "@/shared/components/AvisoImpresion";
import { ErrorBanner } from "@/shared/components/ErrorBanner";
import { useCajaAbierta } from "../hooks/usePatio";
import { useOperacion } from "../hooks/useOperacion";
import { FormularioPlaca } from "./FormularioPlaca";
import { PanelPago } from "./PanelPago";
import { ResultadoOperacion } from "./ResultadoOperacion";
import { TablaPatio } from "./TablaPatio";

/**
 * Entrada y salida en una sola pantalla. Se escribe la placa, se elige Carro/Moto y Enter:
 * el sistema decide si es entrada o salida. Tras cada operación el foco vuelve a la placa.
 */
export function OperacionesPage() {
  const op = useOperacion();
  const { data: cajaAbierta } = useCajaAbierta();
  const placaRef = useRef<HTMLInputElement>(null);

  // Flujo solo con teclado: cuando no hay un cobro abierto ni una operación en curso, el foco es la placa.
  useEffect(() => {
    if (!op.pendiente && !op.enviando) placaRef.current?.focus();
  }, [op.pendiente, op.enviando, op.ultima]);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Entrada y salida</h1>
          <p className="mt-1 text-sm text-text-muted">Escribe la placa y pulsa Enter: el sistema registra la entrada o calcula la salida.</p>
        </div>

        {cajaAbierta === false && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              La caja está cerrada. Puedes registrar entradas, pero no cobrar salidas con valor.{" "}
              <Link to="/caja" className="font-semibold underline">
                Abrir la caja
              </Link>
            </span>
          </div>
        )}

        <FormularioPlaca
          placa={op.placa}
          onPlaca={op.setPlaca}
          tipo={op.tipoVehiculo}
          onTipo={op.setTipoVehiculo}
          onEnviar={() => void op.registrar()}
          enviando={op.enviando && !op.pendiente}
          atajosActivos={!op.pendiente}
          inputRef={placaRef}
        />

        {!op.pendiente && <ErrorBanner mensaje={op.error} onCerrar={op.limpiarError} />}
        <AvisoImpresion estado={op.impresion.estado} onReintentar={op.reintentarImpresion} onCerrar={op.impresion.limpiar} />
        {op.ultima && <ResultadoOperacion resultado={op.ultima} />}
      </div>

      <TablaPatio onSalida={(i) => void op.registrar(i.placa, i.tipoVehiculo)} deshabilitado={op.enviando} />

      <PanelPago
        pendiente={op.pendiente}
        procesando={op.enviando}
        error={op.error}
        onConfirmar={(medio, referencia) => void op.confirmarPago(medio, referencia)}
        onCancelar={op.cancelarPago}
      />
    </div>
  );
}
