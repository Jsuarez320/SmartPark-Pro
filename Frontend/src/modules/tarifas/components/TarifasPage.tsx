import { useState } from "react";
import { Pestanas } from "@/shared/components/Pestanas";
import { FestivosTab } from "./FestivosTab";
import { HistorialTab } from "./HistorialTab";
import { ParametrosTab } from "./ParametrosTab";
import { PreciosTab } from "./PreciosTab";
import { SimuladorTab } from "./SimuladorTab";

type Seccion = "precios" | "parametros" | "festivos" | "simulador" | "historial";

/** Tarifas y reglas de cobro. Solo administrador (lo exige la ruta y también el backend). */
export function TarifasPage() {
  const [seccion, setSeccion] = useState<Seccion>("precios");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tarifas</h1>
          <p className="mt-1 text-sm text-text-muted">Precios por tipo de vehículo, reglas de cobro y festivos</p>
        </div>
        <Pestanas
          etiquetaAccesible="Secciones de tarifas"
          valor={seccion}
          onChange={setSeccion}
          items={[
            { valor: "precios", etiqueta: "Precios" },
            { valor: "parametros", etiqueta: "Parámetros" },
            { valor: "festivos", etiqueta: "Festivos" },
            { valor: "simulador", etiqueta: "Simulador" },
            { valor: "historial", etiqueta: "Historial" },
          ]}
        />
      </div>

      {seccion === "precios" && <PreciosTab />}
      {seccion === "parametros" && <ParametrosTab />}
      {seccion === "festivos" && <FestivosTab />}
      {seccion === "simulador" && <SimuladorTab />}
      {seccion === "historial" && <HistorialTab />}
    </div>
  );
}
