import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Download, Eye, Loader, Search, ShieldCheck, UserCheck, UserX, X } from "lucide-react";
import { useAdminPaseadores } from "../hooks/useAdminPaseadores";
import { useAdminUsuarios } from "../hooks/useAdminUsuarios";
import { useAuth } from "../hooks/useAuth";
import {
  downloadVerificationDocument,
  listVerificationRequests,
  getVerificationDocumentUrl,
  reviewVerificationRequest,
} from "../services/verification.service";
import type { AdminUser, AdminVerificationRequest, AdminWalker, RolPublico, VerificationDocument, VerificationDocumentType } from "../types/auth.types";
import {
  Avatar,
  Badge,
  EmptyState,
  FilterTabs,
  Page,
  PageHeader,
  Section,
  Stat,
  Table,
  btnDanger,
  btnPrimary,
  btnSecondary,
  colones,
  input,
} from "./ui";

/* ─────────────────────────────────────────────────────────────
   Panel de la plataforma. Solo para el equipo de TuanisCan:
   se entra por /acceso-interno, que no está enlazado desde
   ninguna pantalla pública.
   ───────────────────────────────────────────────────────────── */

const mesesIngreso = [
  { mes: "Mar", bruto: 1840000 },
  { mes: "Abr", bruto: 2120000 },
  { mes: "May", bruto: 2460000 },
  { mes: "Jun", bruto: 2890000 },
  { mes: "Jul", bruto: 3240000 },
  { mes: "Ago", bruto: 3680000 },
];

const maxIngreso = Math.max(...mesesIngreso.map((m) => m.bruto));

