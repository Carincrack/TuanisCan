import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, PawPrint, Siren, Syringe } from "lucide-react";
import {
  Badge,
  MockPhoto,
  Page,
  PageHeader,
  Section,
  Stat,
  Table,
  btnPrimary,
  btnSecondary,
  colones,
} from "./ui";

const mascotas = [
  { nombre: "Rocky", raza: "Labrador", foto: "/mock/dog-rocky.jpg", estado: "Al día" as const },
  { nombre: "Michi", raza: "Doméstico pelo corto", foto: "/mock/cat-1.jpg", estado: "Vacuna pendiente" as const },
  { nombre: "Luna", raza: "Border Collie", foto: "/mock/dog-luna.jpg", estado: "Al día" as const },
];

const proximos = [
  { hora: "Hoy · 16:00", mascota: "Rocky", paseador: "María Fernández", precio: 4500, estado: "En curso" as const },
  { hora: "Mañana · 07:30", mascota: "Luna", paseador: "Luis Rojas", precio: 5200, estado: "Programado" as const },
  { hora: "22 ago · 16:00", mascota: "Rocky", paseador: "María Fernández", precio: 4500, estado: "Programado" as const },
];

const accesos = [
  { to: "/paseadores", label: "Buscar paseador", descripcion: "Perfiles verificados de tu zona." },
  { to: "/mascotas", label: "Registrar mascota", descripcion: "Agrega un perfil nuevo." },
  { to: "/mascotas-perdidas", label: "Reportar pérdida", descripcion: "Avisa a la comunidad." },
];

const EmployeeHome = () => (
  <Page>
    <PageHeader
      title="Panel general"
      subtitle="Miércoles 19 de agosto · resumen de tu cuenta"
      action={
        <button type="button" className={btnPrimary}>
          <CalendarDays size={15} strokeWidth={2} />
          Agendar paseo
        </button>
      }
    />

    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      <Stat etiqueta="Mascotas" valor="3" nota="1 con vacuna pendiente" />
      <Stat etiqueta="Paseos del mes" valor="9" nota="2 esta semana" />
      <Stat etiqueta="Gasto del mes" valor={colones(19400)} nota="5 paseos pagados" />
      <Stat etiqueta="Pendiente" valor={colones(4500)} nota="1 cobro" />
    </div>

    <Section
      title="Próximos paseos"
      aside={
        <Link
          to="/paseos"
          className="flex items-center gap-1 text-[12.5px] font-semibold text-accent-dark hover:underline"
        >
          Ver todos
          <ArrowRight size={13} strokeWidth={2.2} aria-hidden />
        </Link>
      }
      bodyClass="pt-4"
    >
      <Table
        caption="Paseos programados y en curso"
        columnas={[
          { label: "Cuándo" },
          { label: "Mascota" },
          { label: "Paseador" },
          { label: "Estado" },
          { label: "Precio", align: "right" },
        ]}
      >
        {proximos.map((p) => (
          <tr key={p.hora + p.mascota}>
            <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">{p.hora}</td>
            <td className="px-6 py-3.5 text-[13px] font-medium text-ink">
              {p.mascota}
            </td>
            <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">{p.paseador}</td>
            <td className="px-6 py-3.5">
              <Badge tono={p.estado === "En curso" ? "accent" : "ok"}>
                {p.estado}
              </Badge>
            </td>
            <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
              {colones(p.precio)}
            </td>
          </tr>
        ))}
      </Table>
    </Section>

    <div className="grid gap-3 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Section
          title="Mis mascotas"
          aside={
            <Link
              to="/mascotas"
              className="flex items-center gap-1 text-[12.5px] font-semibold text-accent-dark hover:underline"
            >
              Administrar
              <ArrowRight size={13} strokeWidth={2.2} aria-hidden />
            </Link>
          }
          bodyClass="px-6 pt-4 pb-6"
        >
          <ul className="grid gap-3 sm:grid-cols-3">
            {mascotas.map((m) => (
              <li key={m.nombre} className="bg-sunken">
                <MockPhoto src={m.foto} alt={`Foto de ${m.nombre}`} />
                <div className="px-4 py-3">
                  <p className="text-[14px] font-semibold text-ink">{m.nombre}</p>
                  <p className="mt-0.5 text-[12px] text-ink-soft">{m.raza}</p>
                  <span className="mt-2 inline-block">
                    <Badge tono={m.estado === "Al día" ? "ok" : "warn"}>
                      {m.estado}
                    </Badge>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="flex flex-col gap-3">
        <Section title="Requiere atención" bodyClass="px-6 pt-4 pb-5">
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-3">
              <Syringe
                size={15}
                strokeWidth={1.9}
                aria-hidden
                className="mt-0.5 flex-shrink-0 text-warn"
              />
              <p className="text-[12.5px] leading-snug text-ink-soft">
                Vacuna antirrábica de Michi vence el 28 de agosto.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <Siren
                size={15}
                strokeWidth={1.9}
                aria-hidden
                className="mt-0.5 flex-shrink-0 text-danger"
              />
              <p className="text-[12.5px] leading-snug text-ink-soft">
                3 mascotas reportadas como perdidas en tu zona.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <PawPrint
                size={15}
                strokeWidth={1.9}
                aria-hidden
                className="mt-0.5 flex-shrink-0 text-ink-mute"
              />
              <p className="text-[12.5px] leading-snug text-ink-soft">
                Tienes 2 paseos sin calificar.
              </p>
            </li>
          </ul>
        </Section>

        <Section title="Accesos rápidos" bodyClass="px-6 pt-4 pb-5">
          <ul className="flex flex-col gap-2">
            {accesos.map((a) => (
              <li key={a.to}>
                <Link to={a.to} className={`${btnSecondary} w-full justify-start`}>
                  <span className="flex flex-col items-start text-left">
                    <span className="text-[13px] font-semibold text-ink">
                      {a.label}
                    </span>
                    <span className="text-[11.5px] font-normal text-ink-soft">
                      {a.descripcion}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  </Page>
);

export default EmployeeHome;
