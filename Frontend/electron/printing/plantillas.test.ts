import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ejemploCierre, ejemploIngreso, ejemploMensualidad, ejemploPago } from "./ejemplos.js";
import {
  COLUMNAS,
  formatearCOP,
  formatearDia,
  formatearDuracion,
  labelValue,
  tableRow,
  twoColumns,
  wrapCentered,
} from "./formato.js";
import { componerTicket, numeroRecibo } from "./plantillas.js";
import { CONFIG_POR_DEFECTO } from "./printerConfig.js";
import { columnasDe, construirTicket } from "./ticketBuilder.js";
import type { ContenidoCierre, ContenidoPago, PrinterConfig, ReciboGuardado } from "./types.js";
import { validarRecibo } from "./validarRecibo.js";

const config: PrinterConfig = {
  ...structuredClone(CONFIG_POR_DEFECTO),
  encabezado: {
    nombre: "PARQUEADERO SMART PARK",
    nit: "900.123.456-7",
    horario: "LUNES A VIERNES 6 AM A 8 PM\nSÁBADOS 7 AM A 2 PM",
    direccion: "CL 12 # 1 - 62 LA PLAYA",
    telefono: "320 436 8215",
    resolucionDian: "Resolución DIAN 18764000001234 del 2026/01/15 prefijo SP del 1 al 50000",
  },
};

const textos = (r: ReciboGuardado, c = config) => componerTicket(r, c).map((l) => l.texto);
const unido = (r: ReciboGuardado, c = config) => textos(r, c).join("\n");

/** Cada tipo de recibo, con datos normales. */
const EJEMPLOS: [string, ReciboGuardado][] = [
  ["ingreso", ejemploIngreso()],
  ["pago", ejemploPago()],
  ["mensualidad", ejemploMensualidad()],
  ["cierre de caja", ejemploCierre()],
];

/** Mismos recibos con datos exagerados para forzar saltos de línea y cifras de 9 dígitos. */
function extremos(): [string, ReciboGuardado][] {
  const largo = "NOMBRE MUY LARGO ".repeat(8);
  const ingreso = ejemploIngreso();
  const pago = ejemploPago();
  const mens = ejemploMensualidad();
  const cierre = ejemploCierre();
  if (ingreso.tipo !== "ingreso" || pago.tipo !== "pago" || mens.tipo !== "mensualidad" || cierre.tipo !== "cierre_caja") {
    throw new Error("ejemplos inválidos");
  }
  const periodo = pago.contenido.periodos[0];
  return [
    ["ingreso", { ...ingreso, numero: 999_999_999, contenido: { ...ingreso.contenido, operador: largo, aviso: largo, placa: "ABC123XYZ789" } }],
    [
      "pago",
      {
        ...pago,
        numero: 999_999_999,
        contenido: {
          ...pago.contenido,
          operador: largo,
          referencia: largo,
          total: 999_999_999,
          minutosTotales: 5_000_000,
          periodos: [
            { ...periodo, topeAplicado: true, total: 999_999_999, tramos: [
              { tipo: "normal", horas: 99_999, valorHora: 9_999_999, subtotal: 999_999_999 },
              { tipo: "nocturna", horas: 99_999, valorHora: 9_999_999, subtotal: 999_999_999 },
              { tipo: "festivo", horas: 99_999, valorHora: 9_999_999, subtotal: 999_999_999 },
            ] },
            periodo,
          ],
        },
      },
    ],
    ["mensualidad", { ...mens, numero: 999_999_999, contenido: { ...mens.contenido, cliente: largo, valor: 999_999_999, referencia: largo, esRenovacion: true } }],
    [
      "cierre de caja",
      {
        ...cierre,
        numero: 999_999_999,
        contenido: {
          ...cierre.contenido,
          abiertoPor: largo,
          cerradoPor: largo,
          notas: largo,
          efectivo: 999_999_999,
          totalRecaudado: 999_999_999,
          esperadoEfectivo: 999_999_999,
          diferenciaEfectivo: -999_999_999,
          movimientos: Array.from({ length: 150 }, (_, n) => ({
            id: String(n), fecha: new Date(2026, 10, 22, 9, n % 60).toISOString(), operacion: n % 2 ? ("horas" as const) : ("mensualidad" as const),
            concepto: "x", placa: n % 3 ? "ABC123XYZ789" : null, medio: n % 2 ? ("efectivo" as const) : ("transferencia" as const), monto: 999_999_999,
          })),
        },
      },
    ],
  ];
}

