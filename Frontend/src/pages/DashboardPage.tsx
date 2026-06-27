import { TarifasVigentes } from "@/modules/tarifas/components/TarifasVigentes";
import { VehiculosPanel } from "@/modules/vehiculos/components/VehiculosPanel";
import { ConsolaOperaciones } from "@/modules/operaciones/components/ConsolaOperaciones";
import { ConsolaSimulador } from "@/modules/operaciones/components/ConsolaSimulador";

export function DashboardPage() {
  return (
    <section className="space-y-6">
      <TarifasVigentes />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <VehiculosPanel />

        <aside className="space-y-6">
          <ConsolaOperaciones />
          <ConsolaSimulador />
        </aside>
      </div>
    </section>
  );
}
