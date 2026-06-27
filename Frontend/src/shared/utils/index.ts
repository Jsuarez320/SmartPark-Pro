import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatCurrencyCOP } from "./formatters";
export { tiposVehiculo, type TipoVehiculo } from "./vehiculo.utils";
