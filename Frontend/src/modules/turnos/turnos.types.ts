export interface TurnoActivo {
  id: number;
  operador: string;
  apertura: string;
  totalParcial: number;
}

export interface AbrirTurnoDTO {
  operadorId: number;
}

export interface CerrarTurnoDTO {
  turnoId: number;
}
