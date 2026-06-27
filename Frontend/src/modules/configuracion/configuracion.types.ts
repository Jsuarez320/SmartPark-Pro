export interface TarifaEntry {
  label: string;
  value: string;
}

export interface Tarifas {
  moto: TarifaEntry[];
  carro: TarifaEntry[];
}

export interface ConfiguracionEstado {
  editando: boolean;
  tarifas: Tarifas;
  eventoActivo: boolean;
}
