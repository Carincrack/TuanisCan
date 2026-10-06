import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Building2, Check, ChevronLeft, ChevronRight, Download, Eye, FileText, Footprints, IdCard, Loader, MapPin, RefreshCw, Search, TrendingUp, UserCheck, Users, Wallet, X } from "../lib/iconos";
import type { Icono } from "../lib/iconos";
import { useAdminPaseadores } from "../hooks/useAdminPaseadores";
import { useAdminUsuarios } from "../hooks/useAdminUsuarios";
import { useAuth } from "../hooks/useAuth";
import {
  downloadVerificationDocument,
  listVerificationRequests,
  getVerificationDocumentUrl,
  reviewVerificationRequest,
} from "../services/verification.service";
import type { AdminUser, AdminVerificationRequest, AdminWalker, RolPublico, VerificationDocumentType } from "../types/auth.types";
import {
  Avatar,
  Badge,
  Confirmar,
  EmptyState,
  FilterTabs,
  Interruptor,
  NotificationButtonContext,
  Page,
  PageHeader,
  Paginacion,
  Section,
  Stat,
  Table,
  btnDanger,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  colones,
  input,
} from "./ui";
import { Combo } from "./Combo";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";
import { listAdminFinances, type AdminFinanceMovement } from "../services/payments.service";
import { listAdminWalks, type AdminWalkMovement, type EstadoPaseo } from "../services/walks.service";
import type { Rol } from "../lib/nav";
import { useTranslation } from "../hooks/useTranslation";
import type { I18nContextValue } from "../context/i18n-context";

type T = I18nContextValue["t"];

/* ─────────────────────────────────────────────────────────────
   Panel de la plataforma. Solo para el equipo de TuanisCan:
   se entra por /acceso-interno, que no está enlazado desde
   ninguna pantalla pública.
   ───────────────────────────────────────────────────────────── */

/** Métrica con ícono, para las cuatro tarjetas de arriba del panel.
    Mismo cuerpo que `Stat` —mismo tamaño de número, misma nota, mismo
    filete de proporción— pero con un círculo de acento a la izquierda
    para que el panel general se distinga de las listas de abajo, que
    ya usan `Stat` a secas. */
const StatIcono = ({
  icono: Icono,
  etiqueta,
  valor,
  nota,
  parte,
}: {
  icono: Icono;
  etiqueta: string;
  valor: string;
  nota?: string;
  parte?: number;
}) => (
  <div className="bg-surface px-6 py-5">
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-dark">
        <Icono size={17} strokeWidth={2} aria-hidden />
      </span>
      <p className="rotulo text-ink-mute">{etiqueta}</p>
    </div>
    <p className="nums mt-3 text-[27px] leading-none font-semibold tracking-[-0.02em] text-ink">
      {valor}
    </p>
    {nota && <p className="mt-1.5 text-[12px] text-ink-soft">{nota}</p>}
    {parte !== undefined && (
      <div className="mt-3.5 h-[3px] w-full overflow-hidden rounded-full bg-sunken" aria-hidden="true">
        <div
          className="h-full w-full origin-left rounded-full bg-accent transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${Math.min(1, Math.max(0, parte))})` }}
        />
      </div>
    )}
  </div>
);

