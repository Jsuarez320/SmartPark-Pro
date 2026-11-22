import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COLUMNAS, formatearCOP, labelValue, tableRow, twoColumns, wrapCentered } from "./formato.js";
import { CONFIG_POR_DEFECTO } from "./printerConfig.js";
import { reciboDePrueba } from "./printerService.js";
import { columnasDe, componerIngreso, componerRecibo, construirTicket } from "./ticketBuilder.js";
import type { IngresoData, PrinterConfig, ReciboData } from "./types.js";

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

/** Recibo con datos exagerados para forzar los saltos de línea. */
function reciboLargo(): ReciboData {
  return {
    ...reciboDePrueba(),
    numero: "SPFACTURA-0000000123456",
    cajero: "01 CAJERO CON UN NOMBRE EXTREMADAMENTE LARGO Y COMPLICADO",
    tiquete: "729360330190957-01-729360330190957-01-729360330190957",
    cedula: "1234567890123456",
    nombre: "MARÍA FERNANDA DE LOS ÁNGELES RODRÍGUEZ-HERNÁNDEZ DE LA OSSA",
    placa: "ABC123XYZ789",
    marca: "MERCEDES-BENZ AUTOMOTORES DE COLOMBIA",
    items: [
      { descripcion: "MENSUALIDAD PARQUEADERO CARRO PLAN CORPORATIVO EMPRESARIAL ANUAL PREPAGADO", cantidad: 12, valorUnitario: 1_234_567, iva: 234_567, total: 14_814_804 },
      { descripcion: "RECARGO", cantidad: 99_999, valorUnitario: 9_999_999, iva: 9_999_999, total: 999_999_999 },
      { descripcion: "SERVICIO", cantidad: 1, valorUnitario: 1_600, iva: 0, total: 1_600 },
      { descripcion: "OTRO", cantidad: 3, valorUnitario: 500, iva: 0, total: 1_500 },
    ],
    subtotal: 1_234_567_890,
    descuento: 1_234_567,
    total: 1_233_333_323,
  };
}

function verificarAnchos(r: ReciboData, c: PrinterConfig) {
  for (const l of componerRecibo(r, c)) {
    assert.ok(
      l.texto.length <= columnasDe(l),
      `Línea de ${l.texto.length} col. (máx. ${columnasDe(l)}, modo ${l.modo}): "${l.texto}"`,
    );
  }
}