describe("anchos: ninguna línea supera 48 columnas (24 en doble ancho)", () => {
  for (const [nombre, recibo] of [...EJEMPLOS, ...extremos().map(([n, r]) => [`${n} (datos extremos)`, r] as [string, ReciboGuardado])]) {
    it(nombre, () => {
      for (const l of componerTicket(recibo, config)) {
        assert.ok(l.texto.length <= columnasDe(l), `Línea de ${l.texto.length} col. (máx. ${columnasDe(l)}, modo ${l.modo}): "${l.texto}"`);
      }
    });
  }
});

describe("COPIA", () => {
  for (const [nombre, recibo] of EJEMPLOS) {
    it(`${nombre}: el original no dice COPIA`, () => {
      assert.ok(!unido(recibo).includes("COPIA"));
    });
    it(`${nombre}: tras una reimpresión dice COPIA al inicio y al final, con el número de copia`, () => {
      const copia = { ...recibo, reimpresiones: 3 } as ReciboGuardado;
      const lineas = textos(copia);
      const marcas = lineas.filter((t) => t.includes("*** COPIA 3 ***"));
      assert.equal(marcas.length, 2);
      assert.ok(lineas.findIndex((t) => t.includes("COPIA")) < lineas.findIndex((t) => t.includes("Recibo No.")));
      assert.ok(lineas.lastIndexOf(marcas[1]) > lineas.findIndex((t) => t.includes("Recibo No.")));
    });
  }
  it("la copia es idéntica al original salvo las marcas de COPIA", () => {
    for (const [, recibo] of EJEMPLOS) {
      const sinMarca = (r: ReciboGuardado) => textos(r).filter((t) => !t.includes("COPIA"));
      const original = sinMarca(recibo);
      const copia = sinMarca({ ...recibo, reimpresiones: 2 } as ReciboGuardado);
      // la copia agrega solo líneas en blanco de separación antes de la marca final
      assert.deepEqual(copia.filter((t) => t.trim() !== ""), original.filter((t) => t.trim() !== ""));
    }
  });
});

describe("recibo de ingreso", () => {
  const r = ejemploIngreso();

  it("muestra el tiquete en grande: es el número del recibo", () => {
    const grande = componerTicket(r, config).find((l) => l.modo === "grande");
    assert.equal(grande?.texto, "000123");
    assert.equal(grande?.centrado, true);
    assert.equal(numeroRecibo(123), "000123");
  });

  it("muestra placa, tipo, cajero y las tarifas con las que se cobrará", () => {
    const t = unido(r);
    assert.match(t, /RECIBO DE ENTRADA/);
    assert.match(t, /XZO75/);
    assert.match(t, /MOTO/);
    assert.match(t, /Cajero\s+: ANA PÉREZ/);
    assert.match(t, /Hora\s+: \$4\.000/);
    assert.match(t, /Dom\/festivo\s+: \$5\.000/);
    assert.match(t, /Nocturna\s+: \$3\.500/);
    assert.match(t, /Máximo día\s+: \$25\.000/);
    assert.match(t, /Gracia\s+: 5 min/);
    assert.match(t, /Conserve este recibo/);
  });

  it("sin tarifa nocturna activa no la imprime", () => {
    if (r.tipo !== "ingreso" || !r.contenido.tarifa) throw new Error("ejemplo");
    const t = unido({ ...r, contenido: { ...r.contenido, tarifa: { ...r.contenido.tarifa, nocturnaActiva: false, valorHoraNocturna: null } } });
    assert.ok(!t.includes("Nocturna"));
  });

  it("de una mensualidad: muestra el cliente, la jornada y el vencimiento y no las tarifas", () => {
    if (r.tipo !== "ingreso") throw new Error("ejemplo");
    const t = unido({
      ...r,
      contenido: { ...r.contenido, esMensualidad: true, tarifa: null, mensualidad: { jornada: "tarde", fechaFin: "2026-12-22", cliente: "Ana Gómez" } },
    });
    assert.match(t, /MENSUALIDAD/);
    assert.match(t, /Cliente\s+: Ana Gómez/);
    assert.match(t, /Jornada\s+: Tarde/);
    assert.match(t, /Vence\s+: 22\/12\/2026/);
    assert.ok(!t.includes("TARIFAS"));
    assert.ok(!t.includes("Conserve este recibo"));
  });

  it("imprime el aviso (mensualidad vencida o fuera de jornada)", () => {
    if (r.tipo !== "ingreso") throw new Error("ejemplo");
    const t = unido({ ...r, contenido: { ...r.contenido, aviso: "La mensualidad venció el 2026-11-01: se cobra por horas." } });
    assert.match(t, /La mensualidad venció/);
  });
});