export const PanelAdmin = () => {
  const botonNotificaciones = useContext(NotificationButtonContext);
  const { t, localeTag } = useTranslation();
  const { usuarios } = useAdminUsuarios();
  const { paseadores } = useAdminPaseadores();
  const [movimientos, setMovimientos] = useState<AdminFinanceMovement[]>([]);
  useEffect(() => { void listAdminFinances().then(setMovimientos).catch(() => setMovimientos([])); }, []);

  const now = new Date();
  const key = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
  const pagados = movimientos.filter((item) => item.estado_pago === "pagado");

  const mesesIngreso = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      mes: new Intl.DateTimeFormat(localeTag, { month: "short" }).format(date).replace(".", ""),
      bruto: pagados.filter((item) => key(new Date(`${item.fecha}T00:00:00`)) === key(date)).reduce((sum, item) => sum + item.bruto, 0),
      actual: key(date) === key(now),
    };
  });
  const maxIngreso = Math.max(1, ...mesesIngreso.map((item) => item.bruto));

  const actuales = pagados.filter((item) => key(new Date(`${item.fecha}T00:00:00`)) === key(now));
  const top = Object.values(
    actuales.reduce<Record<string, { n: string; p: number; g: number }>>((all, item) => {
      const row = all[item.paseador] ?? { n: item.paseador, p: 0, g: 0 };
      row.p++;
      row.g += item.bruto;
      all[item.paseador] = row;
      return all;
    }, {}),
  ).sort((a, b) => b.p - a.p).slice(0, 4);

  const paseadoresActivos = paseadores.filter((item) => item.estado === "activo");
  const zonas = Object.values(
    paseadoresActivos.reduce<Record<string, { z: string; n: number }>>((all, item) => {
      const row = all[item.zona] ?? { z: item.zona, n: 0 };
      row.n++;
      all[item.zona] = row;
      return all;
    }, {}),
  ).sort((a, b) => b.n - a.n).slice(0, 6);
  const maxZona = Math.max(1, ...zonas.map((item) => item.n));

  const rangoIndice = ["bg-gold-wash text-gold", "bg-accent-wash text-accent-dark", "bg-sunken text-ink-soft", "bg-sunken text-ink-soft"];

  return (
    <Page wide>
      <PageHeader
        title={t("admin.panel.title")}
        subtitle={t("admin.panel.subtitle")}
        action={botonNotificaciones}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatIcono
          icono={Wallet}
          etiqueta={t("admin.panel.monthCommission")}
          valor={colones(actuales.reduce((sum, item) => sum + item.comision, 0))}
          nota={`${actuales.length} ${actuales.length === 1 ? t("admin.panel.paymentConfirmedSingular") : t("admin.panel.paymentConfirmedPlural")}`}
        />
        <StatIcono icono={Footprints} etiqueta={t("admin.panel.monthWalks")} valor={String(actuales.length)} nota={t("admin.panel.confirmedPayments")} />
        <StatIcono
          icono={UserCheck}
          etiqueta={t("admin.panel.activeWalkers")}
          valor={String(paseadoresActivos.length)}
          nota={t("admin.panel.ofRegistered", { total: paseadores.length })}
          parte={paseadores.length ? paseadoresActivos.length / paseadores.length : undefined}
        />
        <StatIcono
          icono={Users}
          etiqueta={t("admin.panel.activeOwners")}
          valor={String(new Set(actuales.map((item) => item.dueno)).size)}
          nota={t("admin.panel.activeAccounts", { count: usuarios.filter((item) => item.activo).length })}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Section
            title={t("admin.panel.grossVolume")}
            aside={
              <span className="flex items-center gap-1.5 text-[11.5px] text-ink-mute">
                <TrendingUp size={13} className="text-accent" aria-hidden /> {t("admin.panel.last6Months")}
              </span>
            }
            bodyClass="px-6 pt-6 pb-7"
          >
            {maxIngreso > 1 ? (
              <ul className="flex h-[240px] items-end gap-4">
                {mesesIngreso.map((item) => (
                  <li key={item.mes} className="group flex flex-1 flex-col items-center gap-2">
                    <span className={`nums text-[11.5px] ${item.actual ? "font-semibold text-ink" : "text-ink-soft"}`}>
                      {colones(item.bruto)}
                    </span>
                    <span
                      style={{ height: `${Math.max(3, (item.bruto / maxIngreso) * 100)}%` }}
                      className={`w-full rounded-t-[8px] transition-[filter] duration-150 ease-out group-hover:brightness-110 ${
                        item.actual ? "bg-rail" : "bg-accent"
                      }`}
                    />
                    <span className={`text-[11.5px] ${item.actual ? "font-semibold text-ink" : "text-ink-mute"}`}>
                      {item.mes}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("admin.panel.noVolume.title")} hint={t("admin.panel.noVolume.hint")} />
            )}
          </Section>
        </div>

        <Section
          title={t("admin.panel.coverageByZone")}
          aside={
            <span className="flex items-center gap-1.5 text-[11.5px] text-ink-mute">
              <MapPin size={13} className="text-accent" aria-hidden /> {t("admin.panel.activeWalkersShort")}
            </span>
          }
          bodyClass="px-6 pt-4 pb-6"
        >
          {zonas.length ? (
            <ul className="flex flex-col gap-3.5">
              {zonas.map((item) => (
                <li key={item.z} className="flex items-center gap-3">
                  <span className="w-[84px] shrink-0 truncate text-[12.5px] text-ink-soft">{item.z}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunken">
                    <span
                      style={{ width: `${(item.n / maxZona) * 100}%` }}
                      className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                    />
                  </span>
                  <span className="nums w-8 text-right text-[12px] text-ink-mute">{item.n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={t("admin.panel.noCoverage.title")} hint={t("admin.panel.noCoverage.hint")} />
          )}
        </Section>
      </div>

      <Section title={t("admin.panel.topWalkers")}>
        {top.length ? (
          <Table
            caption={t("admin.panel.topWalkersCaption")}
            columnas={[{ label: t("admin.panel.walker") }, { label: t("admin.panel.walks"), align: "right" }, { label: t("admin.panel.generated"), align: "right" }]}
          >
            {top.map((item, index) => (
              <tr key={item.n} className="transition-colors duration-150 hover:bg-sunken">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`nums grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${rangoIndice[index]}`}>
                      {index + 1}
                    </span>
                    <span className="text-[13px] font-medium text-ink">{item.n}</span>
                  </div>
                </td>
                <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">{item.p}</td>
                <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">{colones(item.g)}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title={t("admin.panel.noPaymentsMonth.title")} hint={t("admin.panel.noPaymentsMonth.hint")} />
        )}
      </Section>
    </Page>
  );
};

/* ── Finanzas ────────────────────────────────────────────────── */

export const FinanzasAdmin = () => {
  const botonNotificaciones = useContext(NotificationButtonContext);
  const { t } = useTranslation();
  const claveFiltroFinanzas: Record<string, string> = {
    Todos: "admin.finances.filters.all",
    Pendientes: "admin.finances.filters.pending",
    Pagados: "admin.finances.filters.paid",
  };
  const [filtro, setFiltro] = useState("Todos");
  const [pagina, setPagina] = useState(1);
  const [movimientos, setMovimientos] = useState<AdminFinanceMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    listAdminFinances()
      .then(setMovimientos)
      .catch((cause) => setError(cause instanceof Error ? cause.message : t("admin.finances.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const visibles = movimientos.filter((movement) =>
    filtro === "Pagados"
      ? movement.estado_pago === "pagado"
      : filtro === "Pendientes"
        ? movement.estado_pago === "pendiente"
        : true
  );

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicioPagina = (paginaActual - 1) * PAGE_SIZE;
  const finPagina = Math.min(inicioPagina + PAGE_SIZE, visibles.length);
  const paginaMovimientos = visibles.slice(inicioPagina, inicioPagina + PAGE_SIZE);

  const cambiarFiltro = (value: string) => { setFiltro(value); setPagina(1); };

  const pagados = movimientos.filter((movement) => movement.estado_pago === "pagado");
  const pendientes = movimientos.filter((movement) => movement.estado_pago === "pendiente");
  const brutoPagado = pagados.reduce((sum, movement) => sum + movement.bruto, 0);
  const exportar = () => {
    const rows = [
      [t("admin.finances.csv.date"), t("admin.finances.csv.pet"), t("admin.finances.csv.owner"), t("admin.finances.csv.walker"), t("admin.finances.csv.gross"), t("admin.finances.csv.commission"), t("admin.finances.csv.net"), t("admin.finances.csv.status")],
      ...visibles.map((movement) => [movement.fecha, movement.mascota, movement.dueno, movement.paseador, String(movement.bruto), String(movement.comision), String(movement.neto_paseador), movement.estado_pago]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "finanzas-tuaniscan.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Page wide>
      <PageHeader
        title={t("admin.finances.title")}
        subtitle={t("admin.finances.subtitle")}
        action={botonNotificaciones}
      />

      <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Stat etiqueta={t("admin.finances.earnedCommission")} valor={colones(pagados.reduce((sum, movement) => sum + movement.comision, 0))} nota={`${pagados.length} ${pagados.length === 1 ? t("admin.finances.paymentCompletedSingular") : t("admin.finances.paymentCompletedPlural")}`} />
        <Stat etiqueta={t("admin.finances.pendingCommission")} valor={colones(pendientes.reduce((sum, movement) => sum + movement.comision, 0))} nota={`${pendientes.length} ${pendientes.length === 1 ? t("admin.finances.paymentSingular") : t("admin.finances.paymentPlural")}`} />
        <Stat etiqueta={t("admin.finances.paidVolume")} valor={colones(brutoPagado)} nota={pagados.length ? `${pagados.length} ${t("admin.finances.walksSuffix")}` : t("admin.finances.noPayments")} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-surface px-3 py-3">
        <FilterTabs
          label={t("admin.finances.filterLabel")}
          options={["Todos", "Pendientes", "Pagados"].map((o) => ({ value: o, label: t(claveFiltroFinanzas[o]) }))}
          value={filtro}
          onChange={cambiarFiltro}
        />
        <button type="button" className={btnSecondary} onClick={exportar} disabled={!visibles.length}>
          <Download size={14} strokeWidth={1.9} />
          {t("admin.finances.export")}
        </button>
      </div>

      <Section bodyClass="">
        {error ? (
          <div role="alert" className="bg-danger-wash px-6 py-5 text-[13px] text-danger">{error}</div>
        ) : loading ? (
          <div className="flex items-center gap-2 px-6 py-10 text-[13px] text-ink-soft">
            <Loader size={16} className="animate-spin" /> {t("admin.finances.loading")}
          </div>
        ) : visibles.length > 0 ? (
          <>
            <Table
              caption={t("admin.finances.caption", { filtro: t(claveFiltroFinanzas[filtro]).toLowerCase() })}
              columnas={[
                { label: t("admin.finances.columns.walk") },
                { label: t("admin.finances.columns.owner") },
                { label: t("admin.finances.columns.walker") },
                { label: t("admin.finances.columns.gross"), align: "right" },
                { label: t("admin.finances.columns.commission"), align: "right" },
                { label: t("admin.finances.columns.net"), align: "right" },
                { label: t("admin.finances.columns.status") },
              ]}
            >
              {paginaMovimientos.map((movement) => (
                <tr key={movement.id_pago} className="transition-colors duration-150 hover:bg-sunken">
                  <td className="px-6 py-4 align-top">
                    <p className="text-[13px] font-medium text-ink">{movement.mascota}</p>
                    <p className="nums mt-0.5 text-[11.5px] text-ink-mute">{movement.fecha}</p>
                  </td>
                  <td className="px-6 py-4 align-top text-[12.5px] text-ink-soft">
                    {movement.dueno}
                  </td>
                  <td className="px-6 py-4 align-top text-[12.5px] text-ink-soft">
                    {movement.paseador}
                  </td>
                  <td className="nums px-6 py-4 text-right align-top text-[12.5px] text-ink-soft">
                    {colones(movement.bruto)}
                  </td>
                  <td className="nums px-6 py-4 text-right align-top text-[13px] font-semibold text-ink">
                    {colones(movement.comision)}
                  </td>
                  <td className="nums px-6 py-4 text-right align-top text-[13px] font-semibold text-ink">
                    {colones(movement.neto_paseador)}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <Badge tono={movement.estado_pago === "pagado" ? "ok" : "warn"}>
                      {movement.estado_pago === "pagado" ? t("admin.finances.statusPaid") : t("admin.finances.statusPending")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </Table>

            <Paginacion
              etiqueta={t("admin.finances.pagination")}
              actual={paginaActual}
              total={totalPaginas}
              onCambiar={setPagina}
              desde={inicioPagina + 1}
              hasta={finPagina}
              cuantos={visibles.length}
              nombre={[t("admin.finances.paymentWord"), t("admin.finances.paymentsWord")]}
            />
          </>
        ) : (
          <EmptyState
            title={t("admin.finances.empty.title")}
            hint={t("admin.finances.empty.hint")}
          />
        )}
      </Section>
    </Page>
  );
};

/* ── Paseadores ──────────────────────────────────────────────── */

const claveEstadoPaseador: Record<AdminWalker["estado"], string> = {
  activo: "admin.walkers.status.active",
  inactivo: "admin.walkers.status.inactive",
  suspendido: "admin.walkers.status.suspended",
};

const tonoPaseador = (estado: AdminWalker["estado"]) =>
  estado === "activo" ? "ok" : estado === "suspendido" ? "danger" : "neutral";

export const PaseadoresAdmin = () => {
  const botonNotificaciones = useContext(NotificationButtonContext);
  const { t } = useTranslation();
  const claveFiltroPaseadores: Record<string, string> = {
    Todos: "admin.walkers.filters.all",
    Activos: "admin.walkers.filters.active",
    Inactivos: "admin.walkers.filters.inactive",
    Suspendidos: "admin.walkers.filters.suspended",
  };
  const { paseadores, loading, error } = useAdminPaseadores();
  const [filtro, setFiltro] = useState("Todos");
  const [pagina, setPagina] = useState(1);

  const visibles = paseadores.filter((paseador) =>
    filtro === "Todos"
      ? true
      : filtro === "Activos"
        ? paseador.estado === "activo"
        : filtro === "Inactivos"
          ? paseador.estado === "inactivo"
          : paseador.estado === "suspendido"
  );

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicioPagina = (paginaActual - 1) * PAGE_SIZE;
  const finPagina = Math.min(inicioPagina + PAGE_SIZE, visibles.length);
  const paginaPaseadores = visibles.slice(inicioPagina, inicioPagina + PAGE_SIZE);

  const cambiarFiltro = (value: string) => { setFiltro(value); setPagina(1); };

  return (
    <Page wide>
      <PageHeader
        title={t("admin.walkers.title")}
        subtitle={t("admin.walkers.subtitle")}
        action={botonNotificaciones}
      />

      <div className="bg-surface px-3 py-3">
        <FilterTabs
          label={t("admin.walkers.filterLabel")}
          options={["Todos", "Activos", "Inactivos", "Suspendidos"].map((o) => ({ value: o, label: t(claveFiltroPaseadores[o]) }))}
          value={filtro}
          onChange={cambiarFiltro}
        />
      </div>

      {error && (
        <div aria-live="polite" className="bg-danger-wash px-6 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <div className="min-w-0">
        <Section bodyClass="">
          {loading ? (
            <p className="px-6 py-8 text-[13px] text-ink-soft">{t("admin.walkers.loading")}</p>
          ) : visibles.length > 0 ? (
            <>
              {/* ── De lg para arriba: la tabla ── */}
              <div className="hidden lg:block">
                <Table
                  caption={t("admin.walkers.caption", { filtro: t(claveFiltroPaseadores[filtro]).toLowerCase() })}
                  min="min-w-[900px]"
                  padX="px-4"
                  columnas={[
                    { label: t("admin.walkers.columns.walker"), ancho: "w-[28%]" },
                    { label: t("admin.walkers.columns.zone"), ancho: "w-[20%]" },
                    { label: t("admin.walkers.columns.walks"), align: "right", ancho: "w-[13%]" },
                    { label: t("admin.walkers.columns.rating"), align: "right", ancho: "w-[13%]" },
                    { label: t("admin.walkers.columns.generated"), align: "right", ancho: "w-[16%]" },
                    { label: t("admin.walkers.columns.status"), ancho: "w-[10%]" },
                  ]}
                >
                  {paginaPaseadores.map((p) => (
                    <tr key={p.id_usuario} className="transition-colors duration-150 hover:bg-accent-wash/25">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {p.foto_perfil ? (
                            <img
                              src={p.foto_perfil}
                              alt=""
                              aria-hidden
                              className="h-9 w-9 shrink-0 rounded-full bg-sunken object-cover"
                            />
                          ) : (
                            <Avatar nombre={p.nombre} size={36} />
                          )}
                          <span className="truncate text-[13.5px] font-semibold text-ink" title={p.nombre}>
                            {p.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="truncate px-4 py-3 text-[12.5px] text-ink-soft" title={p.zona}>{p.zona}</td>
                      <td className="nums px-4 py-3 text-right text-[12.5px] text-ink-soft">
                        {p.paseos}
                      </td>
                      <td className="nums px-4 py-3 text-right text-[12.5px] text-ink-soft">
                        {p.rating}
                      </td>
                      <td className="nums px-4 py-3 text-right text-[13px] font-semibold text-ink">
                        {colones(p.generado)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tono={tonoPaseador(p.estado)}>{t(claveEstadoPaseador[p.estado])}</Badge>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>

              {/* ── Debajo de lg: fichas ── */}
              <ul className="grid gap-2.5 p-4 lg:hidden">
                {paginaPaseadores.map((p) => (
                  <li key={p.id_usuario} className="rounded-[14px] bg-sunken/60 p-4">
                    <div className="flex items-start gap-3">
                      {p.foto_perfil ? (
                        <img
                          src={p.foto_perfil}
                          alt=""
                          aria-hidden
                          className="h-10 w-10 shrink-0 rounded-full bg-sunken object-cover"
                        />
                      ) : (
                        <Avatar nombre={p.nombre} size={40} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink">{p.nombre}</p>
                        <p className="truncate text-[11.5px] text-ink-mute">{p.zona}</p>
                      </div>
                      <Badge tono={tonoPaseador(p.estado)}>{t(claveEstadoPaseador[p.estado])}</Badge>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12px]">
                      <div>
                        <dt className="rotulo text-ink-mute">Paseos</dt>
                        <dd className="nums mt-1 text-ink-soft">{p.paseos}</dd>
                      </div>
                      <div>
                        <dt className="rotulo text-ink-mute">Rating</dt>
                        <dd className="nums mt-1 text-ink-soft">{p.rating}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="rotulo text-ink-mute">Generado</dt>
                        <dd className="nums mt-1 font-semibold text-ink">{colones(p.generado)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>

              {visibles.length > PAGE_SIZE && (
                <Paginacion
                  etiqueta="Paginación de paseadores"
                  actual={paginaActual}
                  total={totalPaginas}
                  onCambiar={setPagina}
                  desde={inicioPagina + 1}
                  hasta={finPagina}
                  cuantos={visibles.length}
                  nombre={["paseador", "paseadores"]}
                />
              )}
            </>
          ) : (
            <div className="px-4 py-4 sm:px-6">
              <EmptyState title="Sin paseadores" hint={error ? "Revisa la conexión o los permisos de administrador." : "Cambia el filtro para ver el resto."} />
            </div>
          )}
        </Section>
      </div>
    </Page>
  );
};

/* ── Verificaciones ──────────────────────────────────────────── */

const claveDocumentLabel: Record<VerificationDocumentType, string> = {
  cedula_frente: "admin.verifications.documentLabels.cedula_frente",
  cedula_reverso: "admin.verifications.documentLabels.cedula_reverso",
  hoja_delincuencia: "admin.verifications.documentLabels.hoja_delincuencia",
  permiso_funcionamiento: "admin.verifications.documentLabels.permiso_funcionamiento",
};

const claveVerificationRoleLabel: Record<RolPublico, string> = {
  dueno: "admin.verifications.roleLabels.dueno",
  paseador: "admin.verifications.roleLabels.paseador",
  negocio: "admin.verifications.roleLabels.negocio",
};

const errorMessage = (cause: unknown, t: T) =>
  cause instanceof Error ? cause.message : t("admin.verifications.reviewError");

/* ─────────────────────────────────────────────────────────────
   EL VISOR DE DOCUMENTOS

   Lo que había mostraba UN documento por vez: para comparar la cédula
   por delante con la de atrás —que es literalmente el trabajo— había
   que cerrar, volver a la tarjeta, abrir el otro, cerrar otra vez. Y
   la imagen entraba escalada a la caja, sin acercar y sin girar, así
   que una cédula fotografiada de lado con el teléfono no se podía
   leer. No era un problema de estilo: no se podía hacer la tarea.

   Ahora la ventana es de la PERSONA y no del archivo. Los documentos
   quedan en una tira al costado y se cambia sin cerrar nada.
   ───────────────────────────────────────────────────────────── */

const iconoDocumento: Record<VerificationDocumentType, typeof IdCard> = {
  cedula_frente: IdCard,
  cedula_reverso: IdCard,
  hoja_delincuencia: FileText,
  permiso_funcionamiento: Building2,
};

const esPdf = (nombre: string) => /\.pdf$/i.test(nombre);

/* El encuadre es 1. Se puede bajar hasta un tercio para ver una hoja
   larga entera —una hoja de delincuencia no se lee, se comprueba que
   esté completa y a nombre de quien dice— y subir hasta seis veces
   para el número de cédula.

   Los pasos son multiplicativos, no de suma fija: pasar de 0.5 a 0.75
   es un salto enorme y de 5 a 5.25 no se nota. Multiplicar mantiene
   el mismo salto percibido en todo el recorrido. */
const ESCALA_MIN = 0.33;
const ESCALA_MAX = 6;
const PASO_ESCALA = 1.25;
const acotar = (valor: number) =>
  Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, Number(valor.toFixed(2))));

const VisorDocumentos = ({
  solicitud,
  inicial,
  onClose,
  onRevisar,
}: {
  solicitud: AdminVerificationRequest;
  inicial: string;
  onClose: () => void;
  /* Lanza si la revisión falla; el visor muestra el motivo y se queda
     abierto. Si resuelve, la solicitud ya salió de la lista y el visor
     se cierra solo. */
  onRevisar: (
    estado: "aprobado" | "rechazado",
    observacion?: string,
  ) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [activo, setActivo] = useState(inicial);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [veredicto, setVeredicto] = useState<"aprobado" | "rechazado" | null>(
    null,
  );
  const [observacion, setObservacion] = useState("");
  const [rechazando, setRechazando] = useState(false);

  const [escala, setEscala] = useState(1);
  const [giro, setGiro] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const arranque = useRef<{ x: number; y: number } | null>(null);

  /* La imagen girada un cuarto de vuelta ya no cabe en el mismo hueco:
     lo que era su ancho pasa a medirse contra el alto. Sin medir la
     caja no hay forma de calcularlo, y el recorte se come justo el
     número de cédula. */
  const caja = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });

  const documentos = solicitud.documentos;
  const documento =
    documentos.find((d) => d.id_documento === activo) ?? documentos[0];
  const indice = documentos.findIndex(
    (d) => d.id_documento === documento?.id_documento,
  );
  const url = documento ? urls[documento.id_documento] : undefined;
  const pdf = documento ? esPdf(documento.nombre_archivo) : false;
  const vertical = giro % 180 !== 0;

  const mover = useCallback(
    (paso: number) => {
      if (documentos.length < 2) return;
      const siguiente =
        (indice + paso + documentos.length) % documentos.length;
      setActivo(documentos[siguiente].id_documento);
    },
    [documentos, indice],
  );

  const ajustar = useCallback(() => {
    setEscala(1);
    setGiro(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  const acercar = useCallback((factor: number) => {
    setEscala((actual) => {
      const nueva = acotar(actual * factor);
      if (nueva <= 1) setOffset({ x: 0, y: 0 });
      return nueva;
    });
  }, []);

  /* Volver al encuadre en cada documento. Heredar el zoom del anterior
     deja el siguiente abierto en una esquina cualquiera. */
  useEffect(() => {
    ajustar();
  }, [activo, ajustar]);

  useEffect(() => {
    const elemento = caja.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) =>
      setMedida({
        ancho: entrada.contentRect.width,
        alto: entrada.contentRect.height,
      }),
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  /* El enlace firmado vive cinco minutos. Se pide al abrir cada
     documento y se guarda: volver al anterior no vuelve a pedirlo. */
  useEffect(() => {
    if (!documento || urls[documento.id_documento]) return;
    let vivo = true;
    setCargando(true);
    setFallo(null);
    getVerificationDocumentUrl(documento, t)
      .then((firmada) => {
        if (vivo) {
          setUrls((actuales) => ({
            ...actuales,
            [documento.id_documento]: firmada,
          }));
        }
      })
      .catch((cause) => {
        if (vivo) setFallo(errorMessage(cause, t));
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [documento, urls]);

  const acciones = useRef({ onClose, mover, acercar, ajustar });
  useEffect(() => {
    acciones.current = { onClose, mover, acercar, ajustar };
  });

  useEffect(() => {
    const devolver = document.activeElement as HTMLElement | null;
    const previo = document.body.style.overflow;

    const alTeclear = (evento: KeyboardEvent) => {
      const teclas: Record<string, () => void> = {
        Escape: () => acciones.current.onClose(),
        ArrowRight: () => acciones.current.mover(1),
        ArrowLeft: () => acciones.current.mover(-1),
        "+": () => acciones.current.acercar(PASO_ESCALA),
        "=": () => acciones.current.acercar(PASO_ESCALA),
        "-": () => acciones.current.acercar(1 / PASO_ESCALA),
        "0": () => acciones.current.ajustar(),
      };
      const accion = teclas[evento.key];
      if (accion) {
        evento.preventDefault();
        accion();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = previo;
      document.removeEventListener("keydown", alTeclear);
      devolver?.focus?.();
    };
  }, []);

  const descargar = async () => {
    if (!documento) return;
    setDescargando(true);
    setFallo(null);
    try {
      await downloadVerificationDocument(documento, t);
      aviso.ok(t("admin.verifications.viewer.downloaded"), { detalle: documento.nombre_archivo });
    } catch (cause) {
      setFallo(errorMessage(cause, t));
      aviso.error(cause, { respaldo: t("admin.verifications.viewer.downloadFailed") });
    } finally {
      setDescargando(false);
    }
  };

  const resolver = async (estado: "aprobado" | "rechazado") => {
    if (estado === "rechazado" && observacion.trim().length < 5) {
      setFallo(t("admin.verifications.rejectMinLength"));
      return;
    }
    setVeredicto(estado);
    setFallo(null);
    try {
      await onRevisar(
        estado,
        estado === "rechazado" ? observacion.trim() : undefined,
      );
      onClose();
      if (estado === "aprobado") {
        aviso.ok(t("admin.verifications.verified", { nombre: solicitud.nombre }), {
          detalle: t("admin.verifications.verifiedDetail"),
        });
      } else {
        aviso.dato(t("admin.verifications.rejected", { nombre: solicitud.nombre }), {
          detalle: t("admin.verifications.rejectedDetail"),
        });
      }
    } catch (cause) {
      setFallo(errorMessage(cause, t));
      setVeredicto(null);
    }
  };

/* En un teléfono no hay rueda ni teclado: los botones de acercar
     serían el único camino, y sobre una cédula eso es inservible. Con
     dos dedos se pellizca; con uno se arrastra cuando ya está
     acercada.

     Los punteros se llevan en un `Map` y no en estado porque cambian
     en cada movimiento del dedo: pintar en cada uno tiraría el gesto
     al suelo. Solo la escala y el desplazamiento —lo que sí se ve—
     pasan por `setState`. */
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const pellizco = useRef<{ distancia: number; escala: number } | null>(null);

  const separacion = () => {
    const [a, b] = [...punteros.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const tomar = (evento: ReactPointerEvent<HTMLImageElement>) => {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    punteros.current.set(evento.pointerId, {
      x: evento.clientX,
      y: evento.clientY,
    });

    if (punteros.current.size === 2) {
      pellizco.current = { distancia: separacion(), escala };
      arranque.current = null;
      setArrastrando(false);
      return;
    }

    /* Por debajo del encuadre la imagen es más chica que su hueco: no
       hay nada fuera de vista que valga la pena arrastrar. */
    if (escala <= 1) return;
    arranque.current = {
      x: evento.clientX - offset.x,
      y: evento.clientY - offset.y,
    };
    setArrastrando(true);
  };

  const llevar = (evento: ReactPointerEvent<HTMLImageElement>) => {
    if (!punteros.current.has(evento.pointerId)) return;
    punteros.current.set(evento.pointerId, {
      x: evento.clientX,
      y: evento.clientY,
    });

    if (punteros.current.size === 2 && pellizco.current) {
      const ahora = separacion();
      if (pellizco.current.distancia > 0) {
        setEscala(
          acotar(pellizco.current.escala * (ahora / pellizco.current.distancia)),
        );
      }
      return;
    }

    if (!arranque.current) return;
    setOffset({
      x: evento.clientX - arranque.current.x,
      y: evento.clientY - arranque.current.y,
    });
  };

  const soltar = (evento: ReactPointerEvent<HTMLImageElement>) => {
    punteros.current.delete(evento.pointerId);
    if (punteros.current.size < 2) pellizco.current = null;
    if (punteros.current.size === 0) {
      arranque.current = null;
      setArrastrando(false);
    }
  };

  const botonHerramienta =
    "grid h-8 w-8 place-items-center rounded-full text-rail-text transition-[background-color,color,transform] duration-150 ease-out hover:bg-rail-hover hover:text-white active:scale-[0.94] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-rail-text";

  /* `suave` en la envoltura: el portal cuelga de `document.body` y
     queda fuera del `<div class="suave">` de `AppShell`, así que sin
     esto se pierden el radio por defecto y la barra de desplazamiento
     fina. Fue lo que dejó la ventana cuadrada al portalizarla. */
  return createPortal(
    <div className="suave fixed inset-0 z-[100] flex p-2.5 sm:p-6">
      <button
        type="button"
        aria-label={t("admin.verifications.viewer.close")}
        onClick={onClose}
        className="anim-fade absolute inset-0 bg-rail/80 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="visor-documentos-title"
        className="anim-rise relative m-auto flex h-[calc(100dvh-1.25rem)] max-h-[920px] w-full max-w-[1080px] min-w-0 flex-col overflow-hidden rounded-[20px] bg-surface sm:h-[90dvh]"
      >
        <header className="flex items-center gap-3 bg-rail px-4 py-3 sm:px-5">
          {solicitud.foto_perfil ? (
            <img
              src={solicitud.foto_perfil}
              alt=""
              aria-hidden
              className="h-9 w-9 shrink-0 rounded-full bg-rail-hover object-cover"
            />
          ) : (
            <Avatar nombre={solicitud.nombre} size={36} />
          )}

          <div className="min-w-0 flex-1">
            <h3
              id="visor-documentos-title"
              className="titular truncate text-[15px] text-white"
            >
              {solicitud.nombre}
            </h3>
            <p className="truncate text-[11.5px] text-rail-text">
              {solicitud.correo} · {solicitud.zona}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void descargar()}
            disabled={descargando || !documento}
            className={`${btnSecondary} shrink-0 disabled:cursor-wait disabled:opacity-60`}
          >
            {descargando ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span className="hidden sm:inline">{t("admin.verifications.viewer.download")}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("admin.verifications.viewer.close")}
            className={botonHerramienta}
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* La tira de documentos. En horizontal arriba cuando la
              pantalla es angosta, en columna al costado cuando hay
              sitio: en un teléfono una columna de 190 px se come la
              mitad del ancho útil. */}
          <nav
            aria-label={t("admin.verifications.viewer.documentsAria")}
            className="flex shrink-0 gap-1.5 overflow-x-auto bg-sunken p-2 sm:w-[212px] sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:p-2.5"
          >
            {documentos.map((doc) => {
              const Icono = iconoDocumento[doc.tipo_documento];
              const seleccionado = doc.id_documento === documento?.id_documento;

              return (
                <button
                  key={doc.id_documento}
                  type="button"
                  onClick={() => setActivo(doc.id_documento)}
                  aria-current={seleccionado ? "true" : undefined}
                  className={`flex shrink-0 items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] sm:w-full ${
                    seleccionado
                      ? "bg-rail text-white"
                      : "text-ink-soft hover:bg-white/70 hover:text-ink"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                      seleccionado
                        ? "bg-accent text-rail"
                        : "bg-white text-ink-mute"
                    }`}
                  >
                    <Icono size={14} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium whitespace-nowrap sm:whitespace-normal">
                      {t(claveDocumentLabel[doc.tipo_documento])}
                    </span>
                    <span
                      className={`hidden truncate text-[10.5px] sm:block ${
                        seleccionado ? "text-rail-text" : "text-ink-mute"
                      }`}
                    >
                      {doc.nombre_archivo}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Barra de herramientas. Los controles de acercar sobran
                en un PDF: el lector del navegador trae los suyos. */}
            <div className="flex shrink-0 items-center gap-1 overflow-x-auto bg-sunken px-2 py-1.5">
              <button
                type="button"
                onClick={() => mover(-1)}
                disabled={documentos.length < 2}
                aria-label={t("admin.verifications.viewer.previousDocument")}
                className={`${botonHerramienta} text-ink-soft hover:bg-white hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-soft`}
              >
                <ChevronLeft size={17} />
              </button>
              <span className="nums min-w-[3.5rem] text-center text-[11.5px] font-medium text-ink-mute">
                {t("admin.verifications.viewer.ofTotal", { actual: indice + 1, total: documentos.length })}
              </span>
              <button
                type="button"
                onClick={() => mover(1)}
                disabled={documentos.length < 2}
                aria-label={t("admin.verifications.viewer.nextDocument")}
                className={`${botonHerramienta} text-ink-soft hover:bg-white hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-soft`}
              >
                <ChevronRight size={17} />
              </button>

              {!pdf && (
                <>
                  <span aria-hidden className="mx-1.5 h-5 w-px bg-suelo" />

                  <button
                    type="button"
                    onClick={() => acercar(-0.5)}
                    disabled={escala <= ESCALA_MIN}
                    aria-label={t("admin.verifications.viewer.zoomOut")}
                    className={`${botonHerramienta} text-[17px] leading-none font-semibold text-ink-soft hover:bg-white hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-soft`}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={ajustar}
                    className="nums min-w-[3.5rem] rounded-full py-1 text-center text-[11.5px] font-medium text-ink-soft transition-colors duration-150 hover:bg-white hover:text-ink"
                  >
                    {Math.round(escala * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => acercar(0.5)}
                    disabled={escala >= ESCALA_MAX}
                    aria-label={t("admin.verifications.viewer.zoomIn")}
                    className={`${botonHerramienta} text-[17px] leading-none font-semibold text-ink-soft hover:bg-white hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-soft`}
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={() => setGiro((actual) => (actual + 90) % 360)}
                    aria-label={t("admin.verifications.viewer.rotate")}
                    className={`${botonHerramienta} text-ink-soft hover:bg-white hover:text-ink`}
                  >
                    <RefreshCw size={15} />
                  </button>
                </>
              )}

              <span className="ml-auto hidden shrink-0 pr-1 text-[11px] whitespace-nowrap text-ink-mute lg:block">
                {t("admin.verifications.viewer.shortcutsHint")}
              </span>
            </div>

            <div
              ref={caja}
              /* La rueda acerca y aleja. No se llama `preventDefault`
                 a propósito: React engancha `wheel` en modo pasivo y
                 avisaría por consola. No hace falta — acá dentro no
                 hay nada que se desplace, y el scroll del documento
                 está bloqueado mientras la ventana está abierta. */
              onWheel={(evento) => {
                if (pdf) return;
                acercar(evento.deltaY < 0 ? PASO_ESCALA : 1 / PASO_ESCALA);
              }}
              className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-sunken"
            >
              {cargando && (
                <p className="flex items-center gap-2 text-[13px] text-ink-soft">
                  <Loader size={16} className="animate-spin" /> {t("admin.verifications.viewer.opening")}
                </p>
              )}

              {!cargando && fallo && (
                <div className="max-w-[320px] px-6 text-center">
                  <AlertCircle
                    size={22}
                    aria-hidden
                    className="mx-auto text-danger"
                  />
                  <p className="mt-2 text-[13px] font-semibold text-ink">
                    {t("admin.verifications.viewer.openFailed")}
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-soft">{fallo}</p>
                </div>
              )}

              {!cargando && !fallo && url && documento && (
                pdf ? (
                  <iframe
                    src={url}
                    title={t(claveDocumentLabel[documento.tipo_documento])}
                    className="h-full w-full bg-white"
                  />
                ) : (
                  <img
                    src={url}
                    alt={t(claveDocumentLabel[documento.tipo_documento])}
                    draggable={false}
                    onPointerDown={tomar}
                    onPointerMove={llevar}
                    onPointerUp={soltar}
                    onPointerCancel={soltar}
                    style={{
                      maxWidth: vertical ? medida.alto : medida.ancho,
                      maxHeight: vertical ? medida.ancho : medida.alto,
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${escala}) rotate(${giro}deg)`,
                      cursor:
                        escala > 1
                          ? arrastrando
                            ? "grabbing"
                            : "grab"
                          : "default",
                      transition: arrastrando
                        ? "none"
                        : "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)",
                      /* Sin esto el navegador se queda con el gesto y
                         desplaza o hace su propio zoom antes de que
                         lleguen los eventos de puntero. */
                      touchAction: "none",
                    }}
                    className="block origin-center object-contain select-none"
                  />
                )
              )}
            </div>
          </div>
        </div>

        {/* Aprobar o rechazar sin salir.

            Antes había que cerrar el visor, buscar otra vez la tarjeta
            en la lista y recién ahí decidir — con los documentos ya
            fuera de la vista, que es justo cuando hay que acordarse de
            lo que decían. La decisión va donde está la evidencia.

            En pantalla angosta los botones se apilan y ocupan todo el
            ancho: son la acción principal y no deben quedar como dos
            píldoras chiquitas en una esquina. */}
        <footer className="shrink-0 bg-surface px-4 py-3 sm:px-5">
          {veredicto === null && rechazando && (
            <div className="mb-3">
              <label
                htmlFor="visor-observacion"
                className="rotulo text-ink-mute"
              >
                {t("admin.verifications.viewer.whatToFix")}
              </label>
              <textarea
                id="visor-observacion"
                autoFocus
                rows={2}
                maxLength={500}
                value={observacion}
                onChange={(evento) => setObservacion(evento.target.value)}
                placeholder={t("admin.verifications.viewer.whatToFixPlaceholder")}
                className={`${input} mt-1.5 resize-y`}
              />
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {rechazando && (
              <button
                type="button"
                disabled={veredicto !== null}
                onClick={() => {
                  setRechazando(false);
                  setObservacion("");
                  setFallo(null);
                }}
                className={`${btnQuiet} w-full sm:w-auto`}
              >
                {t("common.cancel")}
              </button>
            )}

            <button
              type="button"
              disabled={veredicto !== null}
              onClick={() => {
                if (rechazando) void resolver("rechazado");
                else {
                  setRechazando(true);
                  setFallo(null);
                }
              }}
              className={`${btnDanger} w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto`}
            >
              {veredicto === "rechazado" ? (
                <Loader size={15} className="animate-spin" />
              ) : (
                <X size={15} strokeWidth={2.2} />
              )}
              {rechazando ? t("admin.verifications.confirmReject") : t("admin.verifications.reject")}
            </button>

            {!rechazando && (
              <button
                type="button"
                disabled={veredicto !== null}
                onClick={() => void resolver("aprobado")}
                className={`${btnPrimary} w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto`}
              >
                {veredicto === "aprobado" ? (
                  <Loader size={15} className="animate-spin" />
                ) : (
                  <Check size={15} strokeWidth={2.2} />
                )}
                {t("admin.verifications.approveProfile")}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export const VerificacionesAdmin = () => {
  const { t, localeTag } = useTranslation();
  const verificationDate = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const [pendientes, setPendientes] = useState<AdminVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [observation, setObservation] = useState("");
  const [error, setError] = useState<string | null>(null);
  /* La ventana se abre para una PERSONA, con el documento que se tocó
     como primero. Antes el estado guardaba un archivo suelto y su
     enlace, y por eso no había forma de pasar al siguiente sin
     cerrarla. */
  const [revision, setRevision] = useState<{ solicitud: AdminVerificationRequest; inicial: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPendientes(await listVerificationRequests());
    } catch (cause) {
      setError(errorMessage(cause, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  /* La llamada desnuda, sin atrapar nada: la usan los dos caminos —la
     tarjeta de la lista y el pie del visor— y cada uno enseña el error
     donde corresponde. */
  const revisar = async (
    request: AdminVerificationRequest,
    status: "aprobado" | "rechazado",
    observacion?: string,
  ) => {
    await reviewVerificationRequest(request.id_usuario, status, observacion);
    setPendientes((current) =>
      current.filter((item) => item.id_usuario !== request.id_usuario),
    );
  };

  const review = async (request: AdminVerificationRequest, status: "aprobado" | "rechazado") => {
    if (status === "rechazado" && observation.trim().length < 5) {
      setError(t("admin.verifications.rejectMinLength"));
      return;
    }
    setProcessingId(request.id_usuario);
    setError(null);
    try {
      await revisar(request, status, status === "rechazado" ? observation.trim() : undefined);
      setRejectingId(null);
      setObservation("");
      if (status === "aprobado") {
        aviso.ok(t("admin.verifications.verified", { nombre: request.nombre }), {
          detalle: t("admin.verifications.verifiedDetail"),
        });
      } else {
        aviso.dato(t("admin.verifications.rejected", { nombre: request.nombre }), {
          detalle: t("admin.verifications.rejectedDetail"),
        });
      }
    } catch (cause) {
      setError(errorMessage(cause, t));
      aviso.error(cause, { respaldo: t("admin.verifications.reviewFailed") });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Page>
      <PageHeader
        title={t("admin.verifications.title")}
        subtitle={t("admin.verifications.subtitle")}
        action={<Badge tono="warn">{t("admin.verifications.pendingBadge", { count: pendientes.length })}</Badge>}
      />

      {error && <p role="alert" className="bg-danger-wash px-5 py-4 text-[13px] text-danger">{error}</p>}

      {loading && (
        <Skeleton name="admin-verificaciones" loading>
          <div />
        </Skeleton>
      )}

      {pendientes.map((v) => (
        <article key={v.id_usuario} className="anim-rise bg-surface px-6 py-5">
          <div className="flex flex-wrap items-start gap-5">
            {v.foto_perfil ? <img src={v.foto_perfil} alt={t("common.photoOf", { nombre: v.nombre })} className="h-16 w-16 flex-shrink-0 rounded-full bg-sunken object-cover" /> : <Avatar nombre={v.nombre} size={64} />}

            <div className="min-w-[200px] flex-1">
              <h3 className="text-[15px] font-semibold text-ink">{v.nombre}</h3>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {v.correo} · {v.zona}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-mute">{v.roles.map((role) => t(claveVerificationRoleLabel[role])).join(" + ") || t("admin.verifications.walkerProfileRequested")} · {t("admin.verifications.sentOn", { fecha: verificationDate.format(new Date(v.fecha_solicitud)) })}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {v.documentos.length === 0 ? (
                  <p className="text-[12.5px] text-ink-mute">{t("admin.verifications.noDocuments")}</p>
                ) : (
                  <>
                    <button type="button" onClick={() => setRevision({ solicitud: v, inicial: v.documentos[0].id_documento })} className={btnPrimary}>
                      <Eye size={14} /> {t(v.documentos.length === 1 ? "admin.verifications.reviewDocuments" : "admin.verifications.reviewDocumentsPlural", { count: v.documentos.length })}
                    </button>
                    {/* Cada documento sigue teniendo su propia entrada:
                        abren la misma ventana, ya puesta en ese. */}
                    {v.documentos.map((documento) => (
                      <button key={documento.id_documento} type="button" onClick={() => setRevision({ solicitud: v, inicial: documento.id_documento })} className={btnSecondary}>
                        {t(claveDocumentLabel[documento.tipo_documento])}
                      </button>
                    ))}
                  </>
                )}
              </div>
              {rejectingId === v.id_usuario && (
                <div className="mt-4">
                  <label htmlFor={`observation-${v.id_usuario}`} className="rotulo text-ink-mute">{t("admin.verifications.observationLabel")}</label>
                  <textarea id={`observation-${v.id_usuario}`} value={observation} onChange={(event) => setObservation(event.target.value)} rows={3} maxLength={500} className={`${input} mt-2 resize-y`} placeholder={t("admin.verifications.observationPlaceholder")} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void review(v, "aprobado")}
                disabled={processingId !== null}
                className={btnPrimary}
              >
                {processingId === v.id_usuario ? <Loader size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.2} />}
                {t("admin.verifications.approveProfile")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (rejectingId === v.id_usuario) void review(v, "rechazado");
                  else { setRejectingId(v.id_usuario); setObservation(""); setError(null); }
                }}
                disabled={processingId !== null}
                className={btnDanger}
              >
                <X size={15} strokeWidth={2.2} />
                {rejectingId === v.id_usuario ? t("admin.verifications.confirmReject") : t("admin.verifications.reject")}
              </button>
            </div>
          </div>
        </article>
      ))}

      {!loading && pendientes.length === 0 && (
        <EmptyState
          title={t("admin.verifications.empty.title")}
          hint={t("admin.verifications.empty.hint")}
        />
      )}

      {revision && (
        <VisorDocumentos
          solicitud={revision.solicitud}
          inicial={revision.inicial}
          onClose={() => setRevision(null)}
          onRevisar={(estado, observacion) =>
            revisar(revision.solicitud, estado, observacion)
          }
        />
      )}

    </Page>
  );
};

/* ── Usuarios ────────────────────────────────────────────────── */

/* Esta pantalla se había ido del sistema por un token que no existe.

   Las tarjetas de métricas, los botones de paginación, las fichas de
   mano y el botón de inactivar llevaban `border-border/60`. No hay
   ningún `--color-border` en `index.css`, así que Tailwind no genera
   esa clase; queda el `border` pelado, que es un píxel del color del
   texto: navy sólido alrededor de todo. Con esquinas `rounded-lg` de
   ocho píxeles en una casa donde no hay una sola esquina de ocho
   píxeles. Eso era lo que se veía horrible.

   Lo que vuelve a la casa:

     · Las métricas son el `Stat` de siempre —el mismo que Finanzas y
       Zonas—, con el filete de proporción para las dos que son parte
       del total. Sin ícono, sin borde, sin levantarse al pasar.
     · La paginación es una pista hundida con píldoras, como
       `FilterTabs`: los números son un solo control con una sola
       respuesta, igual que los filtros. Anterior y Siguiente son
       discos.
     · Inactivar deja de ser un botón con borde y pasa a ser un
       interruptor. Y con eso sobra la columna de estado: el
       interruptor ES el estado. Siete columnas pasan a seis, con
       reparto fijo, y la fila inactiva se atenúa para que se lea
       inactiva sin necesitar la palabra.
     · Debajo de `lg` no hay tabla: fichas apiladas, sin borde. */

const claveRolLabel: Record<Rol, string> = {
  dueno: "admin.users.roleLabels.dueno",
  paseador: "admin.users.roleLabels.paseador",
  negocio: "admin.users.roleLabels.negocio",
  admin: "admin.users.roleLabels.admin",
};
const rolesLabel = (roles: Rol[], t: T) => roles.map((rol) => t(claveRolLabel[rol])).join(" + ") || t("admin.users.noRole");
/** Chip para la cuenta sin rol. `label` es corto porque vive en una
    columna de cien píxeles; `detalle` es la explicación completa y va
    en el tooltip. */
const perfilSinRol = (estado: AdminUser["estado_paseador"], t: T) =>
  estado === "pendiente"
    ? { label: t("admin.users.noRoleStatus.pendingLabel"), detalle: t("admin.users.noRoleStatus.pendingDetail"), className: "bg-warn-wash text-warn" }
    : estado === "rechazado"
      ? { label: t("admin.users.noRoleStatus.rejectedLabel"), detalle: t("admin.users.noRoleStatus.rejectedDetail"), className: "bg-danger-wash text-danger" }
      : estado === "aprobado"
        ? { label: t("admin.users.noRoleStatus.missingRoleLabel"), detalle: t("admin.users.noRoleStatus.missingRoleDetail"), className: "bg-danger-wash text-danger" }
        : { label: t("admin.users.noRoleStatus.noneLabel"), detalle: t("admin.users.noRoleStatus.noneDetail"), className: "bg-sunken text-ink-mute" };
const PAGE_SIZE = 8;

const chipRol =
  "inline-flex h-6 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-[10px] font-semibold uppercase leading-none tracking-wide";
const chipRolTono: Record<Rol, string> = {
  dueno: "bg-neutral-wash text-ink-soft",
  paseador: "bg-accent-wash text-accent-dark",
  negocio: "bg-warn-wash text-warn",
  admin: "bg-rail/10 text-rail",
};

/** Los chips de rol de un usuario, o el chip de «sin rol» que dice
    por qué. Igual en la tabla y en la ficha. */
const ChipsRol = ({ usuario }: { usuario: AdminUser }) => {
  const { t } = useTranslation();
  if (usuario.roles.length) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {usuario.roles.map((rol) => (
          <span key={rol} className={`${chipRol} ${chipRolTono[rol]}`}>{t(claveRolLabel[rol])}</span>
        ))}
      </div>
    );
  }

  const perfil = perfilSinRol(usuario.estado_paseador, t);
  return (
    <span className={`${chipRol} ${perfil.className}`} title={perfil.detalle}>
      {perfil.label}
    </span>
  );
};

const FotoUsuario = ({ usuario, size }: { usuario: AdminUser; size: number }) =>
  usuario.foto_perfil ? (
    <img
      src={usuario.foto_perfil}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <Avatar nombre={usuario.nombre} size={size} />
  );

export const UsuariosAdmin = () => {
  const { user } = useAuth();
  const { t, localeTag } = useTranslation();
  const dateFormatter = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });
  const { usuarios, loading, procesandoId, error, mensaje, cambiarEstado, clearMessage } = useAdminUsuarios();
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<"todos" | Rol>("todos");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("todos");
  const [pagina, setPagina] = useState(1);
  const [confirmar, setConfirmar] = useState<AdminUser | null>(null);

  const visibles = useMemo(() => usuarios.filter((usuario) => {
    const texto = `${usuario.nombre} ${usuario.telefono ?? ""} ${usuario.zona?.nombre ?? ""}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase()) && (filtroRol === "todos" || usuario.roles.includes(filtroRol)) && (filtroEstado === "todos" || (filtroEstado === "activos" ? usuario.activo : !usuario.activo));
  }), [busqueda, filtroEstado, filtroRol, usuarios]);
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicioPagina = (paginaActual - 1) * PAGE_SIZE;
  const finPagina = Math.min(inicioPagina + PAGE_SIZE, visibles.length);
  const paginaUsuarios = visibles.slice(inicioPagina, inicioPagina + PAGE_SIZE);
  const activos = usuarios.filter((usuario) => usuario.activo).length;
  const duenos = usuarios.filter((usuario) => usuario.roles.includes("dueno")).length;
  const porcentaje = (n: number) => (usuarios.length ? Math.round((n / usuarios.length) * 100) : 0);
  const cambiarFiltroRol = (value: "todos" | Rol) => { setFiltroRol(value); setPagina(1); };
  const cambiarFiltroEstado = (value: "todos" | "activos" | "inactivos") => { setFiltroEstado(value); setPagina(1); };
  const exportar = () => {
    const encabezado = [t("admin.users.csv.name"), t("admin.users.csv.email"), t("admin.users.csv.phone"), t("admin.users.csv.roles"), t("admin.users.csv.zone"), t("admin.users.csv.registration"), t("admin.users.csv.status")].join(",");
    const csv = [encabezado, ...visibles.map((u) => [u.nombre, u.correo ?? "", u.telefono ?? "", rolesLabel(u.roles, t), u.zona?.nombre ?? t("admin.users.csv.noZone"), u.fecha_registro, u.activo ? t("admin.users.csv.active") : t("admin.users.csv.inactive")].map((v) => `"${v.replaceAll('"', '""')}"`).join(","))].join("\n");
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    enlace.download = "usuarios-tuaniscan.csv";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(enlace.href);
    aviso.ok(t("admin.users.exported"), {
      detalle: t(visibles.length === 1 ? "admin.users.exportedRowSingular" : "admin.users.exportedRowPlural", { count: visibles.length }),
    });
  };

  /** El interruptor de una fila. No cambia nada por sí solo: abre la
      confirmación, y el estado que muestra es el que dice el servidor.
      La cuenta propia lo lleva apagado —trabado, no escondido— para
      que se vea que la regla existe. */
  const interruptorDe = (usuario: AdminUser) => {
    const esCuentaActual = usuario.id_usuario === user?.id;
    return (
      <Interruptor
        activo={usuario.activo}
        etiqueta={
          esCuentaActual
            ? t("admin.users.isYourAccountSwitch")
            : usuario.activo
              ? t("admin.users.deactivateSwitch", { nombre: usuario.nombre })
              : t("admin.users.activateSwitch", { nombre: usuario.nombre })
        }
        deshabilitado={esCuentaActual}
        ocupado={procesandoId === usuario.id_usuario}
        onCambio={() => { clearMessage(); setConfirmar(usuario); }}
      />
    );
  };

  const botonNotificaciones = useContext(NotificationButtonContext);

  return (
    <Page wide>
      <PageHeader
        title={t("admin.users.title")}
        subtitle={t("admin.users.subtitle")}
        action={
          <div className="flex w-full items-center gap-2.5 sm:w-auto">
            <button type="button" onClick={exportar} className={`${btnSecondary} flex-1 sm:flex-none`}>
              <Download size={14} strokeWidth={1.9} /> {t("admin.users.exportView")}
            </button>
            {botonNotificaciones}
          </div>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Stat etiqueta={t("admin.users.stats.registered")} valor={String(usuarios.length)} nota={t("admin.users.stats.allAccounts")} />
        <Stat
          etiqueta={t("admin.users.stats.activeAccounts")}
          valor={String(activos)}
          nota={t("admin.users.stats.percentOfTotal", { pct: porcentaje(activos) })}
          parte={usuarios.length ? activos / usuarios.length : 0}
        />
        <Stat
          etiqueta={t("admin.users.stats.petOwners")}
          valor={String(duenos)}
          nota={t("admin.users.stats.percentOfTotal", { pct: porcentaje(duenos) })}
          parte={usuarios.length ? duenos / usuarios.length : 0}
        />
      </div>

      <div className="min-w-0">
        <Section
          title={t("admin.users.directory")}
          aside={<Badge tono="accent">{visibles.length} {visibles.length === 1 ? t("admin.users.resultSingular") : t("admin.users.resultPlural")}</Badge>}
          bodyClass="px-4 py-4 sm:px-6"
        >
          <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.6fr)_minmax(150px,1fr)_minmax(150px,1fr)]">
            <label className="relative block sm:col-span-2 lg:col-span-1">
              <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-mute" aria-hidden />
              <span className="sr-only">{t("admin.users.searchAria")}</span>
              <input
                value={busqueda}
                onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }}
                className={`${input} pl-10`}
                placeholder={t("admin.users.searchPlaceholder")}
              />
            </label>
            <Combo value={filtroRol} onChange={(v) => cambiarFiltroRol(v as typeof filtroRol)} aria-label={t("admin.users.roleFilterAria")} options={[{ value: "todos", label: t("admin.users.allRoles") }, { value: "dueno", label: t("admin.users.owners") }, { value: "paseador", label: t("admin.users.walkers") }, { value: "negocio", label: t("admin.users.businesses") }, { value: "admin", label: t("admin.users.administrators") }]} />
            <Combo value={filtroEstado} onChange={(v) => cambiarFiltroEstado(v as typeof filtroEstado)} aria-label={t("admin.users.statusFilterAria")} options={[{ value: "todos", label: t("admin.users.allStatuses") }, { value: "activos", label: t("admin.users.active") }, { value: "inactivos", label: t("admin.users.inactive") }]} />
          </div>
        </Section>
      </div>

      {(error || mensaje) && (
        <div aria-live="polite" className={`rounded-[14px] px-4 py-3 text-[13px] ${error ? "bg-danger-wash text-danger" : "bg-ok-wash text-ok"}`}>
          {error ?? mensaje}
        </div>
      )}

      <div className="min-w-0">
        <Section bodyClass="">
          {loading ? (
            <Skeleton name="admin-tabla" loading><div /></Skeleton>
          ) : visibles.length === 0 ? (
            <div className="px-4 py-4 sm:px-6">
              <EmptyState title={t("admin.users.empty.title")} hint={error ? t("admin.users.empty.withError") : t("admin.users.empty.withoutError")} />
            </div>
          ) : (
            <>
              {/* ── De lg para arriba: la tabla ──
                  Reparto fijo: seis columnas que no se empujan entre
                  sí. Lo largo —nombre, correo, zona— se corta con
                  puntos y se lee entero al pasar el cursor. */}
              <div className="hidden lg:block">
                <Table
                  caption={t("admin.users.directory")}
                  min="min-w-[840px]"
                  padX="px-4"
                  columnas={[
                    { label: t("admin.users.columns.user"), ancho: "w-[25%]" },
                    { label: t("admin.users.columns.roles"), ancho: "w-[16%]" },
                    { label: t("admin.users.columns.contact"), ancho: "w-[22%]" },
                    { label: t("admin.users.columns.zone"), ancho: "w-[12%]" },
                    { label: t("admin.users.columns.registration"), ancho: "w-[13%]" },
                    { label: t("admin.users.columns.active"), ancho: "w-[12%]", align: "right" },
                  ]}
                >
                  {paginaUsuarios.map((usuario) => {
                    const esCuentaActual = usuario.id_usuario === user?.id;
                    return (
                      <tr key={usuario.id_usuario} className="transition-colors duration-150 hover:bg-accent-wash/25">
                        <td className="px-4 py-3">
                          <div className={`flex min-w-0 items-center gap-3 transition-opacity duration-200 ${usuario.activo ? "" : "opacity-55"}`}>
                            <FotoUsuario usuario={usuario} size={36} />
                            <span className="min-w-0">
                              <span className="block truncate text-[13.5px] font-semibold text-ink" title={usuario.nombre}>{usuario.nombre}</span>
                              {esCuentaActual ? (
                                <span className="mt-0.5 block text-[11px] font-medium text-accent-deep">{t("admin.users.yourAccount")}</span>
                              ) : (
                                <span className="nums mt-0.5 block text-[11px] text-ink-mute">ID {usuario.id_usuario.slice(0, 8)}</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ChipsRol usuario={usuario} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`block truncate text-[12.5px] ${usuario.correo ? "font-medium text-ink" : "text-ink-mute italic"}`} title={usuario.correo ?? undefined}>{usuario.correo || t("admin.users.noEmail")}</span>
                          <span className="nums mt-0.5 block truncate text-[11.5px] text-ink-mute">{usuario.telefono || t("admin.users.noPhone")}</span>
                        </td>
                        <td className={`truncate px-4 py-3 text-[12.5px] ${usuario.zona?.nombre ? "text-ink-soft" : "text-ink-mute italic"}`} title={usuario.zona?.nombre}>{usuario.zona?.nombre || t("admin.users.noZone")}</td>
                        <td className="nums px-4 py-3 text-[12.5px] whitespace-nowrap text-ink-soft">{dateFormatter.format(new Date(usuario.fecha_registro))}</td>
                        <td className="px-4 py-3 text-right">
                          {interruptorDe(usuario)}
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              </div>

              {/* ── Debajo de lg: fichas ── */}
              <ul className="grid gap-2.5 p-4 lg:hidden">
                {paginaUsuarios.map((usuario) => {
                  const esCuentaActual = usuario.id_usuario === user?.id;
                  return (
                    <li key={usuario.id_usuario} className="rounded-[14px] bg-sunken/60 p-4">
                      <div className={`flex items-start gap-3 transition-opacity duration-200 ${usuario.activo ? "" : "opacity-55"}`}>
                        <FotoUsuario usuario={usuario} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-ink">{usuario.nombre}</p>
                          {esCuentaActual ? (
                            <p className="mt-0.5 text-[11px] font-medium text-accent-deep">{t("admin.users.yourAccount")}</p>
                          ) : (
                            <p className="nums mt-0.5 text-[11px] text-ink-mute">ID {usuario.id_usuario.slice(0, 8)}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <ChipsRol usuario={usuario} />
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12px]">
                        <div className="col-span-2">
                          <dt className="rotulo text-ink-mute">{t("admin.users.columns.contact")}</dt>
                          <dd className={`mt-1 break-words ${usuario.correo ? "font-medium text-ink" : "text-ink-mute italic"}`}>{usuario.correo || t("admin.users.noEmail")}</dd>
                          <dd className="nums mt-0.5 text-ink-mute">{usuario.telefono || t("admin.users.noPhone")}</dd>
                        </div>
                        <div>
                          <dt className="rotulo text-ink-mute">{t("admin.users.columns.zone")}</dt>
                          <dd className={`mt-1 break-words ${usuario.zona?.nombre ? "text-ink-soft" : "text-ink-mute italic"}`}>{usuario.zona?.nombre || t("admin.users.noZone")}</dd>
                        </div>
                        <div>
                          <dt className="rotulo text-ink-mute">{t("admin.users.columns.registration")}</dt>
                          <dd className="nums mt-1 text-ink-soft">{dateFormatter.format(new Date(usuario.fecha_registro))}</dd>
                        </div>
                      </dl>

                      <div className="mt-3.5 flex items-center justify-between gap-3">
                        <span className="text-[12px] text-ink-soft">
                          {esCuentaActual ? t("admin.users.cannotDeactivateOwn") : usuario.activo ? t("admin.users.accountActive") : t("admin.users.accountInactive")}
                        </span>
                        {interruptorDe(usuario)}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <Paginacion
                etiqueta={t("admin.users.pagination")}
                actual={paginaActual}
                total={totalPaginas}
                onCambiar={setPagina}
                desde={inicioPagina + 1}
                hasta={finPagina}
                cuantos={visibles.length}
                nombre={[t("admin.users.userWord"), t("admin.users.usersWord")]}
              />
            </>
          )}
        </Section>
      </div>

      {confirmar && (
        <Confirmar
          titulo={confirmar.activo ? t("admin.users.deactivateTitle") : t("admin.users.activateTitle")}
          tono={confirmar.activo ? "peligro" : "normal"}
          confirmar={confirmar.activo ? t("admin.users.confirmDeactivate") : t("admin.users.confirmActivate")}
          ocupado={procesandoId === confirmar.id_usuario}
          onCancelar={() => setConfirmar(null)}
          onConfirmar={() => void cambiarEstado(confirmar).then(() => setConfirmar(null)).catch(() => undefined)}
          cuerpo={
            <>
              {confirmar.activo ? t("admin.users.willDeactivate") : t("admin.users.willActivate")} <strong className="font-semibold text-ink">{confirmar.nombre}</strong>.{" "}
              {confirmar.activo
                ? t("admin.users.bodyDeactivate")
                : t("admin.users.bodyActivate")}
              {error && <span className="mt-3 block rounded-[10px] bg-danger-wash px-3 py-2 text-danger">{error}</span>}
            </>
          }
        />
      )}
    </Page>
  );
};

/* ── Paseos de la plataforma ─────────────────────────────────── */

const claveEstadoPaseo: Record<EstadoPaseo, string> = {
  solicitado: "admin.walks.status.requested",
  confirmado: "admin.walks.status.confirmed",
  en_curso: "admin.walks.status.inCourse",
  finalizado: "admin.walks.status.completed",
  cancelado: "admin.walks.status.cancelled",
};

const claveFiltroPaseosAdmin: Record<string, string> = {
  Todos: "admin.walks.filters.all",
  "En curso": "admin.walks.filters.inCourse",
  Incidencias: "admin.walks.filters.incidents",
};

const tonoPaseo = (estado: EstadoPaseo) =>
  estado === "en_curso"
    ? "accent"
    : estado === "finalizado"
      ? "ok"
      : estado === "confirmado"
        ? "neutral"
        : estado === "solicitado"
          ? "warn"
          : "danger";

const formatoCuando = (fecha: string, hora: string, localeTag: string) =>
  `${new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(new Date(`${fecha}T00:00:00`))} ${hora.slice(0, 5)}`;

export const PaseosAdmin = () => {
  const { t, localeTag } = useTranslation();
  const botonNotificaciones = useContext(NotificationButtonContext);
  const [filtro, setFiltro] = useState("Todos");
  const [pagina, setPagina] = useState(1);
  const [paseos, setPaseos] = useState<AdminWalkMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    listAdminWalks()
      .then(setPaseos)
      .catch((cause) => setError(cause instanceof Error ? cause.message : t("admin.walks.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const enCurso = paseos.filter((p) => p.estado === "en_curso");

  /* No existe un estado propio de "incidencia" en el modelo de datos:
     el más cercano a un paseo con problema es uno que terminó
     cancelado. */
  const visibles = paseos.filter((p) =>
    filtro === "Todos"
      ? true
      : filtro === "Incidencias"
        ? p.estado === "cancelado"
        : p.estado === "en_curso"
  );

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicioPagina = (paginaActual - 1) * PAGE_SIZE;
  const finPagina = Math.min(inicioPagina + PAGE_SIZE, visibles.length);
  const paginaPaseos = visibles.slice(inicioPagina, inicioPagina + PAGE_SIZE);

  const cambiarFiltro = (value: string) => { setFiltro(value); setPagina(1); };

  return (
    <Page wide>
      <PageHeader
        title={t("admin.walks.title")}
        subtitle={t("admin.walks.subtitle")}
        action={
          <div className="flex items-center gap-2.5">
            <Badge tono="accent">{t("admin.walks.inCourse", { count: enCurso.length })}</Badge>
            {botonNotificaciones}
          </div>
        }
      />

      <div className="bg-surface px-3 py-3">
        <FilterTabs
          label={t("admin.walks.filterLabel")}
          options={["Todos", "En curso", "Incidencias"].map((o) => ({ value: o, label: t(claveFiltroPaseosAdmin[o]) }))}
          value={filtro}
          onChange={cambiarFiltro}
        />
      </div>

      <Section bodyClass="">
        {error ? (
          <div role="alert" className="bg-danger-wash px-6 py-5 text-[13px] text-danger">{error}</div>
        ) : loading ? (
          <div className="flex items-center gap-2 px-6 py-10 text-[13px] text-ink-soft">
            <Loader size={16} className="animate-spin" /> {t("admin.walks.loading")}
          </div>
        ) : visibles.length > 0 ? (
          <>
            <Table
              caption={t("admin.walks.caption", { filtro: t(claveFiltroPaseosAdmin[filtro]).toLowerCase() })}
              columnas={[
                { label: t("admin.walks.columns.walk") },
                { label: t("admin.walks.columns.owner") },
                { label: t("admin.walks.columns.walker") },
                { label: t("admin.walks.columns.when") },
                { label: t("admin.walks.columns.status") },
                { label: t("admin.walks.columns.amount"), align: "right" },
              ]}
            >
              {paginaPaseos.map((p) => (
                <tr key={p.id_paseo} className="transition-colors duration-150 hover:bg-sunken">
                  <td className="px-6 py-4 align-top">
                    <p className="text-[13px] font-medium text-ink">{p.mascota}</p>
                    <p className="nums mt-0.5 text-[11.5px] text-ink-mute">ID {p.id_paseo.slice(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4 align-top text-[12.5px] text-ink-soft">
                    {p.dueno}
                  </td>
                  <td className="px-6 py-4 align-top text-[12.5px] text-ink-soft">
                    {p.paseador}
                  </td>
                  <td className="nums px-6 py-4 align-top text-[12.5px] text-ink-soft">
                    {formatoCuando(p.fecha, p.hora_inicio, localeTag)}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <Badge tono={tonoPaseo(p.estado)}>{t(claveEstadoPaseo[p.estado])}</Badge>
                  </td>
                  <td className="nums px-6 py-4 text-right align-top text-[13px] font-semibold text-ink">
                    {colones(p.precio)}
                  </td>
                </tr>
              ))}
            </Table>

            <Paginacion
              etiqueta={t("admin.walks.pagination")}
              actual={paginaActual}
              total={totalPaginas}
              onCambiar={setPagina}
              desde={inicioPagina + 1}
              hasta={finPagina}
              cuantos={visibles.length}
              nombre={[t("admin.walks.walkWord"), t("admin.walks.walksWord")]}
            />
          </>
        ) : (
          <EmptyState title={t("admin.walks.empty.title")} hint={t("admin.walks.empty.hint")} />
        )}
      </Section>
    </Page>
  );
};
