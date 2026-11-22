import { NOMBRE_TIPO_RECIBO, numeroRecibo, type ReciboApi } from "@/shared/types/recibo";
import { formatCurrencyCOP, formatDia, formatDuracion, formatFechaHoraCompleta } from "@/shared/utils/formatters";

const NOMBRE_TRAMO = { normal: "Hora", nocturna: "Hora nocturna", festivo: "Hora dom/festivo" } as const;
const NOMBRE_PERIODO = { "1_dia": "1 día", "15_dias": "15 días", "1_mes": "1 mes" } as const;
const NOMBRE_JORNADA = { manana: "Mañana", tarde: "Tarde", completa: "Completa" } as const;

function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: React.ReactNode; fuerte?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-0.5 ${fuerte ? "font-bold text-text-primary" : "text-text-secondary"}`}>
      <dt className="text-text-muted">{etiqueta}</dt>
      <dd className="text-right">{valor}</dd>
    </div>
  );
}

const Separador = () => <hr className="my-2 border-dashed border-border" />;

function Cuerpo({ recibo }: { recibo: ReciboApi }) {
  switch (recibo.tipo) {
    case "ingreso": {
      const c = recibo.contenido;
      return (
        <>
          <Fila etiqueta="Tiquete" valor={<span className="font-mono text-lg font-bold">{numeroRecibo(recibo.numero)}</span>} />
          <Fila etiqueta="Placa" valor={c.placa} fuerte />
          <Fila etiqueta="Vehículo" valor={<span className="capitalize">{c.tipoVehiculo}</span>} />
          <Fila etiqueta="Entrada" valor={formatFechaHoraCompleta(c.horaEntrada)} />
          <Fila etiqueta="Cajero" valor={c.operador} />
          {c.mensualidad && (
            <>
              <Separador />
              <Fila etiqueta="Mensualidad" valor={c.mensualidad.cliente ?? "—"} />
              <Fila etiqueta="Jornada" valor={NOMBRE_JORNADA[c.mensualidad.jornada]} />
              <Fila etiqueta="Vence" valor={formatDia(c.mensualidad.fechaFin)} />
            </>
          )}
          {c.tarifa && (
            <>
              <Separador />
              <Fila etiqueta="Hora" valor={formatCurrencyCOP(c.tarifa.valorHora)} />
              <Fila etiqueta="Dom/festivo" valor={formatCurrencyCOP(c.tarifa.valorHoraFestivo)} />
              {c.tarifa.nocturnaActiva && c.tarifa.valorHoraNocturna !== null && <Fila etiqueta="Nocturna" valor={formatCurrencyCOP(c.tarifa.valorHoraNocturna)} />}
              <Fila etiqueta="Máximo día" valor={formatCurrencyCOP(c.tarifa.valorDia)} />
              <Fila etiqueta="Gracia" valor={`${c.tarifa.graciaMinutos} min`} />
            </>
          )}
          {c.aviso && <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">{c.aviso}</p>}
        </>
      );
    }
    case "pago": {
      const c = recibo.contenido;
      return (
        <>
          {c.tiquete !== null && <Fila etiqueta="Tiquete" valor={<span className="font-mono">{numeroRecibo(c.tiquete)}</span>} />}
          <Fila etiqueta="Placa" valor={c.placa} fuerte />
          <Fila etiqueta="Vehículo" valor={<span className="capitalize">{c.tipoVehiculo}</span>} />
          <Fila etiqueta="Entrada" valor={formatFechaHoraCompleta(c.horaEntrada)} />
          <Fila etiqueta="Salida" valor={formatFechaHoraCompleta(c.horaSalida)} />
          <Fila etiqueta="Tiempo" valor={formatDuracion(c.minutosTotales)} />
          <Fila etiqueta="Cajero" valor={c.operador} />
          <Separador />
          {c.esMensualidad ? (
            <p className="py-1 text-center text-text-secondary">Mensualidad vigente: salida sin cobro</p>
          ) : c.total === 0 ? (
            <p className="py-1 text-center text-text-secondary">Dentro del tiempo de gracia: salida sin cobro</p>
          ) : (
            <>
              {c.periodos.map((p, n) => (
                <div key={p.inicio}>
                  {c.periodos.length > 1 && <p className="mt-1 text-xs font-semibold text-text-muted">Día {n + 1}</p>}
                  {p.tramos.map((t) => (
                    <Fila key={t.tipo} etiqueta={`${t.horas} h ${NOMBRE_TRAMO[t.tipo]} × ${formatCurrencyCOP(t.valorHora)}`} valor={formatCurrencyCOP(t.subtotal)} />
                  ))}
                  {p.topeAplicado && <Fila etiqueta="Tope del día aplicado" valor={formatCurrencyCOP(p.total)} />}
                </div>
              ))}
              <Fila etiqueta="Pago" valor={<span className="capitalize">{c.medioPago}</span>} />
              {c.referencia && <Fila etiqueta="Referencia" valor={c.referencia} />}
            </>
          )}
          <Separador />
          <Fila etiqueta="TOTAL" valor={<span className="text-xl">{formatCurrencyCOP(c.total)}</span>} fuerte />
        </>
      );
    }
    case "mensualidad": {
      const c = recibo.contenido;
      return (
        <>
          <Fila etiqueta="Cliente" valor={c.cliente} fuerte />
          {c.celular && <Fila etiqueta="Celular" valor={c.celular} />}
          <Fila etiqueta="Placa" valor={c.placa} fuerte />
          {c.placaAlterna && <Fila etiqueta="Placa alterna" valor={c.placaAlterna} />}
          <Fila etiqueta="Vehículo" valor={<span className="capitalize">{c.tipoVehiculo}</span>} />
          {c.tarjeta && <Fila etiqueta="Tarjeta" valor={c.tarjeta} />}
          <Separador />
          <Fila etiqueta="Periodo" valor={NOMBRE_PERIODO[c.periodo]} />
          <Fila etiqueta="Jornada" valor={NOMBRE_JORNADA[c.jornada]} />
          <Fila etiqueta="Desde" valor={formatDia(c.fechaInicio)} />
          <Fila etiqueta="Hasta" valor={formatDia(c.fechaFin)} />
          <Fila etiqueta="Cajero" valor={c.operador} />
          <Fila etiqueta="Pago" valor={<span className="capitalize">{c.medioPago}</span>} />
          {c.referencia && <Fila etiqueta="Referencia" valor={c.referencia} />}
          <Separador />
          <Fila etiqueta="TOTAL" valor={<span className="text-xl">{formatCurrencyCOP(c.valor)}</span>} fuerte />
        </>
      );
    }
    case "cierre_caja": {
      const c = recibo.contenido;
      const d = c.diferenciaEfectivo;
      return (
        <>
          <Fila etiqueta="Abrió" valor={c.abiertoPor} />
          <Fila etiqueta="Apertura" valor={formatFechaHoraCompleta(c.fechaApertura)} />
          {c.cerradoPor && <Fila etiqueta="Cerró" valor={c.cerradoPor} />}
          {c.fechaCierre && <Fila etiqueta="Cierre" valor={formatFechaHoraCompleta(c.fechaCierre)} />}
          <Separador />
          <Fila etiqueta="Base efectivo" valor={formatCurrencyCOP(c.baseEfectivo)} />
          <Fila etiqueta="Base transferencias" valor={formatCurrencyCOP(c.baseTransferencia)} />
          <Fila etiqueta={`Efectivo cobrado (${c.movimientosEfectivo})`} valor={formatCurrencyCOP(c.efectivo)} />
          <Fila etiqueta={`Transferencias cobradas (${c.movimientosTransferencia})`} valor={formatCurrencyCOP(c.transferencia)} />
          <Fila etiqueta={`Total recaudado (${c.totalTransacciones})`} valor={formatCurrencyCOP(c.totalRecaudado)} fuerte />
          <Separador />
          <Fila etiqueta="Efectivo esperado" valor={formatCurrencyCOP(c.esperadoEfectivo)} fuerte />
          {c.efectivoContado !== null && <Fila etiqueta="Efectivo contado" valor={formatCurrencyCOP(c.efectivoContado)} />}
          {d !== null && (
            <Fila etiqueta={d === 0 ? "Cuadrada" : d > 0 ? "Sobrante" : "Faltante"} valor={formatCurrencyCOP(Math.abs(d))} fuerte />
          )}
          <Fila etiqueta="Transferencias esperadas" valor={formatCurrencyCOP(c.esperadoTransferencia)} />
          {c.movimientos.length > 0 && (
            <>
              <Separador />
              <p className="mb-1 text-xs font-semibold text-text-muted">Movimientos</p>
              {c.movimientos.map((m) => (
                <Fila
                  key={m.id}
                  etiqueta={`${new Date(m.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} ${m.placa ?? "—"} · ${m.operacion === "mensualidad" ? "Mens." : "Horas"} · ${m.medio === "efectivo" ? "Ef." : "Tr."}`}
                  valor={formatCurrencyCOP(m.monto)}
                />
              ))}
            </>
          )}
          {c.notas && <p className="mt-2 text-xs text-text-muted">Notas: {c.notas}</p>}
        </>
      );
    }
  }
}

/** Vista del recibo tal como se guardó (la misma información del ticket impreso). No recalcula nada. */
export function VistaRecibo({ recibo }: { recibo: ReciboApi }) {
  return (
    <article className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-background p-4 font-mono text-sm" aria-label={`Recibo ${numeroRecibo(recibo.numero)}`}>
      <header className="text-center">
        {recibo.reimpresiones > 0 && <p className="mb-1 text-xs font-bold text-destructive">*** COPIA {recibo.reimpresiones} ***</p>}
        <p className="font-bold uppercase text-text-primary">{NOMBRE_TIPO_RECIBO[recibo.tipo]}</p>
        <p className="text-xs text-text-muted">
          Recibo No. {numeroRecibo(recibo.numero)} · {formatFechaHoraCompleta(recibo.creadoEn)}
        </p>
      </header>
      <Separador />
      <dl>
        <Cuerpo recibo={recibo} />
      </dl>
    </article>
  );
}
