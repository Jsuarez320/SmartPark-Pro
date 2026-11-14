import { api } from "@/shared/api/api";
import type { DatosPago, MetodoPago, SalidaResponse, VehiculoPatio } from "../receipt.types";

export async function obtenerPatio(q?: string): Promise<VehiculoPatio[]> {
  const { data } = await api.get<VehiculoPatio[]>("/vehiculos/patio", {
    params: q ? { q } : undefined,
  });
  return data;
}

export async function obtenerVehiculoPatio(ingresoId: string): Promise<VehiculoPatio> {
  const { data } = await api.get<VehiculoPatio>(`/vehiculos/patio/${ingresoId}`);
  return data;
}

export async function procesarPago(data: {
  ingresoId: string;
  metodoPago?: MetodoPago;
}): Promise<SalidaResponse> {
  const { data: res } = await api.post<SalidaResponse>("/vehiculos/salida", data);
  return res;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function imprimirRecibo(datos: DatosPago): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const dinero = (n: number) => `$${n.toLocaleString("es-CO")}`;

  printWindow.document.write(`
    <html>
    <head>
      <title>Recibo - ${esc(datos.placa)}</title>
      <style>
        @page { margin: 10mm; size: 80mm auto; }
        body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 0; width: 80mm; color: #000; }
        .recibo { padding: 10px 12px; }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
        .header h2 { margin: 0; font-size: 16px; letter-spacing: 1px; }
        .header p { margin: 2px 0; font-size: 11px; color: #555; }
        .titulo { text-align: center; font-weight: bold; font-size: 14px; margin: 8px 0; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .footer { text-align: center; margin-top: 10px; font-size: 11px; border-top: 1px dashed #000; padding-top: 8px; }
        .info-line { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
      </style>
    </head>
    <body>
      <div class="recibo">
        <div class="header">
          <h2>SMART PARK PRO</h2>
          <p>Control e Ingeniería de Parqueo</p>
          <p style="font-size:10px">${esc(datos.fecha)}</p>
        </div>

        <div class="titulo">RECIBO DE PAGO</div>

        <div class="info-line"><span>Factura</span><span>${esc(datos.ticket)}</span></div>
        <div class="info-line"><span>Placa</span><span style="font-weight:bold">${esc(datos.placa)}</span></div>
        <div class="info-line"><span>Tarjeta</span><span>${esc(datos.tarjeta)}</span></div>
        <div class="info-line"><span>Tipo</span><span style="text-transform:capitalize">${esc(datos.tipo)}</span></div>
        <div class="divider"></div>
        <div class="info-line"><span>Ingreso</span><span>${esc(datos.horaIngreso)}</span></div>
        <div class="info-line"><span>Salida</span><span>${esc(datos.horaSalida)}</span></div>
        <div class="info-line"><span>Tiempo</span><span>${esc(datos.tiempoTranscurrido)}</span></div>
        <div class="divider"></div>
        <div class="info-line"><span>Plan</span><span>${esc(datos.plan)}</span></div>
        <div class="info-line"><span>Bloques de 15 min</span><span>${datos.bloques} x ${dinero(datos.valorBloque)}</span></div>
        ${datos.topeAplicado ? '<div class="info-line"><span>Tope diario aplicado</span><span>Sí</span></div>' : ""}
        <div class="info-line" style="font-size:14px;font-weight:bold"><span>TOTAL</span><span>${dinero(datos.total)}</span></div>
        <div class="divider"></div>
        <div class="info-line"><span>Método de pago</span><span style="text-transform:capitalize">${esc(datos.metodoPago)}</span></div>
        <div class="footer">
          <p>¡Gracias por su preferencia!</p>
          <p style="font-size:10px;color:#888">SmartPark Pro</p>
        </div>
      </div>
      <script>window.print();window.close();<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
