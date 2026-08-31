import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import {
  MARCA,
  navPorRol,
  type NavGroup,
  type NavItem,
  type Rol,
} from "../lib/nav";
import type { UserProfile } from "../types/auth.types";
import { useMedia } from "../hooks/useMedia";
import { usePreferencia } from "../hooks/usePreferencia";
import { useCajon } from "../hooks/useCajon";
import ProfileAvatar from "./ProfileAvatar";

/* ─────────────────────────────────────────────────────────────
   El riel de navegación.

   Tres formas de la misma barra, una por ancho de pantalla:

     · menos de 768  cajón que tapa la pantalla, con las
                     obligaciones de un diálogo (ver `useCajon`).
     · 768 a 1279    columna de iconos de 64 px, siempre a la
                     vista. Al pasar el cursor —o al entrar el
                     foco— se abre a 248 px POR ENCIMA del
                     contenido, sin correrlo: en una pantalla de
                     este ancho no sobran 184 px para regalarle a
                     una barra que casi todo el tiempo se ignora.
     · 1280 y más    abierta a 248 px, y el usuario puede plegarla.
                     La decisión se guarda.

   El ancho del riel se anima, pero los iconos no se mueven ni un
   píxel: cada fila es una caja fija de 64 px con el icono centrado
   y, al lado, una columna de 184 px con el texto. Al abrir crece la
   segunda; la primera ya estaba donde tiene que estar. Un riel donde
   los iconos se corren al abrirse se lee como un tirón, y es lo que
   pasa cuando la fila entera se centra con `justify-center`.
   ───────────────────────────────────────────────────────────── */

const ANCHO_ICONOS = 64;
const ANCHO_ABIERTO = 248;

/** Lo que tarda el cajón en salir. Coincide con `.anim-cajon-out`. */
const MS_SALIDA = 220;

/** El cursor tiene que quedarse quieto antes de abrir el riel: si no,
    pasar por encima camino a otro lado lo despliega de un manotazo. */
const MS_ROCE = 90;

/* ── Piezas de una fila ──────────────────────────────────────── */

/** Caja fija donde vive el icono. Ancla de toda la retícula del riel. */
const Icono = ({ children }: { children: ReactNode }) => (
  <span className="flex w-16 flex-shrink-0 items-center justify-center">
    {children}
  </span>
);

/** Columna del texto. Se recorta contra el borde del riel cerrado. */
const Texto = ({
  expandido,
  children,
  className = "",
}: {
  expandido: boolean;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={`flex w-[184px] flex-shrink-0 items-center gap-2 pr-4 transition-opacity ${
      expandido ? "opacity-100 delay-100 duration-200" : "opacity-0 duration-100"
    } ${className}`}
  >
    {children}
  </span>
);

const NavLink = ({
  item,
  expandido,
  orden,
  onNavegar,
}: {
  item: NavItem;
  expandido: boolean;
  orden: number;
  onNavegar?: () => void;
}) => {
  const { pathname } = useLocation();
  const activo = item.to === pathname;
  const { Icon } = item;

  return (
    <Link
      to={item.to}
      onClick={onNavegar}
      aria-current={activo ? "page" : undefined}
      /* Cerrado, el texto sigue en el DOM —de ahí sale el nombre
         accesible— pero queda fuera de la vista. El `title` es para
         quien mira: sin él la columna de iconos es un jeroglífico. */
      title={expandido ? undefined : item.label}
      style={{ animationDelay: `${40 + orden * 26}ms` }}
      className={`anim-nav-in group relative flex h-11 items-center text-[13.5px] transition-colors duration-200 ${
        activo
          ? "bg-rail-hover font-semibold text-white"
          : "text-rail-text hover:bg-rail-hover hover:text-white"
      }`}
    >
      {/* Marca de posición: crece desde el centro al activarse. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] bg-accent transition-transform duration-300 ease-out ${
          activo ? "scale-y-100" : "scale-y-0 group-hover:scale-y-50"
        }`}
      />

      <Icono>
        <span className="relative">
          <Icon
            size={18}
            strokeWidth={1.9}
            className={`transition-[transform,color] duration-300 ease-out ${
              activo
                ? "scale-110 text-accent"
                : "text-rail-mute group-hover:scale-110 group-hover:text-accent"
            }`}
          />
          {/* Cerrado no cabe el contador, pero la señal de que hay algo
              esperando no se puede perder: queda como un punto. */}
          {item.badge != null && !expandido && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-1 h-1.5 w-1.5 bg-accent"
            />
          )}
        </span>
      </Icono>

      <Texto expandido={expandido}>
        <span className="truncate transition-transform duration-300 ease-out group-hover:translate-x-0.5">
          {item.label}
        </span>
        {item.badge != null && (
          <span
            className={`nums ml-auto flex-shrink-0 px-1.5 py-0.5 text-[11px] font-semibold ${
              activo ? "bg-accent text-white" : "bg-rail-mute/25 text-rail-text"
            }`}
          >
            {item.badge}
          </span>
        )}
      </Texto>
    </Link>
  );
};

