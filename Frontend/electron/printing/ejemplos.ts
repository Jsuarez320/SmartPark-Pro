import type { ReciboGuardado, TarifaSnapshot } from "./types.js";

/**
 * Recibos de ejemplo con la misma forma que devuelve el backend. Sirven para la prueba de la
 * impresora (Configuración) y para los tests de las plantillas. No tienen valor fiscal.
 */

const TARIFA: TarifaSnapshot = {
  versionId: 1,
  valorHora: 4000,
  valorDia: 25000,
  valorHoraFestivo: 5000,
  valorDiaFestivo: 30000,
  nocturnaActiva: true,
  valorHoraNocturna: 3500,
  graciaMinutos: 5,
};

function hace(minutos: number, base = new Date()): string {
  return new Date(base.getTime() - minutos * 60_000).toISOString();
}

export function ejemploIngreso(): ReciboGuardado {
  return {
    tipo: "ingreso",
    numero: 123,
    creadoEn: hace(0),
    reimpresiones: 0,
    placa: "XZO75",
    contenido: {
      tipo: "ingreso",
      placa: "XZO75",
      tipoVehiculo: "moto",
      horaEntrada: hace(0),
      operador: "ANA PÉREZ",
      esMensualidad: false,
      mensualidad: null,
      tarifa: TARIFA,
      aviso: null,
    },
  };
}

export function ejemploPago(): ReciboGuardado {
  return {
    tipo: "pago",
    numero: 124,
    creadoEn: hace(0),
    reimpresiones: 0,
    placa: "XZO75",
    contenido: {
      tipo: "pago",
      placa: "XZO75",
      tipoVehiculo: "moto",
      horaEntrada: hace(110),
      horaSalida: hace(0),
      tiquete: 123,
      operador: "ANA PÉREZ",
      esMensualidad: false,
      medioPago: "efectivo",
      referencia: null,
      total: 8000,
      minutosTotales: 110,
      minutosCobrados: 120,
      horasCobradas: 2,
      topeAplicado: false,
      periodos: [
        {
          inicio: hace(110),
          fin: hace(0),
          subtotal: 8000,
          tope: 25000,
          total: 8000,
          topeAplicado: false,
          tramos: [{ tipo: "normal", horas: 2, valorHora: 4000, subtotal: 8000 }],
        },
      ],
      tarifa: TARIFA,
    },
  };
}

export function ejemploMensualidad(): ReciboGuardado {
  return {
    tipo: "mensualidad",
    numero: 125,
    creadoEn: hace(0),
    reimpresiones: 0,
    placa: "ABC123",
    contenido: {
      tipo: "mensualidad",
      esRenovacion: false,
      placa: "ABC123",
      placaAlterna: "XYZ987",
      tipoVehiculo: "carro",
      cliente: "María Fernanda Gómez",
      celular: "300 123 4567",
      tarjeta: "T-0001",
      periodo: "1_mes",
      jornada: "completa",
      fechaInicio: "2026-11-23",
      fechaFin: "2026-12-22",
      valor: 160000,
      medioPago: "transferencia",
      referencia: "NEQ-123456",
      operador: "ANA PÉREZ",
      tarifaVersionId: 1,
    },
  };
}

export function ejemploCierre(): ReciboGuardado {
  return {
    tipo: "cierre_caja",
    numero: 126,
    creadoEn: hace(0),
    reimpresiones: 0,
    placa: null,
    contenido: {
      turnoId: "00000000-0000-0000-0000-000000000001",
      abiertoPor: "ANA PÉREZ",
      cerradoPor: "ANA PÉREZ",
      fechaApertura: hace(9 * 60 + 30),
      fechaCierre: hace(0),
      horasTurno: 9.5,
      baseEfectivo: 50000,
      baseTransferencia: 20000,
      efectivo: 16000,
      transferencia: 160000,
      totalRecaudado: 176000,
      movimientosEfectivo: 2,
      movimientosTransferencia: 1,
      totalTransacciones: 3,
      esperadoEfectivo: 66000,
      esperadoTransferencia: 180000,
      efectivoContado: 65500,
      diferenciaEfectivo: -500,
      notas: "Faltaron 500 pesos de una devuelta.",
      movimientos: [
        { id: "1", fecha: hace(300), operacion: "horas", concepto: "Cobro por horas", placa: "XZO75", medio: "efectivo", monto: 8000 },
        { id: "2", fecha: hace(120), operacion: "mensualidad", concepto: "Mensualidad", placa: "ABC123", medio: "transferencia", monto: 160000 },
        { id: "3", fecha: hace(30), operacion: "horas", concepto: "Cobro por horas", placa: "KLM456", medio: "efectivo", monto: 8000 },
      ],
    },
  };
}

/** Recibo con el que se prueba la impresora desde Configuración. */
export function reciboDePrueba(): ReciboGuardado {
  return ejemploPago();
}