describe("maqueta del recibo", () => {
  it("ninguna línea supera 48 columnas (24 en doble ancho): datos de ejemplo", () => {
    verificarAnchos(reciboDePrueba(), config);
  });

  it("ninguna línea supera el ancho con datos muy largos y cifras de 7+ dígitos", () => {
    verificarAnchos(reciboLargo(), config);
  });

  it("las filas de dos columnas miden exactamente 48 columnas", () => {
    const lineas = componerRecibo(reciboDePrueba(), config);
    const fila = lineas.find((l) => l.texto.startsWith("Entrada"));
    assert.equal(fila?.texto.length, COLUMNAS);
    assert.ok(fila?.texto.endsWith("Hora : 09:57"));
    const factura = lineas.find((l) => l.texto.startsWith("FACTURA DE VENTA"));
    assert.equal(factura?.texto.length, COLUMNAS);
    assert.ok(factura?.texto.endsWith("SP-000123"));
  });

  it("la tabla alinea a la derecha en las columnas 5, 20, 32 y 48", () => {
    const fila = tableRow(["1", "$1.600", "$0", "$1.600"]);
    assert.equal(fila.length, 48);
    assert.equal(fila.slice(0, 5), "    1");
    assert.equal(fila.slice(5, 20).trimStart(), "$1.600");
    assert.equal(fila.slice(5, 20).length, 15);
    assert.equal(fila.slice(20, 32), "          $0");
    assert.equal(fila.slice(32), "          $1.600");
    assert.equal(tableRow(["CANT.", "V. UNIT", "IVA", "TOTAL"]).length, 48);
  });

  it("los ítems son dinámicos: una descripción y una fila de números por concepto", () => {
    const r = reciboDePrueba();
    const lineas = componerRecibo(r, config).map((l) => l.texto);
    assert.ok(lineas.includes("SERVICIO PARQUEADERO"));
    assert.ok(lineas.includes("RECARGO"));
    const conMasItems = componerRecibo({ ...r, items: [...r.items, { descripcion: "MENSUALIDAD", cantidad: 1, valorUnitario: 90000, iva: 0, total: 90000 }] }, config);
    assert.ok(conMasItems.some((l) => l.texto === "MENSUALIDAD"));
  });

  it("sin cliente imprime 222222222222 / CONSUMIDOR FINAL", () => {
    const textos = componerRecibo({ ...reciboDePrueba(), cedula: undefined, nombre: "" }, config).map((l) => l.texto);
    assert.ok(textos.some((t) => t.startsWith("Cédula    : 222222222222")));
    assert.ok(textos.some((t) => t.startsWith("Nombre    : CONSUMIDOR FINAL")));
  });

  it("omite las líneas opcionales vacías (marca, cajero, encabezado)", () => {
    const vacio: PrinterConfig = {
      ...config,
      encabezado: { nombre: "", nit: "", horario: "", direccion: "", telefono: "", resolucionDian: "" },
      piePagina: "",
    };
    const textos = componerRecibo({ ...reciboDePrueba(), marca: undefined, cajero: undefined }, vacio).map((l) => l.texto);
    assert.ok(!textos.some((t) => t.startsWith("Marca")));
    assert.ok(!textos.some((t) => t.startsWith("Cajero")));
    assert.ok(!textos.some((t) => t.startsWith("NIT")));
  });

  it("TOTAL va en doble ancho + doble alto y el pie centrado por palabras", () => {
    const lineas = componerRecibo(reciboDePrueba(), config);
    const total = lineas.find((l) => l.modo === "grande");
    assert.equal(total?.texto.length, 24);
    assert.ok(total?.texto.startsWith("TOTAL") && total.texto.endsWith("$3.200"));
    const pie = lineas.filter((l) => l.centrado).map((l) => l.texto);
    assert.ok(pie.includes("NO SE RESPONDE POR CASCOS U OBJETOS DEJADOS EN"));
    assert.ok(pie.includes("EL VEHÍCULO"));
    // Un salto de línea explícito en la configuración se respeta (como en la maqueta).
    const manual = componerRecibo(reciboDePrueba(), {
      ...config,
      piePagina: "NO SE RESPONDE POR CASCOS U OBJETOS\nDEJADOS EN EL VEHÍCULO",
    }).filter((l) => l.centrado).map((l) => l.texto);
    assert.ok(manual.includes("DEJADOS EN EL VEHÍCULO"));
  });
});

describe("negrita solo en elementos clave", () => {
  const lineas = componerRecibo(reciboDePrueba(), config);
  const de = (prefijo: string) => lineas.find((l) => l.texto.trimStart().startsWith(prefijo));

  it("van en negrita: nombre, factura, sistema, encabezado de tabla, subtotales y total", () => {
    for (const p of ["PARQUEADERO SMART PARK", "FACTURA DE VENTA", "SISTEMA POS", "CANT.", "SUBTOTAL", "DESCUENTO", "TOTAL"]) {
      assert.equal(de(p)?.negrita, true, p);
    }
  });

  it("van normales: datos del negocio, pares, ítems y pie", () => {
    for (const p of ["NIT", "LUNES", "CL 12", "320", "Cajero", "Tiquete", "Entrada", "Salida", "Cédula", "Nombre", "Tipo Veh.", "Marca", "SERVICIO PARQUEADERO", "RECARGO", "NO SE RESPONDE", "-----"]) {
      assert.ok(!de(p)?.negrita, p);
    }
    const fila = lineas.find((l) => /^\s+1\s+\$1\.600/.test(l.texto));
    assert.ok(fila && !fila.negrita, "números del ítem");
  });

  it("cada línea restablece ESC E 0 y GS ! 0 al terminar", async () => {
    const buf = await construirTicket(reciboDePrueba(), config);
    const cuenta = (patron: number[]) => {
      let n = 0;
      for (let i = 0; i <= buf.length - patron.length; i++) if (patron.every((v, j) => buf[i + j] === v)) n++;
      return n;
    };
    assert.ok(cuenta([0x1b, 0x45, 0x00]) >= lineas.length, "ESC E 0 por línea");
    assert.ok(cuenta([0x1d, 0x21, 0x00]) >= lineas.length, "GS ! 0 por línea");
  });
});

