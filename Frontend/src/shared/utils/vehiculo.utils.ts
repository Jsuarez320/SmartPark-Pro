export const tiposVehiculo = ["automovil", "moto", "electrico", "pmr"] as const;

export type TipoVehiculo = (typeof tiposVehiculo)[number];
