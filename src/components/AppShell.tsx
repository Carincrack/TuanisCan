import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Bell, Menu, Search, ShieldAlert } from "lucide-react";

import { tituloDeRuta, type Rol } from "../lib/nav";
import type { UserProfile } from "../types/auth.types";
import { useAuth } from "../hooks/useAuth";
import { AsideDeRol } from "./aside";
import { Cajon, Riel } from "./riel";
import { CajonSuave, RielSuave } from "./rielSuave";
import { input } from "./ui";

/* ─────────────────────────────────────────────────────────────
   Estructura de tres columnas:
     · izquierda  navegación (oscura, fija). Vive en `riel.tsx` o
                  en `rielSuave.tsx`, que deciden solos si les toca
                  ser columna de iconos, barra abierta o cajón.
     · centro     contenido
     · derecha    contexto del rol (se oculta bajo 1280px)

   Este archivo se queda con lo que envuelve al contenido: la barra
   superior, el aviso de verificación y el reparto del ancho.

   ── Dos pieles a la vez ──
   El sistema está mudándose del mundo plano —sin esquinas, sin
   sombras— al de la portada, que es todo píldoras y aire. La mudanza
   arranca por la parte administrativa para verla puesta antes de
   arrastrar las diez pantallas restantes.

   Mudar otro rol es agregarlo a esta lista; volverse atrás es
   sacarlo. Cuando estén todos, se borra la lista, se borra
   `riel.tsx` y `.plano` sale de `index.css`.
   ───────────────────────────────────────────────────────────── */

const MUNDO_SUAVE: Rol[] = ["admin"];

interface AppShellProps {
  rol: Rol;
  onLogout?: () => void;
  children: ReactNode;
}

const AppShell = ({ rol, onLogout, children }: AppShellProps) => {
  const { pathname } = useLocation();
  const { getProfile, roles, isAdmin, setActiveRole } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const rolesDisponibles: Rol[] = [
    ...roles,
    ...(isAdmin ? (["admin"] as const) : []),
  ];

  const suave = MUNDO_SUAVE.includes(rol);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  // Cerrar el cajón al navegar; si no, queda tapando la pantalla nueva.
  useEffect(() => setMenuAbierto(false), [pathname]);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null));
  }, [getProfile, pathname]);

  const navegacion = {
    rol,
    profile,
    rolesDisponibles,
    onRoleChange: setActiveRole,
    onLogout,
  };

  return (
    <div
      className={`${suave ? "suave" : "plano"} flex h-dvh w-full overflow-hidden bg-canvas`}
    >
      {suave ? (
        <>
          <RielSuave {...navegacion} />
          <CajonSuave
            {...navegacion}
            abierto={menuAbierto}
            cerrar={cerrarMenu}
            onNavegar={cerrarMenu}
          />
        </>
      ) : (
        <>
          <Riel {...navegacion} />
          <Cajon
            {...navegacion}
            abierto={menuAbierto}
            cerrar={cerrarMenu}
            onNavegar={cerrarMenu}
          />
        </>
      )}

      {/* ── Barra superior + centro + derecha ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* En el mundo suave la barra no es una franja blanca pegada
            arriba: el canvas sube hasta el borde y solo flotan encima
            el título y los dos controles. Una franja partiría en dos
            la pantalla justo donde el riel dejó de tener borde. */}
        <header
          className={`anim-rise flex shrink-0 items-center gap-2 sm:gap-3 ${
            suave
              ? "h-16 px-3 lg:px-4"
              : "h-14 bg-surface px-2 sm:px-4 lg:px-6"
          }`}
        >
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            className={`flex h-10 w-10 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-200 md:hidden ${
              suave
                ? "flota rounded-full bg-surface text-rail active:scale-[0.94]"
                : "text-ink-soft hover:bg-sunken hover:text-ink"
            }`}
          >
            <Menu size={19} />
          </button>

          <h1
            className={`min-w-0 flex-1 truncate text-ink ${
              suave
                ? "titular text-[20px]"
                : "text-[15px] font-semibold tracking-[-0.01em]"
            }`}
          >
            {tituloDeRuta(rol, pathname)}
          </h1>

          {/* La búsqueda se retira antes que nada al angostarse: es lo
              único de la barra que tiene su propia pantalla adonde ir. */}
          <div className="relative hidden w-[200px] shrink-0 lg:block lg:w-[260px]">
            <label htmlFor="busqueda-global" className="sr-only">
              Buscar en la plataforma
            </label>
            <input
              id="busqueda-global"
              type="search"
              placeholder="Buscar"
              className={
                suave
                  ? "flota h-10 w-full rounded-full bg-surface pr-4 pl-10 text-[13.5px] text-ink outline-none placeholder:text-ink-mute focus:outline-2 focus:outline-offset-2 focus:outline-accent"
                  : `${input} pl-9`
              }
            />
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-mute ${
                suave ? "left-4" : "left-3"
              }`}
            />
          </div>

          <button
            type="button"
            aria-label="Notificaciones"
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center transition-[background-color,color,transform] duration-200 ${
              suave
                ? "flota rounded-full bg-surface text-rail active:scale-[0.94]"
                : "text-ink-soft hover:bg-sunken hover:text-ink"
            }`}
          >
            <Bell size={18} strokeWidth={1.9} />
            <span
              aria-hidden
              className={`absolute h-2 w-2 bg-accent ${
                suave ? "top-2 right-2 rounded-full" : "top-2 right-2"
              }`}
            />
          </button>
        </header>

        {rol !== "admin" && profile?.verificacion.estado !== "aprobado" && (
          <div
            className={`flex flex-wrap items-center gap-2 bg-warn-wash text-[12.5px] text-warn ${
              suave ? "mx-3 rounded-2xl px-4 py-3 lg:mx-4" : "px-4 py-3 lg:px-6"
            }`}
            role="status"
          >
            <ShieldAlert size={16} aria-hidden className="shrink-0" />
            <span className="min-w-[16rem] flex-1">
              {profile?.verificacion.estado === "pendiente"
                ? "Tu verificación está en revisión. Puedes consultar información, pero las operaciones siguen bloqueadas."
                : profile?.verificacion.estado === "rechazado"
                  ? `Debes corregir tu verificación: ${profile.verificacion.observacion ?? "revisa los documentos enviados."}`
                  : "Verifica tu perfil para registrar mascotas, solicitar paseos y usar las funciones de la plataforma."}
            </span>
            <Link
              to="/perfil"
              className="font-semibold underline underline-offset-2"
            >
              Ir a verificación
            </Link>
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-y-auto">
          <main
            className={
              suave ? "min-w-0 flex-1 px-3 pt-1 pb-4 lg:px-4" : "min-w-0 flex-1 p-2 sm:p-3 lg:p-4"
            }
          >
            {/* La clave remonta el contenido en cada ruta: así la entrada
                se reproduce al navegar, no solo al cargar la página. */}
            <div key={pathname} className="anim-rise mx-auto w-full max-w-[900px]">
              {children}
            </div>
          </main>

          <aside
            aria-label="Contexto"
            className={`anim-rise d-3 hidden w-[312px] shrink-0 flex-col gap-3 xl:flex ${
              suave ? "px-4 pt-1 pb-4 pl-0" : "p-4 pl-0"
            }`}
          >
            <AsideDeRol rol={rol} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
