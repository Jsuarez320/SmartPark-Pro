import fs from "node:fs";
import path from "node:path";
import { crearConstructor } from "./ticketBuilder.js";
import type { PrinterConfig } from "./types.js";

const NOMBRE_ARCHIVO = "printer-config.json";
/** Mismo patrón que valida el provider USB: previene inyección de comandos. */
export const CONFIG_POR_DEFECTO: PrinterConfig = {
  // 'dump' es el modo seguro: no manda nada a ninguna impresora hasta que se elija 'usb'.
  modo: "dump",
  impresora: "", // se elige en Configuración > Impresora; nunca hardcodeada
  characterSet: "PC858_EURO",
  abrirCajon: false,
  encabezado: {
    nombre: "PARQUEADERO SMART PARK",
    nit: "",
    horario: "",
    direccion: "",
    telefono: "",
    resolucionDian: "",
  },
  piePagina: "NO SE RESPONDE POR CASCOS U OBJETOS DEJADOS EN EL VEHÍCULO",
};

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function texto(v: unknown, campo: string, max: number, obligatorio = false): string {
  if (typeof v !== "string") throw new Error(`"${campo}" debe ser texto.`);
  if (v.length > max) throw new Error(`"${campo}" supera ${max} caracteres.`);
  if (obligatorio && v.trim() === "") throw new Error(`"${campo}" es obligatorio.`);
  return v;
}

/**
 * Valida una config completa (estricto: lanza Error con mensaje en español).
 * Se usa tanto al leer del disco como al recibir `printer:set-config`.
 */
export function validarConfig(raw: unknown): PrinterConfig {
  if (!esObjeto(raw)) throw new Error("La configuración debe ser un objeto.");
  const { modo, impresora, characterSet, abrirCajon, encabezado, piePagina } = raw;

  if (modo !== "usb" && modo !== "dump") throw new Error('"modo" debe ser "usb" o "dump".');
  if (typeof impresora !== "string" || impresora.length > 128 || /[\x00-\x1F\x7F]/.test(impresora)) {
    throw new Error('"impresora" debe ser un nombre de hasta 128 caracteres, sin caracteres de control.');
  }
  if (modo === "usb" && impresora.trim() === "") {
    throw new Error("Selecciona una impresora para el modo USB.");
  }
  const cs = texto(characterSet, "characterSet", 40, true);
  try {
    crearConstructor(cs); // la librería lanza si la página de códigos no existe para EPSON
  } catch {
    throw new Error(`Juego de caracteres no soportado: "${cs}".`);
  }
  if (typeof abrirCajon !== "boolean") throw new Error('"abrirCajon" debe ser verdadero o falso.');
  if (!esObjeto(encabezado)) throw new Error('"encabezado" debe ser un objeto.');

  return {
    modo,
    impresora,
    characterSet: cs,
    abrirCajon,
    encabezado: {
      nombre: texto(encabezado.nombre, "encabezado.nombre", 48, true),
      nit: texto(encabezado.nit, "encabezado.nit", 48),
      horario: texto(encabezado.horario, "encabezado.horario", 200),
      direccion: texto(encabezado.direccion, "encabezado.direccion", 96),
      telefono: texto(encabezado.telefono, "encabezado.telefono", 48),
      resolucionDian: texto(encabezado.resolucionDian, "encabezado.resolucionDian", 300),
    },
    piePagina: texto(piePagina, "piePagina", 300),
  };
}

/** Mezcla por campos para tolerar JSON de versiones anteriores a los que les falte alguna clave. */
function conDefectos(raw: unknown): unknown {
  if (!esObjeto(raw)) return raw;
  return {
    ...CONFIG_POR_DEFECTO,
    ...raw,
    encabezado: {
      ...CONFIG_POR_DEFECTO.encabezado,
      ...(esObjeto(raw.encabezado) ? raw.encabezado : {}),
    },
  };
}

function rutaConfig(dir: string): string {
  return path.join(dir, NOMBRE_ARCHIVO);
}

/** `dir` = app.getPath('userData'); se inyecta para poder probar sin Electron. */
export function leerConfig(dir: string): PrinterConfig {
  let contenido: string;
  try {
    contenido = fs.readFileSync(rutaConfig(dir), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("[printing] No se pudo leer la config de impresora; uso valores por defecto:", e);
    }
    return structuredClone(CONFIG_POR_DEFECTO);
  }
  try {
    return validarConfig(conDefectos(JSON.parse(contenido)));
  } catch (e) {
    console.warn("[printing] Config de impresora corrupta o inválida; uso valores por defecto:", e);
    return structuredClone(CONFIG_POR_DEFECTO);
  }
}

export function guardarConfig(dir: string, raw: unknown): PrinterConfig {
  const config = validarConfig(raw);
  fs.mkdirSync(dir, { recursive: true });
  // Escritura atómica: si se corta la luz a mitad, queda el archivo anterior intacto.
  const destino = rutaConfig(dir);
  const tmp = `${destino}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), "utf8");
  fs.renameSync(tmp, destino);
  return config;
}
