import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PrinterProvider } from "../types.js";

const TIMEOUT_MS = 10_000;
/** Estricta a propósito: el nombre termina como argumento de cmd.exe. */
const REGEX_NOMBRE_COMPARTIDO = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * Envía el buffer ESC/POS en crudo al spooler de Windows:
 *   cmd.exe /d /c copy /b <archivo> \\localhost\<NOMBRE_COMPARTIDO>
 *
 * LIMITACIÓN IMPORTANTE: `copy` termina con código 0 en cuanto el spooler acepta el
 * trabajo, aunque la impresora esté apagada, desconectada o sin papel; el trabajo
 * queda en la cola de Windows y sale cuando la impresora vuelva. Por eso un
 * `ok: true` significa "encolado", NO "impreso". Detectar el estado real de la
 * impresora requeriría consultar el spooler o usar otro canal (fuera de alcance).
 *
 * Decisiones de seguridad:
 *  - `execFile` con argumentos separados, nunca un string armado con `exec`: Node no
 *    pasa por una shell que interprete el nombre compartido.
 *  - El nombre se valida con regex antes de usarse (evita `&`, `|`, `"`, `%`, etc.).
 *  - El archivo temporal se pasa por su nombre y con `cwd: os.tmpdir()`, así no hay
 *    rutas con espacios, tildes ni `%` (p. ej. un usuario "Juan Pérez") que cmd.exe
 *    pueda interpretar. El nombre del archivo lo generamos nosotros (UUID).
 */
export class UsbSpoolerProvider implements PrinterProvider {
  constructor(private readonly nombreCompartido: string) {}

  async imprimir(buffer: Buffer): Promise<void> {
    if (process.platform !== "win32") {
      throw new Error("La impresión por USB solo está disponible en Windows.");
    }
    if (!REGEX_NOMBRE_COMPARTIDO.test(this.nombreCompartido)) {
      throw new Error(
        "El nombre compartido de la impresora no es válido (solo letras, números, guion y guion bajo).",
      );
    }

    const dir = os.tmpdir();
    const archivo = `smartpark-ticket-${randomUUID()}.bin`;
    const ruta = path.join(dir, archivo);

    try {
      await fs.writeFile(ruta, buffer);
      await ejecutarCopy(dir, archivo, this.nombreCompartido);
    } finally {
      // Siempre se borra, haya salido bien o mal. Un fallo al borrar no debe tapar el error real.
      await fs.rm(ruta, { force: true }).catch(() => undefined);
    }
  }
}

function ejecutarCopy(cwd: string, archivo: string, nombre: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "cmd.exe",
      ["/d", "/c", "copy", "/b", archivo, `\\\\localhost\\${nombre}`],
      { cwd, timeout: TIMEOUT_MS, windowsHide: true },
      (error, stdout, stderr) => {
        if (!error) return resolve();
        if (error.killed) {
          return reject(
            new Error(`La impresión superó el tiempo de espera (${TIMEOUT_MS / 1000} s).`),
          );
        }
        const detalle = (String(stderr).trim() || String(stdout).trim() || error.message).slice(0, 500);
        const codigo = typeof error.code === "number" ? error.code : "desconocido";
        reject(
          new Error(
            `No se pudo enviar el tiquete a la impresora "${nombre}" (código de salida ${codigo}): ${detalle}`,
          ),
        );
      },
    );
  });
}
