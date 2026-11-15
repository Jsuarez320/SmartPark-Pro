import fs from "node:fs/promises";
import path from "node:path";
import type { PrinterProvider } from "../types.js";

/** Volcado hex estilo `hexdump -C`: offset, 16 bytes en hex y columna ASCII. */
export function volcadoHex(buffer: Buffer): string {
  const lineas: string[] = [];
  for (let i = 0; i < buffer.length; i += 16) {
    const trozo = buffer.subarray(i, i + 16);
    const hex = Array.from(trozo, (b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = Array.from(trozo, (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".")).join("");
    lineas.push(`${i.toString(16).padStart(8, "0")}  ${hex.padEnd(47)}  |${ascii}|`);
  }
  lineas.push(`${buffer.length.toString(16).padStart(8, "0")}  (${buffer.length} bytes)`);
  return lineas.join("\n") + "\n";
}

function marcaTiempo(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").replace("Z", "");
}

/** No imprime: deja el .bin (reenviable con `copy /b`) y un .txt legible. Para desarrollo. */
export class FileDumpProvider implements PrinterProvider {
  /** @param dirBase normalmente app.getPath('userData'); el volcado va a <dirBase>/print-dumps */
  constructor(private readonly dirBase: string) {}

  async imprimir(buffer: Buffer): Promise<void> {
    const dir = path.join(this.dirBase, "print-dumps");
    await fs.mkdir(dir, { recursive: true });
    const base = path.join(dir, `ticket-${marcaTiempo()}`);
    await fs.writeFile(`${base}.bin`, buffer);
    await fs.writeFile(`${base}.txt`, volcadoHex(buffer), "utf8");
    console.log(`[printing] Volcado guardado en ${base}.bin`);
  }
}
