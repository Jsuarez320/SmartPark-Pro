import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PrinterProvider } from "../types.js";

const TIMEOUT_MS = 20_000;
const ERROR_INVALID_PRINTER_NAME = 1801;

/**
 * Script de PowerShell que envía bytes en crudo a una cola de Windows con winspool:
 * OpenPrinter -> StartDocPrinter (pDatatype = "RAW") -> WritePrinter -> EndDocPrinter.
 * Con datatype RAW el spooler entrega los bytes tal cual a la impresora: el driver NO
 * los dibuja (sin GDI, sin dithering, sin escalado por tamaño de papel).
 *
 * Es ASCII puro y literal (here-string con comillas simples): nada del usuario se
 * interpola dentro del script. El nombre de la impresora y la ruta del archivo llegan
 * como parámetros separados (execFile, sin shell).
 *
 * En error escribe `ERR:<código Win32>:<mensaje>` en stderr y sale con 1.
 */
const SCRIPT_RAW = String.raw`param([Parameter(Mandatory=$true)][string]$Impresora, [Parameter(Mandatory=$true)][string]$Archivo)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool OpenPrinter(string name, out IntPtr h, IntPtr defaults);
  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern int StartDocPrinter(IntPtr h, int level, [In] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool WritePrinter(IntPtr h, byte[] buf, int len, out int written);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);

  static void Check(bool ok) {
    if (!ok) throw new Win32Exception(Marshal.GetLastWin32Error());
  }

  public static void Send(string printer, byte[] data) {
    IntPtr h;
    Check(OpenPrinter(printer, out h, IntPtr.Zero));
    try {
      DOCINFO di = new DOCINFO();
      di.pDocName = "SmartPark recibo";
      di.pDataType = "RAW";
      if (StartDocPrinter(h, 1, di) == 0) throw new Win32Exception(Marshal.GetLastWin32Error());
      try {
        Check(StartPagePrinter(h));
        int written;
        Check(WritePrinter(h, data, data.Length, out written));
        if (written != data.Length) throw new Exception("Escritura incompleta: " + written + " de " + data.Length + " bytes.");
        Check(EndPagePrinter(h));
      } finally {
        EndDocPrinter(h);
      }
    } finally {
      ClosePrinter(h);
    }
  }
}
'@
try {
  [RawPrinter]::Send($Impresora, [System.IO.File]::ReadAllBytes($Archivo))
} catch {
  $e = $_.Exception
  while ($e.InnerException) { $e = $e.InnerException }
  $codigo = 0
  if ($e -is [System.ComponentModel.Win32Exception]) { $codigo = $e.NativeErrorCode }
  [Console]::Error.WriteLine('ERR:' + $codigo + ':' + $e.Message)
  exit 1
}
`;

/**
 * Envía el buffer ESC/POS al spooler de Windows con datatype RAW (winspool), por NOMBRE de
 * la impresora instalada. No requiere compartirla.
 *
 * Por qué PowerShell y no un módulo nativo: no hay que recompilar contra la versión de
 * Electron (electron-rebuild), y el mismo código ya se probó contra esta impresora.
 *
 * LIMITACIÓN: un `ok` significa "el spooler aceptó el trabajo", no "salió el papel";
 * sin papel o con la tapa abierta el trabajo queda en cola.
 */
export class WinspoolProvider implements PrinterProvider {
  constructor(private readonly impresora: string) {}

  async imprimir(buffer: Buffer): Promise<void> {
    if (process.platform !== "win32") {
      throw new Error("La impresión por USB solo está disponible en Windows.");
    }
    if (!this.impresora.trim()) {
      throw new Error("No hay una impresora seleccionada. Elígela en Configuración > Impresora.");
    }

    // Archivos temporales con nombre generado por nosotros (UUID); siempre se borran.
    const base = path.join(os.tmpdir(), `smartpark-${randomUUID()}`);
    const bin = `${base}.bin`;
    const ps1 = `${base}.ps1`;
    try {
      await fs.writeFile(bin, buffer);
      await fs.writeFile(ps1, SCRIPT_RAW, "ascii");
      await ejecutar(ps1, bin, this.impresora);
    } finally {
      await Promise.all([bin, ps1].map((f) => fs.rm(f, { force: true }).catch(() => undefined)));
    }
  }
}

function ejecutar(ps1: string, bin: string, impresora: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        ps1,
        "-Impresora",
        impresora,
        "-Archivo",
        bin,
      ],
      { timeout: TIMEOUT_MS, windowsHide: true },
      (error, stdout, stderr) => {
        if (!error) return resolve();
        if (error.killed) {
          return reject(new Error(`La impresión superó el tiempo de espera (${TIMEOUT_MS / 1000} s).`));
        }
        reject(new Error(traducirError(impresora, String(stderr), String(stdout), error.message)));
      },
    );
  });
}

function traducirError(impresora: string, stderr: string, stdout: string, fallback: string): string {
  const m = /ERR:(\d+):(.*)/.exec(stderr);
  if (m) {
    const codigo = Number(m[1]);
    if (codigo === ERROR_INVALID_PRINTER_NAME) {
      return `No se encontró la impresora "${impresora}". Revisa que esté instalada y selecciónala de nuevo en Configuración.`;
    }
    return `No se pudo imprimir en "${impresora}" (código ${codigo}): ${m[2].trim()}`.slice(0, 500);
  }
  const detalle = (stderr.trim() || stdout.trim() || fallback).slice(0, 500);
  return `No se pudo enviar el recibo a la impresora "${impresora}": ${detalle}`;
}