/* ── Grupo plegable ──────────────────────────────────────────── */

const Grupo = ({
  grupo,
  expandido,
  plegado,
  onAlternar,
  orden,
  onNavegar,
}: {
  grupo: NavGroup;
  expandido: boolean;
  plegado: boolean;
  onAlternar: () => void;
  orden: number;
  onNavegar?: () => void;
}) => {
  const { pathname } = useLocation();
  const id = `grupo-${grupo.titulo.replace(/\s+/g, "-").toLowerCase()}`;
  const contieneActiva = grupo.items.some((item) => item.to === pathname);

  /* Plegar solo tiene sentido con el riel abierto. Cerrado, el título
     no se lee, así que el grupo entero se muestra siempre y la
     separación la hace una raya. */
  const abierto = !expandido || !plegado;

  return (
    <div>
      {expandido ? (
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={!plegado}
          aria-controls={id}
          style={{ animationDelay: `${40 + orden * 26}ms` }}
          className="anim-nav-in group flex w-full items-center pt-4 pb-1.5 text-left"
        >
          <Icono>
            <ChevronDown
              size={13}
              strokeWidth={2.4}
              aria-hidden
              className={`text-rail-mute transition-[transform,color] duration-300 ease-out group-hover:text-rail-text ${
                plegado ? "-rotate-90" : "rotate-0"
              }`}
            />
          </Icono>
          <Texto expandido={expandido}>
            <span className="truncate text-[10px] font-semibold tracking-[0.14em] text-rail-mute uppercase transition-colors duration-200 group-hover:text-rail-text">
              {grupo.titulo}
            </span>
            {/* Plegado con la pantalla activa adentro: el grupo tiene
                que seguir diciendo dónde está parado el usuario. */}
            {plegado && contieneActiva && (
              <span
                aria-hidden
                className="ml-auto h-1.5 w-1.5 flex-shrink-0 bg-accent"
              />
            )}
          </Texto>
        </button>
      ) : (
        <div aria-hidden className="mx-4 my-2 h-px bg-rail-hover" />
      )}

      {/* De `0fr` a `1fr`: la única forma de animar una altura que no
          se conoce sin medirla en JavaScript en cada cuadro. */}
      <div
        id={id}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {grupo.items.map((item, i) => (
            <NavLink
              key={item.to}
              item={item}
              expandido={expandido}
              orden={orden + i + 1}
              onNavegar={onNavegar}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Marca ───────────────────────────────────────────────────── */

const Marca = ({
  expandido,
  anclado,
  onAnclar,
}: {
  expandido: boolean;
  anclado?: boolean;
  onAnclar?: () => void;
}) => (
  /* 56 px, la misma altura que la barra superior: el logo y el título
     de la pantalla quedan en la misma línea al cruzar la costura. */
  <div className="anim-fade flex h-14 flex-shrink-0 items-center">
    <Icono>
      <img
        src={MARCA.logoSimbolo}
        alt=""
        aria-hidden
        className="h-8 w-8 flex-shrink-0 object-contain"
      />
    </Icono>
    <Texto expandido={expandido}>
      <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">
        {MARCA.nombre}
        <span className="text-accent">{MARCA.acento}</span>
      </span>
      {onAnclar && (
        <button
          type="button"
          onClick={onAnclar}
          aria-pressed={anclado}
          title={anclado ? "Plegar el menú" : "Fijar el menú abierto"}
          aria-label={anclado ? "Plegar el menú" : "Fijar el menú abierto"}
          className="ml-auto flex-shrink-0 p-1.5 text-rail-mute transition-colors duration-200 hover:bg-rail-hover hover:text-white"
        >
          {anclado ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      )}
    </Texto>
  </div>
);

/* ── Pie: quién eres y cómo te vas ───────────────────────────── */

const etiquetaRol: Record<Rol, string> = {
  dueno: "Dueño",
  paseador: "Paseador",
  negocio: "Negocio",
  admin: "Admin",
};

const PiePerfil = ({
  profile,
  rol,
  rolesDisponibles,
  expandido,
  onRoleChange,
  onLogout,
}: {
  profile: UserProfile | null;
  rol: Rol;
  rolesDisponibles: Rol[];
  expandido: boolean;
  onRoleChange: (rol: Rol) => void;
  onLogout?: () => void;
}) => {
  const nombre = profile?.nombre || "Usuario";

  return (
    <div className="flex-shrink-0 bg-rail-hover">
      <div
        className="flex h-14 items-center"
        title={expandido ? undefined : nombre}
      >
        <Icono>
          {profile ? (
            <ProfileAvatar profile={profile} size="h-8 w-8" />
          ) : (
            <span className="h-8 w-8 flex-shrink-0 bg-accent" />
          )}
        </Icono>
        <Texto expandido={expandido}>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-white">
              {nombre}
            </span>
            <span className="block truncate text-[11.5px] text-rail-mute">
              {etiquetaRol[rol]}
            </span>
          </span>
        </Texto>
      </div>

      {/* El cambio de perfil solo aparece con el riel abierto: es un
          menú de texto, cerrado no habría nada que leer. */}
      {rolesDisponibles.length > 1 && expandido && (
        <div className="px-4 pb-3">
          <label htmlFor="active-role" className="sr-only">
            Cambiar perfil
          </label>
          <select
            id="active-role"
            value={rol}
            onChange={(evento) => onRoleChange(evento.target.value as Rol)}
            className="w-full bg-rail px-3 py-2 text-[12px] font-medium text-white outline-none transition-colors hover:bg-[#2d6a86]"
          >
            {rolesDisponibles.map((item) => (
              <option key={item} value={item}>
                {etiquetaRol[item]}
              </option>
            ))}
          </select>
        </div>
      )}

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          title={expandido ? undefined : "Cerrar sesión"}
          className="group flex h-11 w-full items-center text-[13px] text-rail-text transition-colors duration-200 hover:bg-[#2d6a86] hover:text-white"
        >
          <Icono>
            <LogOut
              size={16}
              strokeWidth={1.9}
              className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
            />
          </Icono>
          <Texto expandido={expandido}>
            <span className="truncate">Cerrar sesión</span>
          </Texto>
        </button>
      )}
    </div>
  );
};

/* ── El panel completo ───────────────────────────────────────── */

interface PanelProps {
  rol: Rol;
  profile: UserProfile | null;
  rolesDisponibles: Rol[];
  expandido: boolean;
  onRoleChange: (rol: Rol) => void;
  onLogout?: () => void;
  onNavegar?: () => void;
  anclado?: boolean;
  onAnclar?: () => void;
}

const Panel = ({
  rol,
  profile,
  rolesDisponibles,
  expandido,
  onRoleChange,
  onLogout,
  onNavegar,
  anclado,
  onAnclar,
}: PanelProps) => {
  /* Un juego de grupos plegados por rol: la navegación de un paseador
     no se parece a la de un administrador, y plegar "Gestión" no
     tiene por qué afectarle a nadie más. */
  const [plegados, setPlegados] = usePreferencia<string[]>(
    `tuaniscan.riel.plegados.${rol}`,
    [],
  );

  const alternar = (titulo: string) =>
    setPlegados((previos) =>
      previos.includes(titulo)
        ? previos.filter((t) => t !== titulo)
        : [...previos, titulo],
    );

  let orden = 0;

  return (
    <>
      <Marca expandido={expandido} anclado={anclado} onAnclar={onAnclar} />

      <nav
        aria-label="Navegación principal"
        className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto pb-4"
      >
        {navPorRol[rol].map((grupo) => {
          const inicio = orden;
          orden += grupo.items.length + 1;
          return (
            <Grupo
              key={grupo.titulo}
              grupo={grupo}
              expandido={expandido}
              plegado={plegados.includes(grupo.titulo)}
              onAlternar={() => alternar(grupo.titulo)}
              orden={inicio}
              onNavegar={onNavegar}
            />
          );
        })}
      </nav>

      <PiePerfil
        profile={profile}
        rol={rol}
        rolesDisponibles={rolesDisponibles}
        expandido={expandido}
        onRoleChange={onRoleChange}
        onLogout={onLogout}
      />
    </>
  );
};

/* ── Riel de escritorio y tableta ────────────────────────────── */

type RielProps = Omit<
  PanelProps,
  "expandido" | "anclado" | "onAnclar" | "onNavegar"
>;

export const Riel = (props: RielProps) => {
  const hayEspacio = useMedia("(min-width: 768px)");
  const esAncha = useMedia("(min-width: 1280px)");
  const [anclado, setAnclado] = usePreferencia("tuaniscan.riel.anclado", true);

  const [roce, setRoce] = useState(false);
  const [foco, setFoco] = useState(false);
  const temporizador = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const alEntrar = useCallback(() => {
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setRoce(true), MS_ROCE);
  }, []);

  const alSalir = useCallback(() => {
    window.clearTimeout(temporizador.current);
    setRoce(false);
  }, []);

  if (!hayEspacio) return null;

  const fijoAbierto = esAncha && anclado;
  const expandido = fijoAbierto || roce || foco;

  return (
    /* La caja de afuera solo reserva sitio en la retícula. Cuando el
       riel se abre al pasar el cursor esta no cambia de ancho: por eso
       el panel flota sobre el contenido en vez de empujarlo. */
    <div
      className="riel-hueco relative hidden flex-shrink-0 md:block"
      style={{ width: fijoAbierto ? ANCHO_ABIERTO : ANCHO_ICONOS }}
    >
      <div
        onPointerEnter={(evento) => {
          // El táctil no tiene "pasar por encima": abriría el riel al
          // tocar cualquier icono, y ese toque ya es una navegación.
          if (evento.pointerType !== "mouse") return;
          alEntrar();
        }}
        onPointerLeave={alSalir}
        onFocus={() => setFoco(true)}
        onBlur={(evento) => {
          if (!evento.currentTarget.contains(evento.relatedTarget as Node)) {
            setFoco(false);
          }
        }}
        style={{ width: expandido ? ANCHO_ABIERTO : ANCHO_ICONOS }}
        className="riel absolute inset-y-0 left-0 z-40 flex flex-col overflow-hidden bg-rail"
      >
        <Panel
          {...props}
          expandido={expandido}
          anclado={esAncha ? anclado : undefined}
          onAnclar={esAncha ? () => setAnclado((previo) => !previo) : undefined}
        />
      </div>
    </div>
  );
};

/* ── Cajón de móvil ──────────────────────────────────────────── */

type CajonProps = Omit<PanelProps, "expandido" | "anclado" | "onAnclar"> & {
  abierto: boolean;
  cerrar: () => void;
};

export const Cajon = ({ abierto, cerrar, ...props }: CajonProps) => {
  const panel = useRef<HTMLDivElement>(null);
  const hayRiel = useMedia("(min-width: 768px)");
  const montado = useCajon(abierto && !hayRiel, cerrar, panel, MS_SALIDA);

  /* Al ensanchar la ventana con el cajón abierto —girar la tableta,
     arrastrar el borde— aparece el riel y el cajón sobra. Cerrarlo no
     es cosmético: mientras siga "abierto" tiene el scroll del cuerpo
     bloqueado y el foco atrapado en un panel que ya nadie ve. */
  useEffect(() => {
    if (hayRiel && abierto) cerrar();
  }, [hayRiel, abierto, cerrar]);

  if (hayRiel || !montado) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        aria-hidden
        onClick={cerrar}
        className={`absolute inset-0 bg-[#0b2331]/70 ${
          abierto ? "anim-fade" : "anim-fade-out"
        }`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={`relative flex w-[272px] max-w-[82%] flex-col bg-rail ${
          abierto ? "anim-slide-left" : "anim-cajon-out"
        }`}
      >
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar menú"
          className="absolute top-3 right-2 z-10 p-2 text-rail-text transition-colors duration-200 hover:bg-rail-hover hover:text-white"
        >
          <X size={18} />
        </button>
        <Panel {...props} expandido />
      </div>
    </div>
  );
};
