import { ImpresoraSection } from "./ImpresoraSection";

/**
 * Configuración del equipo (solo administrador): la impresora térmica.
 * Las tarifas, los parámetros de cobro y los festivos están en Tarifas.
 */
export function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configuración</h1>
        <p className="mt-1 text-sm text-text-muted">Impresora y datos que salen en los recibos</p>
      </div>
      <ImpresoraSection />
    </div>
  );
}
