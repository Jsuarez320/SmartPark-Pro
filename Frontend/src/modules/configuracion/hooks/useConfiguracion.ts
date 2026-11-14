import { useCallback, useEffect, useState } from "react";
import { getApiError } from "@/shared/utils/formatters";
import type { Tarifas } from "../configuracion.types";
import { actualizarTarifas, obtenerConfiguracion } from "../services/configuracion.service";

type Borrador = Record<number, string>;

export function useConfiguracion() {
  const [tarifas, setTarifas] = useState<Tarifas>({ carro: [], moto: [] });
  const [borrador, setBorrador] = useState<Borrador>({});
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const aplicar = (t: Tarifas) => {
    setTarifas(t);
    setBorrador(Object.fromEntries([...t.carro, ...t.moto].map((x) => [x.id, String(x.value)])));
  };

  const cargar = useCallback(async () => {
    try {
      aplicar((await obtenerConfiguracion()).tarifas);
      setError(null);
    } catch (err) {
      setError(getApiError(err, "No se pudo cargar la configuración"));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const toggleEditando = () => {
    if (editando) aplicar(tarifas); // cancelar: descarta los cambios
    setEditando((prev) => !prev);
    setGuardado(false);
    setError(null);
  };

  const actualizar = (id: number, value: string) => setBorrador((b) => ({ ...b, [id]: value }));

  const valorDe = (id: number) => borrador[id] ?? "";

  const guardar = async () => {
    const cambios = [...tarifas.carro, ...tarifas.moto]
      .map((t) => ({ id: t.id, value: Number(borrador[t.id]), actual: t.value }))
      .filter((t) => t.value !== t.actual);

    if (cambios.some((t) => !Number.isInteger(t.value) || t.value <= 0)) {
      setError("Todas las tarifas deben ser números enteros mayores a 0");
      return;
    }
    if (cambios.length === 0) {
      setEditando(false);
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      aplicar((await actualizarTarifas(cambios.map(({ id, value }) => ({ id, value })))).tarifas);
      setEditando(false);
      setGuardado(true);
    } catch (err) {
      setError(getApiError(err, "No se pudieron guardar las tarifas"));
    } finally {
      setGuardando(false);
    }
  };

  return {
    tarifas,
    editando,
    toggleEditando,
    cargando,
    guardando,
    error,
    guardado,
    valorDe,
    actualizar,
    guardar,
  };
}
