import { useState } from "react";
import { Check, Download, ShieldCheck, X } from "lucide-react";
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

interface PaseadorAdmin {
  nombre: string;
  foto: string;
  zona: string;
  paseos: number;
  rating: number;
  generado: number;
  estado: "Activo" | "Inactivo" | "Suspendido";
}

const paseadoresAdmin: PaseadorAdmin[] = [
  { nombre: "María Fernández", foto: "/mock/walker-1.jpg", zona: "Curridabat", paseos: 312, rating: 4.9, generado: 1404000, estado: "Activo" },
  { nombre: "Luis Rojas", foto: "/mock/walker-2.jpg", zona: "Heredia", paseos: 268, rating: 4.8, generado: 1018400, estado: "Activo" },
  { nombre: "Carolina Mora", foto: "/mock/walker-3.jpg", zona: "Escazú", paseos: 241, rating: 4.9, generado: 1253200, estado: "Activo" },
  { nombre: "Andrés Blanco", foto: "/mock/walker-4.jpg", zona: "Cartago", paseos: 94, rating: 4.6, generado: 329000, estado: "Inactivo" },
  { nombre: "Valeria Chacón", foto: "/mock/walker-5.jpg", zona: "Escazú", paseos: 187, rating: 4.7, generado: 897600, estado: "Activo" },
  { nombre: "Jorge Salas", foto: "/mock/walker-6.jpg", zona: "Curridabat", paseos: 41, rating: 3.9, generado: 159900, estado: "Suspendido" },
];

const tonoPaseador = (e: PaseadorAdmin["estado"]) =>
  e === "Activo" ? "ok" : e === "Suspendido" ? "danger" : "neutral";

export const PaseadoresAdmin = () => {
  const [filtro, setFiltro] = useState("Todos");

  const visibles = paseadoresAdmin.filter((p) =>
    filtro === "Todos" ? true : p.estado === filtro.slice(0, -1)
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

      <Section bodyClass="">
        {visibles.length > 0 ? (
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
              <tr key={p.nombre}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.foto}
                      alt=""
                      aria-hidden
                      className="h-9 w-9 flex-shrink-0 bg-sunken object-cover"
                    />
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
                  <Badge tono={tonoPaseador(p.estado)}>{p.estado}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="Sin paseadores" hint="Cambia el filtro para ver el resto." />
        )}
      </Section>
    </Page>
  );
};

/* ── Verificaciones ──────────────────────────────────────────── */

const pendientesVerificacion = [
  { id: "V-041", nombre: "Andrés Blanco", foto: "/mock/walker-4.jpg", zona: "Cartago", enviado: "hace 2 días", faltante: "Cédula y comprobante de domicilio" },
  { id: "V-042", nombre: "Jorge Salas", foto: "/mock/walker-6.jpg", zona: "Curridabat", enviado: "hace 1 día", faltante: "Hoja de delincuencia" },
  { id: "V-043", nombre: "Sofía Ureña", foto: "/mock/walker-5.jpg", zona: "Heredia", enviado: "hace 4 horas", faltante: "Cédula por ambos lados" },
  { id: "V-044", nombre: "Kevin Araya", foto: "/mock/walker-2.jpg", zona: "Alajuela", enviado: "hace 2 horas", faltante: "Foto de perfil y cédula" },
];

