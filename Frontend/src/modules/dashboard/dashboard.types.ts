export interface TransaccionReciente {
  id: string;
  placa: string;
  tipo: string;
  concepto: string;
  monto: number;
  metodoPago: string;
  fecha: string;
}

export interface Dashboard {
  vehiculosEnPatio: number;
  carrosEnPatio: number;
  motosEnPatio: number;
  ingresosHoy: number;
  clientesMensuales: number;
  tiempoPromedioMin: number | null;
  recientes: TransaccionReciente[];
}
