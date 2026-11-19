import { contextBridge, ipcRenderer } from "electron";
import type { FacturaImpresion, PrinterConfig } from "./printing/types.js";

// El preload corre aislado y solo puede importar "electron": por eso los canales
// se repiten aquí como literales (fuente: electron/printing/ipc.ts → CANALES).
// Solo se exponen funciones concretas; NUNCA ipcRenderer completo.
contextBridge.exposeInMainWorld("smartpark", {
  platform: process.platform,
  printer: {
    imprimirFactura: (factura: FacturaImpresion) =>
      ipcRenderer.invoke("printer:imprimir-factura", factura),
    imprimirPrueba: () => ipcRenderer.invoke("printer:imprimir-prueba"),
    listarImpresoras: () => ipcRenderer.invoke("printer:listar"),
    getConfig: () => ipcRenderer.invoke("printer:get-config"),
    setConfig: (config: PrinterConfig) => ipcRenderer.invoke("printer:set-config", config),
  },
});