describe("recibo de pago", () => {
  const r = ejemploPago();
  const c = (r as { contenido: ContenidoPago }).contenido;

  it("muestra el tiquete de entrada, los tiempos, el detalle y el total en grande", () => {
    const lineas = componerTicket(r, config);
    const t = lineas.map((l) => l.texto).join("\n");
    assert.match(t, /RECIBO DE PAGO/);
    assert.match(t, /Tiquete No\s*: 000123/);
    assert.match(t, /Tiempo\s+: 1h 50min/);
    assert.match(t, /Horas\s+: 2/);
    assert.match(t, /2 h Hora x \$4\.000\s+\$8\.000/);
    assert.match(t, /Pago\s+: Efectivo/);
    const total = lineas.find((l) => l.modo === "grande" && l.texto.startsWith("TOTAL"));
    assert.ok(total && total.texto.endsWith("$8.000") && total.texto.length === 24);
  });

  it("incluye la resolución DIAN solo en el recibo de pago", () => {
    assert.match(unido(r), /Resolución DIAN/);
    assert.ok(!unido(ejemploIngreso()).includes("Resolución DIAN"));
  });

  it("varios días: numera los periodos y marca el tope diario", () => {
    const p = c.periodos[0];
    const t = unido({
      ...r,
      contenido: { ...c, periodos: [{ ...p, topeAplicado: true, total: 25000 }, { ...p, total: 4000 }], total: 29000 },
    } as ReciboGuardado);
    assert.match(t, /Día 1/);
    assert.match(t, /Día 2/);
    assert.match(t, /Tope del día aplicado\s+\$25\.000/);
  });

  it("muestra las tarifas por tramo (nocturna y dom/fest)", () => {
    const p = c.periodos[0];
    const t = unido({
      ...r,
      contenido: {
        ...c,
        periodos: [{ ...p, tramos: [
          { tipo: "normal", horas: 1, valorHora: 4000, subtotal: 4000 },
          { tipo: "nocturna", horas: 2, valorHora: 3500, subtotal: 7000 },
          { tipo: "festivo", horas: 1, valorHora: 5000, subtotal: 5000 },
        ] }],
      },
    } as ReciboGuardado);
    assert.match(t, /1 h Hora x \$4\.000/);
    assert.match(t, /2 h Hora nocturna x \$3\.500\s+\$7\.000/);
    assert.match(t, /1 h Hora dom\/fest x \$5\.000/);
  });

  it("transferencia con referencia", () => {
    const t = unido({ ...r, contenido: { ...c, medioPago: "transferencia", referencia: "NEQ-123" } } as ReciboGuardado);
    assert.match(t, /Pago\s+: Transferencia/);
    assert.match(t, /Referencia\s*: NEQ-123/);
  });

  it("salida sin cobro por gracia o por mensualidad", () => {
    const gracia = unido({ ...r, contenido: { ...c, total: 0, horasCobradas: 0, periodos: [], medioPago: null, minutosTotales: 3 } } as ReciboGuardado);
    assert.match(gracia, /Dentro del tiempo de gracia/);
    assert.match(gracia, /TOTAL\s+\$0/);
    const mens = unido({ ...r, contenido: { ...c, esMensualidad: true, total: 0, periodos: [], medioPago: null } } as ReciboGuardado);
    assert.match(mens, /MENSUALIDAD VIGENTE/);
    assert.ok(!mens.includes("DETALLE DEL COBRO"));
  });
});

