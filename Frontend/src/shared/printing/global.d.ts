/**
 * Declaración de lo que el preload expone en `window.smartpark`.
 * Es un archivo "script" (sin imports/exports de nivel superior) para que `Window`
 * se amplíe globalmente; por eso los tipos se referencian con import("...").
 *
 * `smartpark` y `printer` son opcionales: en el navegador (sin Electron) no existen.
 */
interface Window {
  smartpark?: {
    platform: string;
    printer?: {
      imprimirFactura(factura: import("./types").FacturaImpresion): Promise<import("./types").ResultadoImpresion>;
      imprimirPrueba(): Promise<import("./types").ResultadoImpresion>;
      listarImpresoras(): Promise<import("./types").ResultadoImpresoras>;
      getConfig(): Promise<import("./types").ResultadoConfig>;
      setConfig(config: import("./types").PrinterConfig): Promise<import("./types").ResultadoConfig>;
    };
  };
}