export const PanelAdmin = () => (
  <Page>
    <PageHeader
      title="Panel general"
      subtitle="Estado de la plataforma · miércoles 19 de agosto"
      action={
        <span className="flex items-center gap-2 bg-accent-wash px-4 py-2.5 text-[13px] font-semibold text-accent-dark">
          <ShieldCheck size={15} strokeWidth={1.9} aria-hidden />
          Acceso interno
        </span>
      }
    />

    <div className="grid gap-px bg-canvas sm:grid-cols-2 xl:grid-cols-4">
      <Stat etiqueta="Comisión del mes" valor={colones(552000)} nota="15% de 3.68 M" />
      <Stat etiqueta="Paseos del mes" valor="1 284" nota="+13.6% vs julio" />
      <Stat etiqueta="Paseadores activos" valor="62" nota="de 78 registrados" />
      <Stat etiqueta="Dueños activos" valor="418" nota="+37 este mes" />
    </div>

    <Section title="Volumen bruto por mes" bodyClass="px-6 pt-5 pb-6">
      {/* Barras en CSS: no vale la pena una librería de gráficos para una maqueta. */}
      <ul className="flex h-[180px] items-end gap-3">
        {mesesIngreso.map((m, i) => (
          <li key={m.mes} className="flex flex-1 flex-col items-center gap-2">
            <span className="nums text-[11px] text-ink-soft">
              {(m.bruto / 1_000_000).toFixed(2)} M
            </span>
            <span
              style={{
                height: `${(m.bruto / maxIngreso) * 100}%`,
                animationDelay: `${i * 60}ms`,
              }}
              className="anim-rise w-full bg-accent"
            />
            <span className="text-[11px] font-medium text-ink-mute">{m.mes}</span>
          </li>
        ))}
      </ul>
    </Section>

    <div className="grid gap-3 lg:grid-cols-2">
      <Section title="Top paseadores del mes" bodyClass="">
        <Table
          caption="Paseadores con más paseos completados"
          columnas={[
            { label: "Paseador" },
            { label: "Paseos", align: "right" },
            { label: "Generado", align: "right" },
          ]}
        >
          {[
            { n: "María Fernández", p: 68, g: 306000 },
            { n: "Carolina Mora", p: 54, g: 280800 },
            { n: "Luis Rojas", p: 49, g: 186200 },
            { n: "Valeria Chacón", p: 41, g: 196800 },
          ].map((w) => (
            <tr key={w.n}>
              <td className="px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar nombre={w.n} size={30} />
                  <span className="text-[13px] font-medium text-ink">{w.n}</span>
                </div>
              </td>
              <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">
                {w.p}
              </td>
              <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                {colones(w.g)}
              </td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Cobertura por zona" bodyClass="px-6 pt-4 pb-6">
        <ul className="flex flex-col gap-3">
          {[
            { z: "Curridabat", n: 18, pct: 100 },
            { z: "Escazú", n: 14, pct: 78 },
            { z: "San Pedro", n: 11, pct: 61 },
            { z: "Heredia", n: 9, pct: 50 },
            { z: "Cartago", n: 6, pct: 33 },
            { z: "Alajuela", n: 4, pct: 22 },
          ].map((z, i) => (
            <li key={z.z} className="flex items-center gap-3">
              <span className="w-[84px] flex-shrink-0 text-[12.5px] text-ink-soft">
                {z.z}
              </span>
              <span className="h-2.5 flex-1 bg-sunken">
                <span
                  style={{ width: `${z.pct}%`, animationDelay: `${i * 50}ms` }}
                  className="anim-bar block h-full bg-accent"
                />
              </span>
              <span className="nums w-8 flex-shrink-0 text-right text-[12px] text-ink-mute">
                {z.n}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  </Page>
);

/* ── Finanzas ────────────────────────────────────────────────── */

const liquidaciones = [
  { id: "LQ-0091", periodo: "11 – 17 ago", paseadores: 58, bruto: 892000, comision: 133800, estado: "Pagada" as const },
  { id: "LQ-0090", periodo: "4 – 10 ago", paseadores: 55, bruto: 845000, comision: 126750, estado: "Pagada" as const },
  { id: "LQ-0092", periodo: "18 – 24 ago", paseadores: 62, bruto: 418000, comision: 62700, estado: "Abierta" as const },
  { id: "LQ-0089", periodo: "28 jul – 3 ago", paseadores: 53, bruto: 803000, comision: 120450, estado: "Pagada" as const },
];

export const FinanzasAdmin = () => {
  const [filtro, setFiltro] = useState("Todas");

  const visibles = liquidaciones.filter((l) =>
    filtro === "Todas" ? true : l.estado === (filtro === "Pagadas" ? "Pagada" : "Abierta")
  );

  return (
    <Page>
      <PageHeader
        title="Finanzas"
        subtitle="Comisión de la plataforma y liquidaciones semanales a paseadores."
        action={
          <button type="button" className={btnSecondary}>
            <Download size={14} strokeWidth={1.9} />
            Exportar
          </button>
        }
      />

      <div className="grid gap-px bg-canvas sm:grid-cols-3">
        <Stat etiqueta="Comisión acumulada" valor={colones(2841000)} nota="año en curso" />
        <Stat etiqueta="Por liquidar" valor={colones(355300)} nota="62 paseadores" />
        <Stat etiqueta="Ticket promedio" valor={colones(4520)} nota="por paseo" />
      </div>

      <div className="bg-surface">
        <FilterTabs
          label="Filtrar liquidaciones"
          options={["Todas", "Abiertas", "Pagadas"]}
          value={filtro}
          onChange={setFiltro}
        />
      </div>

      <Section bodyClass="">
        {visibles.length > 0 ? (
          <Table
            caption={`Liquidaciones filtradas por ${filtro.toLowerCase()}`}
            columnas={[
              { label: "Periodo" },
              { label: "Paseadores", align: "right" },
              { label: "Bruto", align: "right" },
              { label: "Comisión", align: "right" },
              { label: "Estado" },
            ]}
          >
            {visibles.map((l) => (
              <tr key={l.id}>
                <td className="px-6 py-3.5">
                  <p className="text-[13px] font-medium text-ink">{l.periodo}</p>
                  <p className="nums text-[11.5px] text-ink-mute">{l.id}</p>
                </td>
                <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">
                  {l.paseadores}
                </td>
                <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">
                  {colones(l.bruto)}
                </td>
                <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                  {colones(l.comision)}
                </td>
                <td className="px-6 py-3.5">
                  <Badge tono={l.estado === "Pagada" ? "ok" : "warn"}>
                    {l.estado}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            title="Sin liquidaciones en este filtro"
            hint="Cambia el filtro para ver el resto."
          />
        )}
      </Section>
    </Page>
  );
};

/* ── Paseadores ──────────────────────────────────────────────── */

const estadoPaseadorLabel: Record<AdminWalker["estado"], string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
};

const tonoPaseador = (estado: AdminWalker["estado"]) =>
  estado === "activo" ? "ok" : estado === "suspendido" ? "danger" : "neutral";

export const PaseadoresAdmin = () => {
  const { paseadores, loading, error } = useAdminPaseadores();
  const [filtro, setFiltro] = useState("Todos");

  const visibles = paseadores.filter((paseador) =>
    filtro === "Todos"
      ? true
      : filtro === "Activos"
        ? paseador.estado === "activo"
        : filtro === "Inactivos"
          ? paseador.estado === "inactivo"
          : paseador.estado === "suspendido"
  );

  return (
    <Page>
      <PageHeader
        title="Paseadores"
        subtitle="Todos los paseadores registrados en la plataforma."
      />

      <div className="bg-surface">
        <FilterTabs
          label="Filtrar paseadores"
          options={["Todos", "Activos", "Inactivos", "Suspendidos"]}
          value={filtro}
          onChange={setFiltro}
        />
      </div>

      {error && (
        <div aria-live="polite" className="bg-danger-wash px-6 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <Section bodyClass="">
        {loading ? (
          <p className="px-6 py-8 text-[13px] text-ink-soft">Cargando paseadores...</p>
        ) : visibles.length > 0 ? (
          <Table
            caption={`Paseadores filtrados por ${filtro.toLowerCase()}`}
            columnas={[
              { label: "Paseador" },
              { label: "Zona" },
              { label: "Paseos", align: "right" },
              { label: "Rating", align: "right" },
              { label: "Generado", align: "right" },
              { label: "Estado" },
            ]}
          >
            {visibles.map((p) => (
              <tr key={p.id_usuario}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    {p.foto_perfil ? (
                      <img
                        src={p.foto_perfil}
                        alt=""
                        aria-hidden
                        className="h-9 w-9 flex-shrink-0 bg-sunken object-cover"
                      />
                    ) : (
                      <Avatar nombre={p.nombre} size={36} />
                    )}
                    <span className="text-[13px] font-medium text-ink">
                      {p.nombre}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3 text-[12.5px] text-ink-soft">{p.zona}</td>
                <td className="nums px-6 py-3 text-right text-[12.5px] text-ink-soft">
                  {p.paseos}
                </td>
                <td className="nums px-6 py-3 text-right text-[12.5px] text-ink-soft">
                  {p.rating}
                </td>
                <td className="nums px-6 py-3 text-right text-[13px] font-semibold text-ink">
                  {colones(p.generado)}
                </td>
                <td className="px-6 py-3">
                  <Badge tono={tonoPaseador(p.estado)}>{estadoPaseadorLabel[p.estado]}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="Sin paseadores" hint={error ? "Revisa la conexión o los permisos de administrador." : "Cambia el filtro para ver el resto."} />
        )}
      </Section>
    </Page>
  );
};

/* ── Verificaciones ──────────────────────────────────────────── */

const documentLabel: Record<VerificationDocumentType, string> = {
  cedula_frente: "Cédula (frente)",
  cedula_reverso: "Cédula (reverso)",
  hoja_delincuencia: "Hoja de delincuencia",
  permiso_funcionamiento: "Permiso de funcionamiento",
};

const verificationRoleLabel: Record<RolPublico, string> = {
  dueno: "Dueño",
  paseador: "Paseador",
  negocio: "Negocio",
};

const verificationDate = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : "No se pudo completar la revisión.";

export const VerificacionesAdmin = () => {
  const [pendientes, setPendientes] = useState<AdminVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [observation, setObservation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [preview, setPreview] = useState<{ document: VerificationDocument; url: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPendientes(await listVerificationRequests());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const review = async (request: AdminVerificationRequest, status: "aprobado" | "rechazado") => {
    if (status === "rechazado" && observation.trim().length < 5) {
      setError("Escribe una observación de al menos 5 caracteres para rechazar.");
      return;
    }
    setProcessingId(request.id_usuario);
    setError(null);
    try {
      await reviewVerificationRequest(request.id_usuario, status, status === "rechazado" ? observation.trim() : undefined);
      setPendientes((current) => current.filter((item) => item.id_usuario !== request.id_usuario));
      setRejectingId(null);
      setObservation("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setProcessingId(null);
    }
  };

  const viewDocument = async (document: VerificationDocument) => {
    setPreviewLoading(document.id_documento);
    setError(null);
    try {
      setPreview({ document, url: await getVerificationDocumentUrl(document) });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPreviewLoading(null);
    }
  };

  const downloadDocument = async () => {
    if (!preview) return;
    setDownloadLoading(true);
    setError(null);
    try {
      await downloadVerificationDocument(preview.document);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Verificaciones"
        subtitle="Solicitudes de identidad pendientes de revisión administrativa."
        action={<Badge tono="warn">{pendientes.length} pendientes</Badge>}
      />

      {error && <p role="alert" className="bg-danger-wash px-5 py-4 text-[13px] text-danger">{error}</p>}

      {loading && <div className="flex items-center gap-2 bg-surface px-6 py-8 text-[13px] text-ink-soft"><Loader size={16} className="animate-spin" /> Cargando solicitudes…</div>}

      {pendientes.map((v) => (
        <article key={v.id_usuario} className="anim-rise bg-surface px-6 py-5">
          <div className="flex flex-wrap items-start gap-5">
            {v.foto_perfil ? <img src={v.foto_perfil} alt={`Foto de ${v.nombre}`} className="h-16 w-16 flex-shrink-0 bg-sunken object-cover" /> : <Avatar nombre={v.nombre} size={64} />}

            <div className="min-w-[200px] flex-1">
              <h3 className="text-[15px] font-semibold text-ink">{v.nombre}</h3>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {v.correo} · {v.zona}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-mute">{v.roles.map((role) => verificationRoleLabel[role]).join(" + ") || "Perfil de paseador solicitado"} · enviado {verificationDate.format(new Date(v.fecha_solicitud))}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {v.documentos.map((document) => (
                  <button key={document.id_documento} type="button" onClick={() => void viewDocument(document)} disabled={previewLoading !== null} className={`${btnSecondary} disabled:cursor-wait disabled:opacity-60`}>
                    {previewLoading === document.id_documento ? <Loader size={14} className="animate-spin" /> : <Eye size={14} />} Ver {documentLabel[document.tipo_documento]}
                  </button>
                ))}
              </div>
              {rejectingId === v.id_usuario && (
                <div className="mt-4">
                  <label htmlFor={`observation-${v.id_usuario}`} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">Observación para el usuario *</label>
                  <textarea id={`observation-${v.id_usuario}`} value={observation} onChange={(event) => setObservation(event.target.value)} rows={3} maxLength={500} className={`${input} mt-2 resize-y`} placeholder="Indica qué documento debe corregir y por qué." />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-px">
              <button
                type="button"
                onClick={() => void review(v, "aprobado")}
                disabled={processingId !== null}
                className={btnPrimary}
              >
                {processingId === v.id_usuario ? <Loader size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.2} />}
                Aprobar perfil
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
                {rejectingId === v.id_usuario ? "Confirmar rechazo" : "Rechazar"}
              </button>
            </div>
          </div>
        </article>
      ))}

      {!loading && pendientes.length === 0 && (
        <EmptyState
          title="No hay verificaciones pendientes"
          hint="Todas las solicitudes fueron revisadas."
        />
      )}

      {preview && (
        <div className="fixed inset-0 z-[100] flex overflow-y-auto bg-[#0b2331]/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
          <button type="button" aria-label="Cerrar vista previa" onClick={() => setPreview(null)} className="absolute inset-0" />
          <section className="relative m-auto flex h-[calc(100dvh-1.5rem)] max-h-[900px] w-full max-w-[1000px] min-w-0 flex-col overflow-hidden bg-surface sm:h-[90dvh]">
            <header className="flex flex-wrap items-center gap-2 bg-rail px-4 py-3 sm:flex-nowrap sm:px-5 sm:py-4">
              <div className="min-w-0 flex-1">
                <h3 id="document-preview-title" className="truncate text-[15px] font-semibold text-white">{documentLabel[preview.document.tipo_documento]}</h3>
                <p className="truncate text-[11.5px] text-rail-text">{preview.document.nombre_archivo}</p>
              </div>
              <button type="button" onClick={() => void downloadDocument()} disabled={downloadLoading} className={`${btnSecondary} flex-shrink-0 disabled:cursor-wait disabled:opacity-60`}>
                {downloadLoading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                <span className="hidden sm:inline">Descargar</span>
              </button>
              <button type="button" onClick={() => setPreview(null)} aria-label="Cerrar vista previa" className="p-2 text-rail-text hover:bg-rail-hover hover:text-white"><X size={19} /></button>
            </header>
            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto bg-sunken p-2 sm:p-4">
              {/\.pdf$/i.test(preview.document.nombre_archivo) ? (
                <iframe src={preview.url} title={documentLabel[preview.document.tipo_documento]} className="h-full min-h-[480px] w-full min-w-0 bg-white" />
              ) : (
                <img src={preview.url} alt={documentLabel[preview.document.tipo_documento]} className="block max-h-full max-w-full object-contain" />
              )}
            </div>
          </section>
        </div>
      )}
    </Page>
  );
};

/* ── Usuarios ────────────────────────────────────────────────── */

const rolLabel: Record<RolPublico, string> = { dueno: "Dueño", paseador: "Paseador", negocio: "Negocio" };
const rolTono = (rol: RolPublico | null) => rol === "paseador" ? "accent" : rol === "negocio" ? "warn" : "neutral";
const rolesLabel = (roles: RolPublico[]) => roles.map((rol) => rolLabel[rol]).join(" + ") || "Sin rol";
const PAGE_SIZE = 8;
const dateFormatter = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" });

export const UsuariosAdmin = () => {
  const { user } = useAuth();
  const { usuarios, loading, procesandoId, error, mensaje, cambiarEstado, clearMessage } = useAdminUsuarios();
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<"todos" | RolPublico>("todos");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("todos");
  const [pagina, setPagina] = useState(1);
  const [confirmar, setConfirmar] = useState<AdminUser | null>(null);

  const visibles = useMemo(() => usuarios.filter((usuario) => {
    const texto = `${usuario.nombre} ${usuario.telefono ?? ""} ${usuario.zona?.nombre ?? ""}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase()) && (filtroRol === "todos" || usuario.roles.includes(filtroRol)) && (filtroEstado === "todos" || (filtroEstado === "activos" ? usuario.activo : !usuario.activo));
  }), [busqueda, filtroEstado, filtroRol, usuarios]);
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginaUsuarios = visibles.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);
  const activos = usuarios.filter((usuario) => usuario.activo).length;
  const duenos = usuarios.filter((usuario) => usuario.roles.includes("dueno")).length;
  const cambiarFiltroRol = (value: "todos" | RolPublico) => { setFiltroRol(value); setPagina(1); };
  const cambiarFiltroEstado = (value: "todos" | "activos" | "inactivos") => { setFiltroEstado(value); setPagina(1); };
  const exportar = () => {
    const csv = ["Nombre,Correo,Telefono,Roles,Zona,Registro,Estado", ...visibles.map((u) => [u.nombre, u.correo ?? "", u.telefono ?? "", rolesLabel(u.roles), u.zona?.nombre ?? "Sin zona", u.fecha_registro, u.activo ? "Activo" : "Inactivo"].map((v) => `"${v.replaceAll('"', '""')}"`).join(","))].join("\n");
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    enlace.download = "usuarios-tuaniscan.csv";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  };

  return (
    <Page>
      <PageHeader title="Usuarios" subtitle="Directorio general de las personas y negocios registrados." action={<button type="button" onClick={exportar} className={btnSecondary}><Download size={14} strokeWidth={1.9} /> Exportar vista</button>} />
      <div className="grid gap-px bg-canvas sm:grid-cols-3">
        <Stat etiqueta="Usuarios registrados" valor={String(usuarios.length)} nota="Todas las cuentas públicas" />
        <Stat etiqueta="Cuentas activas" valor={String(activos)} nota={`${usuarios.length ? Math.round((activos / usuarios.length) * 100) : 0}% del total`} />
        <Stat etiqueta="Dueños de mascotas" valor={String(duenos)} nota="Segmento principal" />
      </div>
      <Section title="Directorio" aside={<span className="text-[12px] text-ink-mute">{visibles.length} resultados</span>} bodyClass="px-4 py-4 sm:px-6">
        <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_160px_160px]">
          <label className="relative block"><Search size={15} className="absolute top-3 left-3 text-ink-mute" aria-hidden /><span className="sr-only">Buscar usuarios</span><input value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }} className={`${input} pl-9`} placeholder="Buscar por nombre, teléfono o zona" /></label>
          <select value={filtroRol} onChange={(event) => cambiarFiltroRol(event.target.value as typeof filtroRol)} className={input} aria-label="Filtrar por rol"><option value="todos">Todos los roles</option><option value="dueno">Dueños</option><option value="paseador">Paseadores</option><option value="negocio">Negocios</option></select>
          <select value={filtroEstado} onChange={(event) => cambiarFiltroEstado(event.target.value as typeof filtroEstado)} className={input} aria-label="Filtrar por estado"><option value="todos">Todos los estados</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select>
        </div>
      </Section>
      {(error || mensaje) && <div aria-live="polite" className={`px-6 py-3 text-[13px] ${error ? "bg-danger-wash text-danger" : "bg-ok-wash text-ok"}`}>{error ?? mensaje}</div>}
      <Section bodyClass="">
        {loading ? <p className="px-6 py-8 text-[13px] text-ink-soft">Cargando directorio...</p> : visibles.length === 0 ? <EmptyState title="No hay usuarios con esos filtros" hint={error ? "Revisa la conexión o los permisos de administrador." : "Prueba con otra búsqueda o limpia los filtros."} /> : <Table caption="Directorio de usuarios" columnas={[{ label: "Usuario" }, { label: "Roles" }, { label: "Contacto" }, { label: "Zona" }, { label: "Registro" }, { label: "Estado" }, { label: "Acciones" }]}>{paginaUsuarios.map((usuario) => {
          const esCuentaActual = usuario.id_usuario === user?.id;
          return <tr key={usuario.id_usuario}><td className="px-6 py-3"><div className="flex items-center gap-3">{usuario.foto_perfil ? <img src={usuario.foto_perfil} alt="" className="h-9 w-9 flex-shrink-0 object-cover" /> : <Avatar nombre={usuario.nombre} size={36} />}<div className="min-w-0"><p className="truncate text-[13px] font-medium text-ink">{usuario.nombre}</p><p className="text-[11px] text-ink-mute">ID {usuario.id_usuario.slice(0, 8)}</p></div></div></td><td className="px-6 py-3"><Badge tono={rolTono(usuario.roles[0] ?? null)}>{rolesLabel(usuario.roles)}</Badge></td><td className="px-6 py-3 text-[12.5px] text-ink-soft"><span className="block">{usuario.correo || "Sin correo"}</span><span className="block text-[11px] text-ink-mute">{usuario.telefono || "Sin teléfono"}</span></td><td className="px-6 py-3 text-[12.5px] text-ink-soft">{usuario.zona?.nombre || "Sin zona"}</td><td className="px-6 py-3 text-[12.5px] text-ink-soft">{dateFormatter.format(new Date(usuario.fecha_registro))}</td><td className="px-6 py-3"><Badge tono={usuario.activo ? "ok" : "neutral"}>{usuario.activo ? "Activo" : "Inactivo"}</Badge></td><td className="px-6 py-3">{esCuentaActual ? <span className="text-[12px] font-medium text-ink-mute">Tu cuenta</span> : <button type="button" disabled={procesandoId === usuario.id_usuario} onClick={() => { clearMessage(); setConfirmar(usuario); }} className={usuario.activo ? btnDanger : btnPrimary}>{procesandoId === usuario.id_usuario ? <Loader size={14} className="animate-spin" /> : usuario.activo ? <UserX size={14} /> : <UserCheck size={14} />}{usuario.activo ? "Inactivar" : "Activar"}</button>}</td></tr>;
        })}</Table>}
      </Section>
      {!loading && visibles.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-6 py-4">
          <span className="text-[12px] text-ink-mute">Página {paginaActual} de {totalPaginas}</span>
          <div className="flex gap-px">
            <button type="button" disabled={paginaActual === 1} onClick={() => setPagina((actual) => Math.max(1, actual - 1))} className={btnSecondary}>Anterior</button>
            <button type="button" disabled={paginaActual === totalPaginas} onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))} className={btnSecondary}>Siguiente</button>
          </div>
        </div>
      )}
      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2331]/60 px-4" role="dialog" aria-modal="true" aria-labelledby="estado-usuario-title">
          <div className="w-full max-w-[440px] bg-surface">
            <div className={`px-6 py-5 ${confirmar.activo ? "bg-danger-wash" : "bg-ok-wash"}`}>
              <h3 id="estado-usuario-title" className={`text-[18px] font-semibold ${confirmar.activo ? "text-danger" : "text-ok"}`}>{confirmar.activo ? "Inactivar usuario" : "Activar usuario"}</h3>
              <p className="mt-2 text-[13px] text-ink-soft">{confirmar.activo ? "La cuenta no podrá usar funciones protegidas aunque conserve una sesión anterior." : "La cuenta recuperará acceso a las funciones protegidas."}</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[13px] text-ink-soft">Vas a {confirmar.activo ? "inactivar" : "activar"} a <strong className="text-ink">{confirmar.nombre}</strong>.</p>
              {error && <p className="mt-4 bg-danger-wash px-3 py-2 text-[13px] text-danger">{error}</p>}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={procesandoId === confirmar.id_usuario} onClick={() => setConfirmar(null)} className={btnSecondary}>Cancelar</button>
                <button type="button" disabled={procesandoId === confirmar.id_usuario} onClick={() => void cambiarEstado(confirmar).then(() => setConfirmar(null)).catch(() => undefined)} className={confirmar.activo ? btnDanger : btnPrimary}>{procesandoId === confirmar.id_usuario ? <Loader size={14} className="animate-spin" /> : confirmar.activo ? <UserX size={14} /> : <UserCheck size={14} />}{confirmar.activo ? "Sí, inactivar" : "Sí, activar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

/* ── Paseos de la plataforma ─────────────────────────────────── */

const paseosPlataforma = [
  { id: "PS-0148", dueno: "Ana Corrales", paseador: "María Fernández", mascota: "Rocky", fecha: "19 ago 16:00", monto: 4500, estado: "En curso" as const },
  { id: "PS-0147", dueno: "Laura Vega", paseador: "Carolina Mora", mascota: "Nube", fecha: "19 ago 09:00", monto: 3800, estado: "Completado" as const },
  { id: "PS-0146", dueno: "Diego Solís", paseador: "Luis Rojas", mascota: "Kira", fecha: "19 ago 11:30", monto: 5200, estado: "Completado" as const },
  { id: "PS-0145", dueno: "Priscilla Ramírez", paseador: "Valeria Chacón", mascota: "Coco", fecha: "18 ago 15:00", monto: 4800, estado: "Incidencia" as const },
  { id: "PS-0144", dueno: "Roberto Jiménez", paseador: "Jorge Salas", mascota: "Max", fecha: "18 ago 08:30", monto: 3900, estado: "Cancelado" as const },
];

const tonoPaseo = (e: (typeof paseosPlataforma)[number]["estado"]) =>
  e === "En curso"
    ? "accent"
    : e === "Completado"
      ? "ok"
      : e === "Incidencia"
        ? "warn"
        : "danger";

export const PaseosAdmin = () => {
  const [filtro, setFiltro] = useState("Todos");

  const visibles = paseosPlataforma.filter((p) =>
    filtro === "Todos"
      ? true
      : filtro === "Incidencias"
        ? p.estado === "Incidencia"
        : p.estado === "En curso"
  );

  return (
    <Page>
      <PageHeader
        title="Paseos"
        subtitle="Actividad de toda la plataforma en tiempo real."
        action={<Badge tono="accent">1 en curso</Badge>}
      />

      <div className="bg-surface">
        <FilterTabs
          label="Filtrar paseos"
          options={["Todos", "En curso", "Incidencias"]}
          value={filtro}
          onChange={setFiltro}
        />
      </div>

      <Section bodyClass="">
        {visibles.length > 0 ? (
          <Table
            caption={`Paseos de la plataforma filtrados por ${filtro.toLowerCase()}`}
            columnas={[
              { label: "Paseo" },
              { label: "Dueño" },
              { label: "Paseador" },
              { label: "Cuándo" },
              { label: "Estado" },
              { label: "Monto", align: "right" },
            ]}
          >
            {visibles.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-3.5">
                  <p className="text-[13px] font-medium text-ink">{p.mascota}</p>
                  <p className="nums text-[11.5px] text-ink-mute">{p.id}</p>
                </td>
                <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">{p.dueno}</td>
                <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">
                  {p.paseador}
                </td>
                <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                  {p.fecha}
                </td>
                <td className="px-6 py-3.5">
                  <Badge tono={tonoPaseo(p.estado)}>{p.estado}</Badge>
                </td>
                <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                  {colones(p.monto)}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="Sin paseos" hint="Cambia el filtro para ver el resto." />
        )}
      </Section>
    </Page>
  );
};
