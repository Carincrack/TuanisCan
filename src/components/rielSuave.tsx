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
   EL RIEL

   La navegación de las cuatro aplicaciones —dueño, paseador, negocio
   y administración—. La aplicación venía siendo plana y cuadrada
   —sin una esquina viva, sin sombras— mientras la portada es lo
   contrario: todo píldora, Archivo en versalitas, discos de
   turquesa y sombras largas. Dos productos con el mismo logo.

   Esto trae la portada adentro. Lo que se copia y lo que no:

     · Píldoras. Ni un control con esquina viva, igual que en
       `BotonAccion`. El riel deja de ser una franja pegada al
       borde y pasa a ser una tarjeta que flota sobre el canvas.
     · Versalitas de Archivo para los rótulos de grupo, la misma
       clase `.rotulo` que usa la barra de la portada.
     · `active:scale(0.97)`. En la portada ese acuse de recibo
       está en cada botón; sin él la interfaz se siente muerta.
     · El turquesa NO se usa como fondo de nada con texto encima:
       sobre él, el blanco da 3.0:1 y el navy 3.6:1, y ninguno pasa
       AA a 13 px. La pantalla activa se marca con una píldora de
       CIELO y tinta navy, que da 9.1:1. El turquesa queda para
       discos y filetes, como en `tokens.ts`.

   Los efectos de documento del cajón —bloquear el scroll, atrapar el
   foco, devolverlo al cerrar— viven en `useCajon`, aparte: son
   obligaciones de un diálogo, no maquetado.
   ───────────────────────────────────────────────────────────── */

/* El aire alrededor de la tarjeta no lo pone el riel: lo ponen el
   relleno y el hueco del armazón, que es quien sabe cuánto espacio
   hay entre las dos piezas que flotan. Acá solo va el ancho. */
const TARJETA_ICONOS = 72;
const TARJETA_ABIERTA = 252;

/** Lo que tarda el cajón en salir. Coincide con `.anim-cajon-out`. */
const MS_SALIDA = 220;

/** El cursor tiene que quedarse quieto antes de abrir el riel: si no,
    pasar por encima camino a otro lado lo despliega de un manotazo. */
const MS_ROCE = 90;

/* Toda fila del riel se arma igual: 10 px de aire, una caja de 32
   para el icono, 10 de separación y 170 para el texto. Las cuentas
   dan 252, el ancho de la tarjeta abierta, y dejan el centro del
   icono a 36 px del borde — la mitad exacta de la tarjeta cerrada.
   Por eso al abrir y cerrar el riel los iconos no se mueven: lo
   único que cambia de tamaño es la columna del texto. */
const CAJA_ICONO = "grid h-8 w-8 shrink-0 place-items-center";
const COLUMNA_TEXTO = "w-[170px] shrink-0";

/* ── Piezas ──────────────────────────────────────────────────── */

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
    className={`${COLUMNA_TEXTO} flex items-center gap-2 transition-opacity ${
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
      title={expandido ? undefined : item.label}
      style={{ animationDelay: `${40 + orden * 26}ms` }}
      className={`anim-nav-in group flex h-11 items-center gap-2.5 rounded-full px-2.5 text-[13.5px] transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] ${
        activo
          ? "bg-accent-wash font-semibold text-rail"
          : "text-rail-text hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className={CAJA_ICONO}>
        <span className="relative">
          <Icon
            size={18}
            strokeWidth={activo ? 2.2 : 1.9}
            className="transition-transform duration-300 ease-out group-hover:scale-110"
          />
          {/* Cerrado no cabe el contador, pero la señal de que hay algo
              esperando no se puede perder: queda como un punto. */}
          {item.badge != null && !expandido && (
            <span
              aria-hidden
              className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-accent"
            />
          )}
        </span>
      </span>

      <Texto expandido={expandido}>
        <span className="truncate transition-transform duration-300 ease-out group-hover:translate-x-0.5">
          {item.label}
        </span>
        {item.badge != null && (
          <span
            className={`nums ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              activo ? "bg-rail text-accent-wash" : "bg-accent-wash text-rail"
            }`}
          >
            {item.badge}
          </span>
        )}
      </Texto>
    </Link>
  );
};

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
  const id = `grupo-suave-${grupo.titulo.replace(/\s+/g, "-").toLowerCase()}`;
  const contieneActiva = grupo.items.some((item) => item.to === pathname);

  /* Plegar solo tiene sentido con el riel abierto. Cerrado, el título
     no se lee, así que el grupo se muestra entero y la separación la
     hace un filete. */
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
          className="anim-nav-in group flex h-9 w-full items-center gap-2.5 px-2.5 text-left"
        >
          <span className={CAJA_ICONO}>
            <ChevronDown
              size={13}
              strokeWidth={2.6}
              aria-hidden
              className={`text-rail-mute transition-[transform,color] duration-300 ease-out group-hover:text-white ${
                plegado ? "-rotate-90" : "rotate-0"
              }`}
            />
          </span>
          <Texto expandido={expandido}>
            <span className="rotulo truncate text-rail-mute transition-colors duration-200 group-hover:text-white">
              {grupo.titulo}
            </span>
            {/* Plegado con la pantalla activa adentro: el grupo tiene
                que seguir diciendo dónde está parado el usuario. */}
            {plegado && contieneActiva && (
              <span
                aria-hidden
                className="ml-auto h-2 w-2 shrink-0 rounded-full bg-accent"
              />
            )}
          </Texto>
        </button>
      ) : (
        <div aria-hidden className="mx-4 my-2.5 h-px bg-white/12" />
      )}

      {/* De `0fr` a `1fr`: la única forma de animar una altura que no
          se conoce sin medirla en JavaScript en cada cuadro. */}
      <div
        id={id}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="flex flex-col gap-0.5 overflow-hidden">
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

