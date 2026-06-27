import { useState } from "react";
import type { TarifaEntry } from "../configuracion.types";

const tarifasMotoDefault: TarifaEntry[] = [
  { label: "30 min", value: "1000" },
  { label: "Hora", value: "1300" },
  { label: "Día", value: "15000" },
  { label: "Mensualidad", value: "60000" },
  { label: "Evento (3h)", value: "3000" },
];

const tarifasCarroDefault: TarifaEntry[] = [
  { label: "15 min", value: "1600" },
  { label: "30 min", value: "2400" },
  { label: "45 min", value: "2800" },
  { label: "Hora", value: "3200" },
  { label: "Día", value: "25000" },
  { label: "Mensualidad", value: "100000" },
  { label: "Evento (3h)", value: "8000" },
];

export function useConfiguracion() {
  const [editando, setEditando] = useState(false);
  const [motos, setMotos] = useState(tarifasMotoDefault);
  const [carros, setCarros] = useState(tarifasCarroDefault);
  const [eventoActivo, setEventoActivo] = useState(false);

  const toggleEditando = () => setEditando((prev) => !prev);

  const actualizarMoto = (index: number, value: string) => {
    setMotos((prev) => prev.map((t, i) => (i === index ? { ...t, value } : t)));
  };

  const actualizarCarro = (index: number, value: string) => {
    setCarros((prev) => prev.map((t, i) => (i === index ? { ...t, value } : t)));
  };

  const toggleEvento = () => setEventoActivo((prev) => !prev);

  return {
    editando,
    toggleEditando,
    motos,
    carros,
    actualizarMoto,
    actualizarCarro,
    eventoActivo,
    toggleEvento,
  };
}
