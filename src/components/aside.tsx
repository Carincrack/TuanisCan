import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Clock, Siren } from "../lib/iconos";
import { RUTA_ADMIN, type Rol } from "../lib/nav";
import { Avatar, Badge, colones } from "./ui";

/* Columna derecha: contexto que acompaña a cualquier pantalla.
   Cambia según el rol porque lo urgente es distinto de cada lado. */

const Bloque = ({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) => (
  <section className="bg-surface">
    <h2 className="px-5 pt-4 pb-3 rotulo text-ink-mute">
      {titulo}
    </h2>
    {children}
  </section>
);

const Fila = ({
  nombre,
  detalle,
  dato,
}: {
  nombre: string;
  detalle: string;
  dato: string;
}) => (
  <div className="flex items-center gap-3 px-5 py-3 hover:bg-sunken">
    <Avatar nombre={nombre} size={34} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-medium text-ink">{nombre}</p>
      <p className="truncate text-[11.5px] text-ink-soft">{detalle}</p>
    </div>
    <span className="nums flex-shrink-0 text-[12px] font-medium text-ink-soft">
      {dato}
    </span>
  </div>
);

const AsideDueno = () => (
  <>
    <Bloque titulo="Próximo paseo">
      <div className="px-5 pb-5">
        <div className="flex items-center gap-2">
          <Badge tono="accent">En curso</Badge>
          <span className="nums text-[12px] text-ink-soft">16:00 – 16:45</span>
        </div>
        <p className="mt-3 text-[15px] font-semibold text-ink">Rocky</p>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          con María Fernández · Curridabat
        </p>
        <Link
          to="/paseo-en-vivo"
          className="group mt-4 flex items-center justify-center gap-2 rounded-full bg-rail px-5 py-2.5 text-[13px] font-semibold text-white transition-[filter,transform] duration-150 ease-out hover:brightness-125 active:scale-[0.97]"
        >
          Ver en vivo
          <ArrowRight
            size={14}
            strokeWidth={2.4}
            aria-hidden
            className="transition-transform duration-200 ease-out group-hover:translate-x-1"
          />
        </Link>
      </div>
    </Bloque>

    <Bloque titulo="Pendientes">
      <div className="flex flex-col">
        <div className="flex items-start gap-3 px-5 py-3">
          <AlertTriangle
            size={15}
            strokeWidth={1.9}
            aria-hidden
            className="mt-0.5 flex-shrink-0 text-warn"
          />
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Vacuna antirrábica de Michi vence el 28 de agosto.
          </p>
        </div>
        <div className="flex items-start gap-3 px-5 py-3">
          <Clock
            size={15}
            strokeWidth={1.9}
            aria-hidden
            className="mt-0.5 flex-shrink-0 text-ink-mute"
          />
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Tienes 2 paseos sin calificar.
          </p>
        </div>
        <div className="px-5 pt-2 pb-5">
          <p className="nums text-[12.5px] text-ink-soft">
            Pendiente de cobro:{" "}
            <span className="font-semibold text-ink">{colones(4500)}</span>
          </p>
        </div>
      </div>
    </Bloque>

    <Bloque titulo="Alertas de tu zona">
      <div className="flex items-start gap-3 px-5 py-3">
        <Siren
          size={15}
          strokeWidth={1.9}
          aria-hidden
          className="mt-0.5 flex-shrink-0 text-danger"
        />
        <p className="text-[12.5px] leading-snug text-ink-soft">
          Nala, golden retriever, perdida hace 3 horas en Curridabat.
        </p>
      </div>
      <div className="px-5 pt-1 pb-5">
        <Link
          to="/mascotas-perdidas"
          className="text-[12.5px] font-semibold text-accent-dark hover:underline"
        >
          Ver los 3 reportes activos
        </Link>
      </div>
    </Bloque>
  </>
);

const AsidePaseador = () => {
  /*
  return (
    <>
      <Bloque titulo="Resumen de hoy">
        <dl className="grid grid-cols-2 gap-2.5">
          <div className="bg-surface px-5 py-4">
            <dt className="text-[11px] text-ink-mute">Paseos</dt>
            <dd className="nums mt-1 text-[20px] font-semibold text-ink">3</dd>
          </div>
          <div className="bg-surface px-5 py-4">
            <dt className="text-[11px] text-ink-mute">Ganado</dt>
            <dd className="nums mt-1 text-[20px] font-semibold text-ink">
              {colones(13700)}
            </dd>
          </div>
          <div className="bg-surface px-5 py-4">
            <dt className="text-[11px] text-ink-mute">Horas</dt>
            <dd className="nums mt-1 text-[20px] font-semibold text-ink">2.5</dd>
          </div>
          <div className="bg-surface px-5 py-4">
            <dt className="text-[11px] text-ink-mute">Rating</dt>
            <dd className="nums mt-1 text-[20px] font-semibold text-ink">4.9</dd>
          </div>
        </dl>
      </Bloque>

      <Bloque titulo="Solicitudes nuevas">
        <div className="flex flex-col">
          <Fila nombre="Ana Corrales" detalle="Rocky · 45 min · hoy" dato={colones(4500)} />
          <Fila nombre="Diego Solís" detalle="Kira · 60 min · mañana" dato={colones(5200)} />
          <Fila nombre="Laura Vega" detalle="Nube · 30 min · 22 ago" dato={colones(3800)} />
        </div>
        <div className="px-5 pt-2 pb-5">
          <Link
            to="/p/solicitudes"
            className="text-[12.5px] font-semibold text-accent-dark hover:underline"
          >
            Revisar las 3 solicitudes
          </Link>
        </div>
      </Bloque>

      <Bloque titulo="Próxima liquidación">
        <div className="px-5 pb-5">
          <p className="nums text-[22px] font-semibold text-ink">{colones(38400)}</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Se deposita el viernes 21 de agosto.
          </p>
        </div>
      </Bloque>
    </>
  );
  */
  return null;
};

const AsideAdmin = () => (
  <>
    <Bloque titulo="Plataforma hoy">
      <dl className="grid grid-cols-2 gap-2.5">
        {[
          { t: "Paseos", v: "148" },
          { t: "Comisión", v: colones(97400) },
          { t: "Activos", v: "62" },
          { t: "Incidencias", v: "2" },
        ].map((d) => (
          <div key={d.t} className="bg-surface px-5 py-4">
            <dt className="text-[11px] text-ink-mute">{d.t}</dt>
            <dd className="nums mt-1 text-[19px] font-semibold text-ink">{d.v}</dd>
          </div>
        ))}
      </dl>
    </Bloque>

    <Bloque titulo="Verificaciones pendientes">
      <div className="flex flex-col">
        <Fila nombre="Andrés Blanco" detalle="Cartago · documentos" dato="2 d" />
        <Fila nombre="Jorge Salas" detalle="Curridabat · antecedentes" dato="1 d" />
        <Fila nombre="Sofía Ureña" detalle="Heredia · documentos" dato="4 h" />
      </div>
      <div className="px-5 pt-2 pb-5">
        <Link
          to={`${RUTA_ADMIN}/verificaciones`}
          className="text-[12.5px] font-semibold text-accent-dark hover:underline"
        >
          Revisar las 4 solicitudes
        </Link>
      </div>
    </Bloque>

    <Bloque titulo="Requiere atención">
      <div className="flex items-start gap-3 px-5 py-3">
        <AlertTriangle
          size={15}
          strokeWidth={1.9}
          aria-hidden
          className="mt-0.5 flex-shrink-0 text-warn"
        />
        <p className="text-[12.5px] leading-snug text-ink-soft">
          2 paseos reportados con incidencia esta semana.
        </p>
      </div>
      <div className="flex items-start gap-3 px-5 pb-5">
        <Clock
          size={15}
          strokeWidth={1.9}
          aria-hidden
          className="mt-0.5 flex-shrink-0 text-ink-mute"
        />
        <p className="text-[12.5px] leading-snug text-ink-soft">
          Liquidación a paseadores programada para el viernes.
        </p>
      </div>
    </Bloque>
  </>
);

export const AsideDeRol = ({ rol }: { rol: Rol }) =>
  rol === "admin" ? (
    <AsideAdmin />
  ) : rol === "paseador" ? (
    <AsidePaseador />
  ) : (
    <AsideDueno />
  );