const Marca = ({
  expandido,
  anclado,
  onAnclar,
}: {
  expandido: boolean;
  anclado?: boolean;
  onAnclar?: () => void;
}) => (
  <div className="anim-fade flex h-12 shrink-0 items-center gap-2.5 px-2.5">
    {/* El símbolo va dentro de un disco claro. Sobre el navy de la
        tarjeta el logo solo se pierde; el disco le da su propio
        fondo, que es como vive en la portada. */}
    <span className={`${CAJA_ICONO} rounded-full bg-canvas`}>
      <img
        src={MARCA.logoSimbolo}
        alt=""
        aria-hidden
        className="h-6 w-6 object-contain"
      />
    </span>
    <Texto expandido={expandido}>
      <span className="truncate text-[16px] font-bold tracking-[-0.015em] text-white">
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
          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-rail-mute transition-[background-color,color,transform] duration-200 ease-out hover:bg-white/10 hover:text-white active:scale-[0.94]"
        >
          {anclado ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
        </button>
      )}
    </Texto>
  </div>
);

const etiquetaRol: Record<Rol, string> = {
  dueno: "Dueño",
  paseador: "Paseador",
  negocio: "Negocio",
  admin: "Administración",
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
    <div className="shrink-0">
      <div aria-hidden className="mx-2.5 mb-2 h-px bg-white/12" />

      <div
        className="flex h-12 items-center gap-2.5 px-2.5"
        title={expandido ? undefined : nombre}
      >
        <span className={CAJA_ICONO}>
          {profile ? (
            <ProfileAvatar profile={profile} size="h-8 w-8" />
          ) : (
            <span className="h-8 w-8 rounded-full bg-accent" />
          )}
        </span>
        <Texto expandido={expandido}>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-white">
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
        <div className="px-2.5 pt-1 pb-2">
          <label htmlFor="active-role" className="sr-only">
            Cambiar perfil
          </label>
          <select
            id="active-role"
            value={rol}
            onChange={(evento) => onRoleChange(evento.target.value as Rol)}
            className="w-full appearance-none rounded-full bg-white/10 px-4 py-2 text-[12.5px] font-medium text-white outline-none transition-colors duration-200 hover:bg-white/16"
          >
            {rolesDisponibles.map((item) => (
              <option key={item} value={item} className="text-ink">
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
          className="group flex h-11 w-full items-center gap-2.5 rounded-full px-2.5 text-[13.5px] text-rail-text transition-[background-color,color,transform] duration-200 ease-out hover:bg-white/10 hover:text-white active:scale-[0.97]"
        >
          <span className={CAJA_ICONO}>
            <LogOut
              size={17}
              strokeWidth={1.9}
              className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
            />
          </span>
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
        className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto py-1"
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

export const RielSuave = (props: RielProps) => {
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

  const expandido = (esAncha && anclado) || roce || foco;

  return (
    /* Una sola caja, y es la que ocupa sitio: el riel no flota sobre
       el contenido, lo empuja. Antes había dos —un hueco fijo en la
       retícula y una tarjeta suelta encima— y al abrirse al pasar el
       cursor la tarjeta tapaba el lienzo, que se quedaba quieto
       debajo. Ahora el ancho que se anima es el del propio elemento
       de la fila, así que el lienzo, que es `flex-1`, se corre con él
       sin una línea más: plegar, anclar y rozar mueven lo mismo.

       `z-10` es para la sombra, no para el orden: sin él, el lienzo
       —hermano posterior— se pinta encima y le come el borde blando
       al riel justo en el hueco que los separa. */
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
      style={{ width: expandido ? TARJETA_ABIERTA : TARJETA_ICONOS }}
      className="riel riel-suave relative z-10 hidden shrink-0 flex-col overflow-hidden rounded-[26px] bg-rail p-2.5 md:flex"
    >
      <Panel
        {...props}
        expandido={expandido}
        anclado={esAncha ? anclado : undefined}
        onAnclar={esAncha ? () => setAnclado((previo) => !previo) : undefined}
      />
    </div>
  );
};

/* ── Cajón de móvil ──────────────────────────────────────────── */

type CajonProps = Omit<PanelProps, "expandido" | "anclado" | "onAnclar"> & {
  abierto: boolean;
  cerrar: () => void;
};

export const CajonSuave = ({ abierto, cerrar, ...props }: CajonProps) => {
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
    <div className="fixed inset-0 z-50 flex p-2.5">
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
        className={`riel-suave relative flex w-[272px] max-w-[86%] flex-col overflow-hidden rounded-[26px] bg-rail p-2.5 ${
          abierto ? "anim-slide-left" : "anim-cajon-out"
        }`}
      >
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar menú"
          className="absolute top-2.5 right-2.5 z-10 grid h-9 w-9 place-items-center rounded-full text-rail-text transition-[background-color,color,transform] duration-200 ease-out hover:bg-white/10 hover:text-white active:scale-[0.94]"
        >
          <X size={18} />
        </button>
        <Panel {...props} expandido />
      </div>
    </div>
  );
};
