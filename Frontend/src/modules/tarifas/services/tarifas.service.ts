import { api } from "@/shared/api/api";
import type {
  ConfiguracionCobro,
  Festivo,
  PrecargaFestivos,
  Simulacion,
  SimulacionRequest,
  Tarifa,
  TarifaInput,
  TipoVehiculo,
} from "../tarifas.types";

export async function obtenerVigentes(): Promise<Tarifa[]> {
  const { data } = await api.get<Tarifa[]>("/tarifas/vigentes");
  return data;
}

/** Guarda los precios como una versión nueva (si no cambió nada, el backend devuelve la vigente). */
export async function guardarTarifa(tipo: TipoVehiculo, tarifa: TarifaInput): Promise<Tarifa> {
  const { data } = await api.put<Tarifa>(`/tarifas/vigentes/${tipo}`, tarifa);
  return data;
}

export async function obtenerHistorial(tipo: TipoVehiculo): Promise<Tarifa[]> {
  const { data } = await api.get<Tarifa[]>(`/tarifas/historial/${tipo}`);
  return data;
}

export async function obtenerConfiguracion(): Promise<ConfiguracionCobro> {
  const { data } = await api.get<ConfiguracionCobro>("/tarifas/configuracion");
  return data;
}

/** Actualización parcial: solo cambian los campos enviados. */
export async function guardarConfiguracion(cambios: Partial<ConfiguracionCobro>): Promise<ConfiguracionCobro> {
  const { data } = await api.put<ConfiguracionCobro>("/tarifas/configuracion", cambios);
  return data;
}

export async function obtenerFestivos(anio: number): Promise<Festivo[]> {
  const { data } = await api.get<Festivo[]>("/tarifas/festivos", { params: { anio } });
  return data;
}

export async function agregarFestivo(festivo: Festivo): Promise<Festivo> {
  const { data } = await api.post<Festivo>("/tarifas/festivos", festivo);
  return data;
}

export async function eliminarFestivo(fecha: string): Promise<void> {
  await api.delete(`/tarifas/festivos/${fecha}`);
}

export async function precargarFestivos(anio: number): Promise<PrecargaFestivos> {
  const { data } = await api.post<PrecargaFestivos>(`/tarifas/festivos/precargar/${anio}`);
  return data;
}

export async function simularCobro(datos: SimulacionRequest): Promise<Simulacion> {
  const { data } = await api.post<Simulacion>("/tarifas/simular", datos);
  return data;
}