describe("recibo de mensualidad", () => {
  const r = ejemploMensualidad();

  it("muestra cliente, placas, tarjeta, periodo, vigencia, pago y total", () => {
    const t = unido(r);
    assert.match(t, /RECIBO DE MENSUALIDAD/);
    assert.match(t, /Cliente\s+: María Fernanda Gómez/);
    assert.match(t, /Celular\s+: 300 123 4567/);
    assert.match(t, /Placa\s+: ABC123/);
    assert.match(t, /Placa alt\.\s*: XYZ987/);
    assert.match(t, /Tarjeta\s+: T-0001/);
    assert.match(t, /Periodo\s+: 1 mes/);
    assert.match(t, /Jornada\s+: Completa/);
    assert.match(t, /Desde\s+: 23\/11\/2026/);
    assert.match(t, /Hasta\s+: 22\/12\/2026/);
    assert.match(t, /Pago\s+: Transferencia/);
    assert.match(t, /Referencia\s*: NEQ-123456/);
    assert.match(t, /TOTAL\s+\$160\.000/);
  });

  it("una renovación lo dice en el título", () => {
    if (r.tipo !== "mensualidad") throw new Error("ejemplo");
    assert.match(unido({ ...r, contenido: { ...r.contenido, esRenovacion: true } }), /RENOVACIÓN DE MENSUALIDAD/);
  });

  it("omite lo opcional vacío (celular, alterna, tarjeta)", () => {
    if (r.tipo !== "mensualidad") throw new Error("ejemplo");
    const t = unido({ ...r, contenido: { ...r.contenido, celular: null, placaAlterna: null, tarjeta: null, referencia: null } });
    for (const campo of ["Celular", "Placa alt.", "Tarjeta", "Referencia"]) assert.ok(!t.includes(campo), campo);
  });
});

describe("cierre de caja", () => {
  const r = ejemploCierre();
  const c = (r as { contenido: ContenidoCierre }).contenido;

  it("muestra bases, cobrado por medio, esperado, contado y diferencia", () => {
    const t = unido(r);
    assert.match(t, /CIERRE DE CAJA/);
    assert.match(t, /Abrió\s+: ANA PÉREZ/);
    assert.match(t, /Efectivo\s+\$50\.000/);
    assert.match(t, /Transferencias\s+\$20\.000/);
    assert.match(t, /Efectivo \(2 mov\.\)\s+\$16\.000/);
    assert.match(t, /Transferencia \(1 mov\.\)\s+\$160\.000/);
    assert.match(t, /TOTAL \(3 movimientos\)\s+\$176\.000/);
    assert.match(t, /Esperado \(base \+ cobrado\)\s+\$66\.000/);
    assert.match(t, /Contado\s+\$65\.500/);
    assert.match(t, /FALTANTE\s+\$500/);
    assert.match(t, /Transferencias esperadas\s+\$180\.000/);
  });

  it("detalla cada movimiento con hora, placa, operación y medio", () => {
    const filas = textos(r).filter((t) => /(Horas|Mens\.) (Ef\.|Tr\.)/.test(t));
    assert.equal(filas.length, 3);
    assert.ok(filas.some((f) => f.includes("XZO75 Horas Ef.") && f.endsWith("$8.000")));
    assert.ok(filas.some((f) => f.includes("ABC123 Mens. Tr.") && f.endsWith("$160.000")));
  });

  it("distingue SOBRANTE, FALTANTE y CUADRADO", () => {
    const con = (dif: number) => unido({ ...r, contenido: { ...c, efectivoContado: c.esperadoEfectivo + dif, diferenciaEfectivo: dif } } as ReciboGuardado);
    assert.match(con(1500), /SOBRANTE\s+\$1\.500/);
    assert.match(con(-500), /FALTANTE\s+\$500/);
    assert.match(con(0), /CUADRADO\s+\$0/);
  });

  it("imprime las notas y el renglón de firma", () => {
    const t = unido(r);
    assert.match(t, /Notas:/);
    assert.match(t, /Faltaron 500 pesos/);
    assert.match(t, /Firma de quien cierra/);
  });

  it("sin movimientos no imprime el detalle", () => {
    assert.ok(!unido({ ...r, contenido: { ...c, movimientos: [] } } as ReciboGuardado).includes("DETALLE DE MOVIMIENTOS"));
  });
});