describe("utilitarios", () => {
  it("formatea pesos colombianos", () => {
    assert.equal(formatearCOP(1600), "$1.600");
    assert.equal(formatearCOP(0), "$0");
    assert.equal(formatearCOP(1234567), "$1.234.567");
  });

  it("wrapCentered no corta palabras salvo que superen el ancho", () => {
    assert.deepEqual(wrapCentered("UNO DOS TRES", 7), ["UNO DOS", "TRES"]);
    assert.deepEqual(wrapCentered("ABCDEFGHIJ", 4), ["ABCD", "EFGH", "IJ"]);
  });

  it("twoColumns y labelValue respetan el ancho", () => {
    assert.equal(twoColumns("A", "B", 10)[0], "A        B");
    for (const l of twoColumns("IZQUIERDA LARGA", "DERECHA LARGA", 20)) assert.ok(l.length <= 20);
    assert.equal(labelValue("Entrada", "19/11/2026", 48)[0], "Entrada   : 19/11/2026");
  });
});

describe("buffer ESC/POS", () => {
  it("empieza con ESC @, ESC M 0, GS L 0 0 y GS W 576; termina con corte parcial", async () => {
    const buf = await construirTicket(reciboDePrueba(), config);
    const inicio = Buffer.from([0x1b, 0x40, 0x1b, 0x4d, 0x00, 0x1d, 0x4c, 0x00, 0x00, 0x1d, 0x57, 0x40, 0x02]);
    assert.ok(buf.subarray(0, inicio.length).equals(inicio));
    assert.ok(buf.includes(Buffer.from([0x1b, 0x45, 0x01])), "negrita ESC E 1");
    assert.ok(buf.includes(Buffer.from([0x1b, 0x45, 0x00])), "negrita ESC E 0");
    assert.ok(buf.includes(Buffer.from([0x1d, 0x21, 0x01])), "GS ! 0x01");
    assert.ok(buf.includes(Buffer.from([0x1d, 0x21, 0x11])), "GS ! 0x11");
    assert.ok(buf.subarray(-4).equals(Buffer.from([0x1d, 0x56, 0x42, 0x00])));
  });

  it("no usa imágenes", async () => {
    const buf = await construirTicket(reciboLargo(), config);
    assert.ok(!buf.includes(Buffer.from([0x1d, 0x76, 0x30])));
    assert.ok(!buf.includes(Buffer.from([0x1b, 0x2a])));
  });
});

describe("recibo de entrada (diarios)", () => {
  const ingreso: IngresoData = {
    tiquete: "D-000123",
    horaEntrada: new Date(2026, 10, 22, 9, 57).toISOString(),
    tipoVehiculo: "moto",
    placa: "XZO75",
    marca: "HONDA",
    plan: "Bloque 15 min",
    tarifa: 1600,
  };

  it("ninguna línea supera el ancho, ni con datos muy largos", () => {
    for (const r of [ingreso, { ...ingreso, tiquete: "D-" + "9".repeat(30), plan: "PLAN ".repeat(12), marca: "M".repeat(30) }]) {
      for (const l of componerIngreso(r, config)) {
        assert.ok(l.texto.length <= columnasDe(l), `Línea de ${l.texto.length} col.: "${l.texto}"`);
      }
    }
  });

  it("muestra tiquete, placa y tarifa", () => {
    const texto = componerIngreso(ingreso, config).map((l) => l.texto).join("\n");
    assert.match(texto, /D-000123/);
    assert.match(texto, /XZO75/);
    assert.match(texto, /\$1\.600/);
  });
});
