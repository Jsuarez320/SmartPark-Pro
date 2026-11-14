import { useCallback, useEffect, useState } from "react";
import { getApiError } from "@/shared/utils/formatters";
import type {
  DesgloseIngresos,
  PeriodoFiltro,
  Transaccion,
  TurnoActual,
  TurnoHistorial,
} from "../caja.types";
import {
  abrirTurno,
  cerrarTurno,
  obtenerHistorialTurnos,
  obtenerIngresos,
  obtenerTransacciones,
  obtenerTurno,
} from "../services/caja.service";

const periodos: PeriodoFiltro[] = ["Día", "Semana", "Mes", "Año"];

/** Estado de caja. Los reportes (ingresos, transacciones, historial) solo se cargan para el admin. */
export function useCaja(isAdmin: boolean) {
  const [periodoActivo, setPeriodoActivo] = useState<PeriodoFiltro>("Día");
  const [turno, setTurno] = useState<TurnoActual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingresos, setIngresos] = useState<DesgloseIngresos | null>(null);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [historial, setHistorial] = useState<TurnoHistorial[]>([]);
  const [ultimoCierre, setUltimoCierre] = useState<TurnoHistorial | null>(null);

  const cargarTurno = useCallback(async () => {
    try {
      setTurno(await obtenerTurno());
    } catch (err) {
      setError(getApiError(err, "No se pudo consultar la caja"));
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarReportes = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [i, t, h] = await Promise.all([
        obtenerIngresos(periodoActivo),
        obtenerTransacciones(periodoActivo),
        obtenerHistorialTurnos(),
      ]);
      setIngresos(i);
      setTransacciones(t);
      setHistorial(h);
    } catch (err) {
      setError(getApiError(err, "No se pudieron cargar los reportes"));
    }
  }, [isAdmin, periodoActivo]);

  useEffect(() => {
    cargarTurno();
  }, [cargarTurno]);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  const ejecutar = async (accion: () => Promise<void>) => {
    setProcesando(true);
    setError(null);
    try {
      await accion();
      return true;
    } catch (err) {
      setError(getApiError(err, "No se pudo completar la operación"));
      return false;
    } finally {
      setProcesando(false);
    }
  };

  const abrir = (montoInicial: number) =>
    ejecutar(async () => {
      setTurno(await abrirTurno(montoInicial));
      setUltimoCierre(null);
      await cargarReportes();
    });

  const cerrar = (montoContado: number, notas?: string) =>
    ejecutar(async () => {
      setUltimoCierre(await cerrarTurno(montoContado, notas));
      setTurno(null);
      await cargarReportes();
    });

  return {
    periodoActivo,
    setPeriodoActivo,
    periodos,
    turno,
    cargando,
    procesando,
    error,
    limpiarError: () => setError(null),
    ingresos,
    transacciones,
    historial,
    ultimoCierre,
    descartarCierre: () => setUltimoCierre(null),
    abrir,
    cerrar,
  };
}
