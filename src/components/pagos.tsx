import { useState } from "react";
import { CreditCard, Download, Plus, Wallet } from "../lib/iconos";
import {
  Badge,
  EmptyState,
  FilterTabs,
  Page,
  PageHeader,
  Section,
  Stat,
  Table,
  btnPrimary,
  btnSecondary,
  colones,
} from "./ui";

interface Movimiento {
  id: string;
  concepto: string;
  detalle: string;
  fecha: string;
  monto: number;
  tipo: "Cargo" | "Reembolso";
  estado: "Pagado" | "Pendiente" | "Reembolsado";
  metodo: string;
}

const movimientos: Movimiento[] = [
  { id: "TX-2291", concepto: "Paseo · Rocky", detalle: "María Fernández · 45 min", fecha: "19 ago", monto: 4500, tipo: "Cargo", estado: "Pendiente", metodo: "•••• 4821" },
  { id: "TX-2287", concepto: "Paseo · Luna", detalle: "Carolina Mora · 60 min", fecha: "17 ago", monto: 5200, tipo: "Cargo", estado: "Pagado", metodo: "•••• 4821" },
  { id: "TX-2280", concepto: "Paseo · Rocky", detalle: "María Fernández · 45 min", fecha: "15 ago", monto: 4500, tipo: "Cargo", estado: "Pagado", metodo: "SINPE Móvil" },
  { id: "TX-2274", concepto: "Paseo cancelado · Michi", detalle: "Luis Rojas · cancelado por el paseador", fecha: "12 ago", monto: 3800, tipo: "Reembolso", estado: "Reembolsado", metodo: "•••• 4821" },
  { id: "TX-2266", concepto: "Paseo · Luna", detalle: "Carolina Mora · 60 min", fecha: "10 ago", monto: 5200, tipo: "Cargo", estado: "Pagado", metodo: "SINPE Móvil" },
];

const metodos = [
  { etiqueta: "Visa terminada en 4821", detalle: "Vence 09/28", principal: true, Icon: CreditCard },
  { etiqueta: "SINPE Móvil 8712-4490", detalle: "Banco Nacional", principal: false, Icon: Wallet },
];

const tonoEstado = (e: Movimiento["estado"]) =>
  e === "Pagado" ? "ok" : e === "Pendiente" ? "warn" : "neutral";

const filtros = ["Todos", "Pagados", "Pendientes", "Reembolsos"];

const Pagos = () => {
  const [filtro, setFiltro] = useState("Todos");

  const visibles = movimientos.filter((m) => {
    if (filtro === "Pagados") return m.estado === "Pagado";
    if (filtro === "Pendientes") return m.estado === "Pendiente";
    if (filtro === "Reembolsos") return m.tipo === "Reembolso";
    return true;
  });

  return (
    <Page>
      <PageHeader
        title="Pagos"
        subtitle="Movimientos, métodos de pago y comprobantes de tus paseos."
        action={
          <button type="button" className={btnPrimary}>
            <Plus size={15} strokeWidth={2} />
            Agregar método
          </button>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-3">
        <Stat etiqueta="Gasto del mes" valor={colones(19400)} nota="5 paseos" />
        <Stat etiqueta="Pendiente de cobro" valor={colones(4500)} nota="1 movimiento" />
        <Stat etiqueta="Reembolsado" valor={colones(3800)} nota="en agosto" />
      </div>

      <Section title="Métodos de pago" bodyClass="px-6 pb-5">
        <ul className="flex flex-col gap-2.5">
          {metodos.map((m) => (
            <li key={m.etiqueta} className="flex items-center gap-4 bg-sunken px-5 py-4">
              <m.Icon
                size={18}
                strokeWidth={1.8}
                aria-hidden
                className="flex-shrink-0 text-ink-soft"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink">
                  {m.etiqueta}
                </p>
                <p className="text-[11.5px] text-ink-mute">{m.detalle}</p>
              </div>
              {m.principal && <Badge tono="accent">Principal</Badge>}
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-4">
        <FilterTabs
          label="Filtrar movimientos"
          options={filtros}
          value={filtro}
          onChange={setFiltro}
        />
        <button type="button" className={btnSecondary}>
          <Download size={14} strokeWidth={1.9} />
          Exportar CSV
        </button>
      </div>

      <Section bodyClass="">
        {visibles.length > 0 ? (
          <Table
            caption={`Movimientos filtrados por ${filtro.toLowerCase()}`}
            columnas={[
              { label: "Concepto" },
              { label: "Fecha" },
              { label: "Método" },
              { label: "Estado" },
              { label: "Monto", align: "right" },
            ]}
          >
            {visibles.map((m) => (
              <tr key={m.id}>
                <td className="px-6 py-3.5">
                  <p className="text-[13px] font-medium text-ink">{m.concepto}</p>
                  <p className="text-[11.5px] text-ink-mute">{m.detalle}</p>
                </td>
                <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                  {m.fecha}
                </td>
                <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                  {m.metodo}
                </td>
                <td className="px-6 py-3.5">
                  <Badge tono={tonoEstado(m.estado)}>{m.estado}</Badge>
                </td>
                <td
                  className={`nums px-6 py-3.5 text-right text-[13px] font-semibold ${
                    m.tipo === "Reembolso" ? "text-ok" : "text-ink"
                  }`}
                >
                  {m.tipo === "Reembolso" ? "+" : "−"}
                  {colones(m.monto)}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            title="Sin movimientos en este filtro"
            hint="Cambia el filtro para ver el resto del historial."
          />
        )}
      </Section>
    </Page>
  );
};

export default Pagos;