export const VerificacionesAdmin = () => {
  const [resueltas, setResueltas] = useState<Record<string, boolean>>({});
  const pendientes = pendientesVerificacion.filter((v) => !resueltas[v.id]);

  return (
    <Page>
      <PageHeader
        title="Verificaciones"
        subtitle="Paseadores esperando aprobación para empezar a recibir solicitudes."
        action={<Badge tono="warn">{pendientes.length} pendientes</Badge>}
      />

      {pendientes.map((v) => (
        <article key={v.id} className="anim-rise bg-surface px-6 py-5">
          <div className="flex flex-wrap items-center gap-5">
            <img
              src={v.foto}
              alt=""
              aria-hidden
              className="h-16 w-16 flex-shrink-0 bg-sunken object-cover"
            />

            <div className="min-w-[200px] flex-1">
              <h3 className="text-[15px] font-semibold text-ink">{v.nombre}</h3>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {v.zona} · enviado {v.enviado}
              </p>
              <p className="mt-2.5 bg-warn-wash px-3 py-2 text-[12.5px] text-warn">
                Falta: {v.faltante}
              </p>
            </div>

            <div className="flex gap-px">
              <button
                type="button"
                onClick={() => setResueltas({ ...resueltas, [v.id]: true })}
                className={btnPrimary}
              >
                <Check size={15} strokeWidth={2.2} />
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => setResueltas({ ...resueltas, [v.id]: true })}
                className={btnDanger}
              >
                <X size={15} strokeWidth={2.2} />
                Rechazar
              </button>
            </div>
          </div>
        </article>
      ))}

      {pendientes.length === 0 && (
        <EmptyState
          title="No hay verificaciones pendientes"
          hint="Todas las solicitudes fueron revisadas."
        />
      )}
    </Page>
  );
};

/* ── Usuarios ────────────────────────────────────────────────── */

const usuarios = [
  { nombre: "Ana Corrales", correo: "ana@correo.com", zona: "San José", mascotas: 3, paseos: 42, desde: "mar 2026", estado: "Activo" as const },
  { nombre: "Diego Solís", correo: "diego@correo.com", zona: "Curridabat", mascotas: 1, paseos: 28, desde: "abr 2026", estado: "Activo" as const },
  { nombre: "Laura Vega", correo: "laura@correo.com", zona: "San Pedro", mascotas: 2, paseos: 9, desde: "ago 2026", estado: "Activo" as const },
  { nombre: "Roberto Jiménez", correo: "roberto@correo.com", zona: "Escazú", mascotas: 1, paseos: 3, desde: "jul 2026", estado: "Inactivo" as const },
  { nombre: "Priscilla Ramírez", correo: "pris@correo.com", zona: "Heredia", mascotas: 4, paseos: 61, desde: "feb 2026", estado: "Activo" as const },
];

export const UsuariosAdmin = () => (
  <Page>
    <PageHeader
      title="Usuarios"
      subtitle="Dueños de mascotas registrados en la plataforma."
      action={
        <button type="button" className={btnSecondary}>
          <Download size={14} strokeWidth={1.9} />
          Exportar
        </button>
      }
    />

    <div className="grid gap-px bg-canvas sm:grid-cols-3">
      <Stat etiqueta="Dueños registrados" valor="418" nota="+37 este mes" />
      <Stat etiqueta="Mascotas" valor="726" nota="1.7 por dueño" />
      <Stat etiqueta="Retención 90 días" valor="71%" nota="+4 pts vs julio" />
    </div>

    <Section bodyClass="">
      <Table
        caption="Usuarios dueños registrados"
        columnas={[
          { label: "Usuario" },
          { label: "Zona" },
          { label: "Mascotas", align: "right" },
          { label: "Paseos", align: "right" },
          { label: "Desde" },
          { label: "Estado" },
        ]}
      >
        {usuarios.map((u) => (
          <tr key={u.correo}>
            <td className="px-6 py-3">
              <div className="flex items-center gap-3">
                <Avatar nombre={u.nombre} size={30} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {u.nombre}
                  </p>
                  <p className="truncate text-[11.5px] text-ink-mute">{u.correo}</p>
                </div>
              </div>
            </td>
            <td className="px-6 py-3 text-[12.5px] text-ink-soft">{u.zona}</td>
            <td className="nums px-6 py-3 text-right text-[12.5px] text-ink-soft">
              {u.mascotas}
            </td>
            <td className="nums px-6 py-3 text-right text-[12.5px] text-ink-soft">
              {u.paseos}
            </td>
            <td className="px-6 py-3 text-[12.5px] text-ink-soft">{u.desde}</td>
            <td className="px-6 py-3">
              <Badge tono={u.estado === "Activo" ? "ok" : "neutral"}>
                {u.estado}
              </Badge>
            </td>
          </tr>
        ))}
      </Table>
    </Section>
  </Page>
);

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
