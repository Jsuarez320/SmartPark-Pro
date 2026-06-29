import { useState } from "react";
import type { RespuestaRegistro } from "../components/AlertaRegistro";
import type { TipoVehiculoRegistro } from "../registro.types";
import { registrarEntrada } from "../services/registro.service";

export function useRegistro() {
  const [placa, setPlaca] = useState("");
  const [tipo, setTipo] = useState<TipoVehiculoRegistro>("carro");
  const [marca, setMarca] = useState("");
  const [mensualidad, setMensualidad] = useState(false);
  const [pagoDiario, setPagoDiario] = useState(false);
  const [diaEspecial, setDiaEspecial] = useState(false);
  const [envio, setEnvio] = useState(false);
  const [respuesta, setRespuesta] = useState<RespuestaRegistro | null>(null);
  const [alertaAbierta, setAlertaAbierta] = useState(false);

  const limpiar = () => {
    setPlaca("");
    setTipo("carro");
    setMarca("");
    setMensualidad(false);
    setPagoDiario(false);
    setDiaEspecial(false);
  };

  const registrar = async () => {
    if (!placa) return;

    setEnvio(true);

    try {
      const response = await registrarEntrada({
        placa,
        tipo,
        marca,
        mensualidad,
        pagoDiario,
        diaEspecial,
      });

      const res: RespuestaRegistro = {
        mensaje: `Vehículo con placa ${placa} ingresado correctamente`,
        id: response.id,
        estado: response.estado,
        placa,
        tipo,
        horaIngreso: new Date().toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        total: response.total,
      };

      setRespuesta(res);
      setAlertaAbierta(true);
      limpiar();
    } catch (err: any) {
      const mensaje =
        err?.response?.data?.detail || err?.message || "Error al registrar vehículo";
      setRespuesta({
        mensaje,
        id: "",
        estado: "error",
        placa,
        tipo,
        horaIngreso: "",
      });
      setAlertaAbierta(true);
    } finally {
      setEnvio(false);
    }
  };

  const cerrarAlerta = () => {
    setAlertaAbierta(false);
    setRespuesta(null);
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
    placa, setPlaca,
    tipo, setTipo,
    marca, setMarca,
    mensualidad, setMensualidad,
    pagoDiario, setPagoDiario,
    diaEspecial, setDiaEspecial,
    envio,
    respuesta,
    alertaAbierta,
    registrar,
    cerrarAlerta,
    fecha, hora,
  };
}
