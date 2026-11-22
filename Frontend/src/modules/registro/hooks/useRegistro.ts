import { useState, useEffect } from "react";
import { formatHora, getApiError } from "@/shared/utils/formatters";
import type {
  ConsultaPlaca,
  PlanIngreso,
  PrecioResponse,
  RespuestaRegistro,
  TipoVehiculoRegistro,
} from "../types";
import { usePrinter } from "@/shared/printing/usePrinter";
import { registrarEntrada, calcularPrecio, consultarPlaca } from "../services/registro.service";

export function useRegistro() {
  const [tarjeta, setTarjeta] = useState("");
  const [placa, setPlaca] = useState("");
  const [tipo, setTipo] = useState<TipoVehiculoRegistro>("carro");
  const [marca, setMarca] = useState("");
  const [plan, setPlan] = useState<PlanIngreso>("bloque_15min");
  const [consulta, setConsulta] = useState<ConsultaPlaca | null>(null);
  const [envio, setEnvio] = useState(false);
  const [respuesta, setRespuesta] = useState<RespuestaRegistro | null>(null);
  const [alertaAbierta, setAlertaAbierta] = useState(false);
  const [precio, setPrecio] = useState<PrecioResponse | null>(null);
  const [calculando, setCalculando] = useState(false);
  const { imprimirIngreso, limpiarError } = usePrinter();

  // Mensual (membresía vigente) = tarjeta; diario = recibo impreso, sin tarjeta.
  const esMensual = !!consulta?.membresia;

  // Tarifa del plan elegido (viene de la API)
  useEffect(() => {
    let cancelado = false;
    setCalculando(true);
    calcularPrecio({ tipo, plan })
      .then((res) => !cancelado && setPrecio(res))
      .catch(() => !cancelado && setPrecio(null))
      .finally(() => !cancelado && setCalculando(false));
    return () => {
      cancelado = true;
    };
  }, [tipo, plan]);

  // Si la placa ya existe: toma su tipo y avisa si tiene membresía vigente
  useEffect(() => {
    const p = placa.trim();
    if (p.length < 3) {
      setConsulta(null);
      return;
    }
    let cancelado = false;
    const timer = setTimeout(async () => {
      try {
        const res = await consultarPlaca(p);
        if (cancelado) return;
        setConsulta(res);
        if (res.registrado && res.tipo) setTipo(res.tipo);
      } catch {
        if (!cancelado) setConsulta(null);
      }
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [placa]);

  const limpiar = () => {
    setTarjeta("");
    setPlaca("");
    setTipo("carro");
    setMarca("");
    setPlan("bloque_15min");
    setConsulta(null);
  };

  const puedeRegistrar = placa.trim() !== "" && (!esMensual || tarjeta.trim() !== "");

  const registrar = async () => {
    const codigoTarjeta = esMensual ? tarjeta.trim() : "";
    if (!puedeRegistrar) return;

    setEnvio(true);
    try {
      const res = await registrarEntrada({ tarjeta: codigoTarjeta, placa: placa.trim(), tipo, marca, plan });

      // Diario: se imprime el recibo de entrada. Si falla, el ingreso ya quedó
      // registrado: se avisa en la alerta para que el operador pueda reintentar a mano.
      let impresion: RespuestaRegistro["impresion"];
      if (!res.membresia) {
        limpiarError();
        const ok = await imprimirIngreso({
          tiquete: res.tarjeta,
          horaEntrada: res.horaIngreso,
          tipoVehiculo: res.tipo,
          placa: res.placa,
          marca: res.marca ?? undefined,
          plan: res.plan,
          tarifa: res.tarifa,
        });
        impresion = { ok };
      }

      setRespuesta({
        mensual: res.membresia,
        impresion,
        mensaje: res.mensaje,
        id: res.id,
        estado: res.estado,
        tarjeta: res.tarjeta,
        placa: res.placa,
        tipo: res.tipo,
        plan: res.membresia ? `${res.plan} (membresía)` : res.plan,
        horaIngreso: formatHora(res.horaIngreso),
      });
      setAlertaAbierta(true);
      limpiar();
    } catch (err) {
      setRespuesta({
        mensaje: getApiError(err, "Error al registrar vehículo"),
        id: "",
        estado: "error",
        tarjeta: codigoTarjeta,
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

  return {
    tarjeta, setTarjeta,
    placa, setPlaca,
    tipo, setTipo,
    marca, setMarca,
    plan, setPlan,
    consulta,
    envio,
    respuesta,
    alertaAbierta,
    precio,
    calculando,
    esMensual,
    puedeRegistrar,
    registrar,
    cerrarAlerta,
  };
}
