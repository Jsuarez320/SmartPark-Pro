import { execFile } from "node:child_process";

/** Nombres de las impresoras instaladas en Windows (Get-Printer). Vacío fuera de Windows. */
export function listarImpresoras(): Promise<string[]> {
  if (process.platform !== "win32") return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "[Console]::OutputEncoding=[Text.Encoding]::UTF8; @(Get-Printer | Select-Object -ExpandProperty Name) | ConvertTo-Json -Compress",
      ],
      { timeout: 15_000, windowsHide: true, encoding: "utf8" },
      (error, stdout) => {
        if (error) return reject(new Error("No se pudo obtener la lista de impresoras instaladas."));
        const texto = stdout.trim();
        if (!texto) return resolve([]);
        try {
          const datos: unknown = JSON.parse(texto);
          const lista = Array.isArray(datos) ? datos : [datos];
          resolve(lista.filter((n): n is string => typeof n === "string").sort());
        } catch {
          reject(new Error("Respuesta inesperada al listar las impresoras."));
        }
      },
    );
  });
}
