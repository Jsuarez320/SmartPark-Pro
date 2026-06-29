import { api } from "@/shared/api/api";
import type { DatosPago } from "../receipt.types";

export async function procesarPago(data: {
  placa: string;
  metodoPago: string;
}): Promise<{ ticket: string; total: number }> {
  const { data: res } = await api.post("/vehiculos/salida", data);
  return res;
}

export function imprimirRecibo(datos: DatosPago): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const linea = (a: string, b: string) =>
    `  <tr><td style="font-size:12px;padding:2px 0">${a}</td><td style="font-size:12px;padding:2px 0;text-align:right;font-weight:bold">${b}</td></tr>`;

  printWindow.document.write(`
    <html>
    <head>
      <title>Recibo - ${datos.placa}</title>
      <style>
        @page { margin: 10mm; size: 80mm auto; }
        body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 0; width: 80mm; color: #000; }
        .recibo { padding: 10px 12px; }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
        .header h2 { margin: 0; font-size: 16px; letter-spacing: 1px; }
        .header p { margin: 2px 0; font-size: 11px; color: #555; }
        .titulo { text-align: center; font-weight: bold; font-size: 14px; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .total { font-size: 16px; text-align: center; margin: 10px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 10px; font-size: 11px; border-top: 1px dashed #000; padding-top: 8px; }
        .info-line { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
        .barcode { text-align: center; font-size: 24px; letter-spacing: 4px; margin: 4px 0; font-family: 'Courier New', monospace; }
      </style>
    </head>
    <body>
      <div class="recibo">
        <div class="header">
          <h2>SMART PARK PRO</h2>
          <p>Control e Ingeniería de Parqueo</p>
          <p style="font-size:10px">${datos.fecha}</p>
        </div>

        <div class="titulo">RECIBO DE PAGO</div>

        <div class="info-line"><span>Ticket</span><span>${datos.ticket}</span></div>
        <div class="info-line"><span>Placa</span><span style="font-weight:bold">${datos.placa}</span></div>
        <div class="info-line"><span>Tipo</span><span>${datos.tipo}</span></div>
        <div class="divider"></div>
        <div class="info-line"><span>Ingreso</span><span>${datos.horaIngreso}</span></div>
        <div class="info-line"><span>Salida</span><span>${datos.horaSalida}</span></div>
        <div class="info-line"><span>Tiempo</span><span>${datos.tiempoTranscurrido}</span></div>
        <div class="divider"></div>
        <div class="info-line"><span>Tarifa</span><span>$${datos.tarifa.toLocaleString()}</span></div>
        <div class="info-line" style="font-size:14px;font-weight:bold"><span>TOTAL</span><span>$${datos.total.toLocaleString()}</span></div>
        <div class="divider"></div>
        <div class="info-line"><span>Método de pago</span><span style="text-transform:capitalize">${datos.metodoPago}</span></div>
        <div class="barcode">||| || || |||</div>
        <div class="footer">
          <p>¡Gracias por su preferencia!</p>
          <p style="font-size:10px;color:#888">SmartPark Pro v1.0</p>
        </div>
      </div>
      <script>window.print();window.close();<\\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
