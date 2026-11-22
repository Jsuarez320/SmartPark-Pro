import type { ReciboApi, ReciboResumen, TipoRecibo } from "@/shared/types/recibo";

export type { ReciboApi, ReciboResumen, TipoRecibo };

/** Filtros del buscador. Todos son opcionales y se combinan. Fechas "YYYY-MM-DD" (hora de Colombia). */
export interface FiltrosRecibos {
  numero?: number;
  /** Placa o parte de ella. */
  placa?: string;
  tipo?: TipoRecibo;
  /** Desde este día, incluido. */
  desde?: string;
  /** Hasta este día, incluido. */
  hasta?: string;
  limit: number;
}

export interface Reimpresion {
  usuario: string;
  fecha: string;
}
