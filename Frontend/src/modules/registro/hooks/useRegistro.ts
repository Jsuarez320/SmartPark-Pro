import { useState } from "react";
import type { TipoVehiculoRegistro } from "../registro.types";

export function useRegistro() {
  const [placa, setPlaca] = useState("");
  const [tipo, setTipo] = useState<TipoVehiculoRegistro>("carro");
  const [marca, setMarca] = useState("");
  const [mensualidad, setMensualidad] = useState(false);
  const [pagoDiario, setPagoDiario] = useState(false);
  const [diaEspecial, setDiaEspecial] = useState(false);

  const limpiar = () => {
    setPlaca("");
    setTipo("carro");
    setMarca("");
    setMensualidad(false);
    setPagoDiario(false);
    setDiaEspecial(false);
  };

  const fecha = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const hora = new Date().toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    placa,
    setPlaca,
    tipo,
    setTipo,
    marca,
    setMarca,
    mensualidad,
    setMensualidad,
    pagoDiario,
    setPagoDiario,
    diaEspecial,
    setDiaEspecial,
    limpiar,
    fecha,
    hora,
  };
}
