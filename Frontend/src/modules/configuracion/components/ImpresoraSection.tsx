import { useEffect, useState } from "react";
import { Loader2, Printer, Receipt, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { usePrinter } from "@/shared/printing/usePrinter";
import { CHARACTER_SETS_SUGERIDOS } from "@/shared/printing/types";
import type { ModoImpresion, PrinterConfig } from "@/shared/printing/types";
import { crearFacturaEjemplo } from "../mocks/facturaEjemplo";

const CLASE_TEXTAREA =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-secondary">{etiqueta}</label>
      {children}
    </div>
  );
}

export function ImpresoraSection() {
  const {
    disponible,
    config,
    cargando,
    ocupado,
    error,
    limpiarError,
    impresoras,
    listarImpresoras,
    guardarConfig,
    imprimirFactura,
    imprimirPrueba,
  } = usePrinter();
  const [borrador, setBorrador] = useState<PrinterConfig | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (config) setBorrador(config);
  }, [config]);

  useEffect(() => {
    void listarImpresoras();
  }, [listarImpresoras]);

  // Si la impresora guardada ya no está instalada, se muestra igual para poder avisar de ello.
  const opcionesImpresora =
    borrador?.impresora && !impresoras.includes(borrador.impresora)
      ? [borrador.impresora, ...impresoras]
      : impresoras;

  const modificado = borrador !== null && config !== null && JSON.stringify(borrador) !== JSON.stringify(config);

  const cambiar = (parcial: Partial<PrinterConfig>) => {
    setAviso(null);
    limpiarError();
    setBorrador((b) => (b ? { ...b, ...parcial } : b));
  };
  const cambiarEncabezado = (parcial: Partial<PrinterConfig["encabezado"]>) =>
    cambiar({ encabezado: { ...borrador!.encabezado, ...parcial } });

  const guardar = async () => {
    if (!borrador) return;
    setAviso((await guardarConfig(borrador)) ? "Configuración de impresora guardada." : null);
  };
  const probar = async (accion: () => Promise<boolean>, mensaje: string) => {
    setAviso(null);
    if (await accion()) setAviso(mensaje);
  };

  // En modo USB, "ok" solo significa que Windows encoló el trabajo (ver usbSpoolerProvider).
  const mensajeOk = (base: string) =>
    config?.modo === "usb" ? `${base} enviada a la impresora (RAW).` : `${base} guardada en el archivo de volcado.`;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Printer className="size-5 text-brand" />
        <h2 className="text-xl font-bold text-brand">Impresora</h2>
      </div>

      {!disponible ? (
        <p className="text-sm text-text-muted">
          La configuración de la impresora solo está disponible en la aplicación de escritorio.
        </p>
      ) : cargando || !borrador ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Cargando configuración...
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}
          {aviso && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{aviso}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo etiqueta="Modo">
              <Select value={borrador.modo} onValueChange={(v) => cambiar({ modo: v as ModoImpresion })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usb">USB (impresora)</SelectItem>
                  <SelectItem value="dump">Solo archivo (pruebas)</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo etiqueta="Impresora instalada">
              <Select
                value={borrador.impresora || undefined}
                onValueChange={(v) => cambiar({ impresora: v })}
                disabled={borrador.modo !== "usb"}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona una impresora" />
                </SelectTrigger>
                <SelectContent>
                  {opcionesImpresora.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo etiqueta="Juego de caracteres">
              <Select value={borrador.characterSet} onValueChange={(v) => cambiar({ characterSet: v })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHARACTER_SETS_SUGERIDOS.map((c) => (
                    <SelectItem key={c.valor} value={c.valor}>
                      {c.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <Checkbox checked={borrador.abrirCajon} onChange={(e) => cambiar({ abrirCajon: e.target.checked })} />
            Abrir cajón monedero al imprimir
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo etiqueta="Nombre del parqueadero">
              <Input
                value={borrador.encabezado.nombre}
                maxLength={48}
                onChange={(e) => cambiarEncabezado({ nombre: e.target.value })}
                className="h-11"
              />
            </Campo>
            <Campo etiqueta="NIT">
              <Input
                value={borrador.encabezado.nit}
                maxLength={48}
                onChange={(e) => cambiarEncabezado({ nit: e.target.value })}
                className="h-11"
              />
            </Campo>
            <Campo etiqueta="Dirección">
              <Input
                value={borrador.encabezado.direccion}
                maxLength={96}
                onChange={(e) => cambiarEncabezado({ direccion: e.target.value })}
                className="h-11"
              />
            </Campo>
            <Campo etiqueta="Teléfono">
              <Input
                value={borrador.encabezado.telefono}
                maxLength={48}
                onChange={(e) => cambiarEncabezado({ telefono: e.target.value })}
                className="h-11"
              />
            </Campo>
          </div>

          <Campo etiqueta="Pie de página">
            <textarea
              value={borrador.piePagina}
              maxLength={300}
              rows={3}
              onChange={(e) => cambiar({ piePagina: e.target.value })}
              className={CLASE_TEXTAREA}
            />
          </Campo>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {modificado && (
              <span className="text-xs text-text-muted">Guarda los cambios para poder imprimir pruebas.</span>
            )}
            <Button
              variant="outline"
              disabled={ocupado || modificado}
              onClick={() => probar(imprimirPrueba, mensajeOk("Prueba"))}
              className="gap-2"
            >
              {ocupado ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
              Imprimir prueba
            </Button>
            <Button
              variant="outline"
              disabled={ocupado || modificado}
              onClick={() => probar(() => imprimirFactura(crearFacturaEjemplo()), mensajeOk("Factura de ejemplo"))}
              className="gap-2"
            >
              <Receipt className="size-4" />
              Imprimir factura de ejemplo
            </Button>
            <Button
              disabled={ocupado || !modificado}
              onClick={guardar}
              className="bg-brand hover:bg-brand-hover text-white font-semibold gap-2 shadow-sm"
            >
              {ocupado ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