describe("encabezado y pie configurables", () => {
  it("omite las líneas vacías del encabezado y del pie", () => {
    const vacio: PrinterConfig = {
      ...config,
      encabezado: { nombre: "", nit: "", horario: "", direccion: "", telefono: "", resolucionDian: "" },
      piePagina: "",
    };
    for (const [, recibo] of EJEMPLOS) {
      const t = unido(recibo, vacio);
      assert.ok(!t.includes("NIT"));
      assert.ok(!t.includes("PARQUEADERO SMART PARK"));
    }
  });

  it("el nombre va en negrita y el pie centrado por palabras", () => {
    const lineas = componerTicket(ejemploPago(), config);
    assert.equal(lineas.find((l) => l.texto === "PARQUEADERO SMART PARK")?.negrita, true);
    const pie = lineas.filter((l) => l.centrado).map((l) => l.texto);
    assert.ok(pie.includes("NO SE RESPONDE POR CASCOS U OBJETOS DEJADOS EN"));
    assert.ok(pie.includes("EL VEHÍCULO"));
  });
});

describe("buffer ESC/POS", () => {
  it("cada tipo genera bytes que empiezan con el reinicio y terminan con corte parcial", () => {
    const inicio = Buffer.from([0x1b, 0x40, 0x1b, 0x4d, 0x00, 0x1d, 0x4c, 0x00, 0x00, 0x1d, 0x57, 0x40, 0x02]);
    for (const [nombre, recibo] of EJEMPLOS) {
      const buf = construirTicket(recibo, config);
      assert.ok(buf.subarray(0, inicio.length).equals(inicio), nombre);
      assert.ok(buf.subarray(-4).equals(Buffer.from([0x1d, 0x56, 0x42, 0x00])), nombre);
    }
  });

  it("restablece negrita y tamaño en cada línea y no usa imágenes", () => {
    for (const [, recibo] of EJEMPLOS) {
      const buf = construirTicket(recibo, config);
      const lineas = componerTicket(recibo, config).length;
      const cuenta = (patron: number[]) => {
        let n = 0;
        for (let i = 0; i <= buf.length - patron.length; i++) if (patron.every((v, j) => buf[i + j] === v)) n++;
        return n;
      };
      assert.ok(cuenta([0x1b, 0x45, 0x00]) >= lineas);
      assert.ok(cuenta([0x1d, 0x21, 0x00]) >= lineas);
      assert.ok(!buf.includes(Buffer.from([0x1d, 0x76, 0x30])));
    }
  });

  it("los datos extremos no rompen la generación", () => {
    for (const [, recibo] of extremos()) assert.ok(construirTicket(recibo, config).length > 100);
  });

  it("abre el cajón solo si está configurado", () => {
    const sin = construirTicket(ejemploPago(), { ...config, abrirCajon: false });
    const con = construirTicket(ejemploPago(), { ...config, abrirCajon: true });
    assert.ok(con.length > sin.length);
  });
});

