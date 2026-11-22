import { contextBridge, ipcRenderer } from "electron";
import type { PrinterConfig, ReciboGuardado } from "./printing/types.js";

// El preload corre aislado y solo puede importar "electron": por eso los canales
// se repiten aquí como literales (fuente: electron/printing/ipc.ts → CANALES).
// Solo se exponen funciones concretas; NUNCA ipcRenderer completo.
contextBridge.exposeInMainWorld("smartpark", {
  platform: process.platform,
  printer: {
    imprimirRecibo: (recibo: ReciboGuardado) => ipcRenderer.invoke("printer:imprimir-recibo", recibo),
    imprimirPrueba: () => ipcRenderer.invoke("printer:imprimir-prueba"),
    listarImpresoras: () => ipcRenderer.invoke("printer:listar"),
    getConfig: () => ipcRenderer.invoke("printer:get-config"),
    setConfig: (config: PrinterConfig) => ipcRenderer.invoke("printer:set-config", config),
  },
});