describe("validación del recibo recibido por IPC", () => {
  const valido = () => JSON.parse(JSON.stringify(ejemploPago()));

  it("acepta los ejemplos de los cuatro tipos (JSON ida y vuelta, como llega del renderer)", () => {
    for (const [, r] of EJEMPLOS) assert.doesNotThrow(() => validarRecibo(JSON.parse(JSON.stringify(r))));
  });

  it("acepta campos extra (el backend puede agregar claves) y los descarta", () => {
    const r = valido();
    r.contenido.campoNuevo = "x";
    r.id = "abc";
    const v = validarRecibo(r);
    assert.ok(!("campoNuevo" in v.contenido));
  });

  const rechazos: [string, (r: any) => void, RegExp][] = [
    ["no es un objeto", (r) => Object.keys(r).forEach((k) => delete r[k]), /numero/],
    ["tipo desconocido", (r) => (r.tipo = "factura"), /tipo/],
    ["número negativo", (r) => (r.numero = -1), /numero/],
    ["número decimal", (r) => (r.numero = 1.5), /numero/],
    ["reimpresiones negativas", (r) => (r.reimpresiones = -1), /reimpresiones/],
    ["sin contenido", (r) => delete r.contenido, /contenido/],
    ["fecha inválida", (r) => (r.contenido.horaEntrada = "ayer"), /horaEntrada/],
    ["total como texto", (r) => (r.contenido.total = "8000"), /total/],
    ["total negativo", (r) => (r.contenido.total = -1), /total/],
    ["placa vacía", (r) => (r.contenido.placa = "  "), /placa/],
    ["placa demasiado larga", (r) => (r.contenido.placa = "A".repeat(40)), /placa/],
    ["vehículo inválido", (r) => (r.contenido.tipoVehiculo = "bus"), /tipoVehiculo/],
    ["periodos no es lista", (r) => (r.contenido.periodos = "x"), /periodos/],
    ["tramo inválido", (r) => (r.contenido.periodos[0].tramos[0].tipo = "otro"), /tipo/],
    ["demasiados periodos", (r) => (r.contenido.periodos = Array(101).fill(r.contenido.periodos[0])), /periodos/],
  ];
  for (const [nombre, mutar, patron] of rechazos) {
    it(`rechaza: ${nombre}`, () => {
      const r = valido();
      mutar(r);
      assert.throws(() => validarRecibo(r), patron);
    });
  }

  it("rechaza lo que no es un objeto", () => {
    for (const x of [null, undefined, 5, "recibo", []]) assert.throws(() => validarRecibo(x), /recibo/);
  });

  it("rechaza demasiados movimientos en un cierre", () => {
    const r = JSON.parse(JSON.stringify(ejemploCierre()));
    r.contenido.movimientos = Array(1001).fill(r.contenido.movimientos[0]);
    assert.throws(() => validarRecibo(r), /movimientos/);
  });

  it("rechaza medios de pago inválidos en un movimiento", () => {
    const r = JSON.parse(JSON.stringify(ejemploCierre()));
    r.contenido.movimientos[0].medio = "nequi";
    assert.throws(() => validarRecibo(r), /medio/);
  });
});

describe("utilitarios de formato", () => {
  it("formatea pesos colombianos", () => {
    assert.equal(formatearCOP(1600), "$1.600");
    assert.equal(formatearCOP(0), "$0");
    assert.equal(formatearCOP(1234567), "$1.234.567");
  });

  it("formatea fechas de calendario sin desfase de zona horaria", () => {
    assert.equal(formatearDia("2026-12-22"), "22/12/2026");
    assert.equal(formatearDia("2026-01-01"), "01/01/2026");
  });

  it("formatea duraciones", () => {
    assert.equal(formatearDuracion(110), "1h 50min");
    assert.equal(formatearDuracion(45), "45min");
    assert.equal(formatearDuracion(60), "1h 00min");
    assert.equal(formatearDuracion(0), "0min");
  });

  it("wrapCentered no corta palabras salvo que superen el ancho", () => {
    assert.deepEqual(wrapCentered("UNO DOS TRES", 7), ["UNO DOS", "TRES"]);
    assert.deepEqual(wrapCentered("ABCDEFGHIJ", 4), ["ABCD", "EFGH", "IJ"]);
  });

  it("twoColumns y labelValue respetan el ancho; la tabla mide 48", () => {
    assert.equal(twoColumns("A", "B", 10)[0], "A        B");
    for (const l of twoColumns("IZQUIERDA LARGA", "DERECHA LARGA", 20)) assert.ok(l.length <= 20);
    assert.equal(labelValue("Entrada", "19/11/2026", 48)[0], "Entrada   : 19/11/2026");
    assert.equal(tableRow(["CANT.", "V. UNIT", "IVA", "TOTAL"]).length, COLUMNAS);
  });
});
