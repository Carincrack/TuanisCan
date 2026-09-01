import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Bell, Menu, Search, ShieldAlert } from "../lib/iconos";

import { tituloDeRuta, type Rol } from "../lib/nav";
import type { UserProfile } from "../types/auth.types";
import { useAuth } from "../hooks/useAuth";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "../services/notifications.service";
import { AsideDeRol } from "./aside";
import { CajonSuave, RielSuave } from "./rielSuave";

/* ─────────────────────────────────────────────────────────────
   EL ARMAZÓN

   Dos piezas flotando sobre un suelo, y nada más:

     · el riel, a la izquierda, que se pliega y se abre;
     · el lienzo, que se queda con TODO lo demás — la barra
       superior, el contenido y la columna de contexto— dentro de
       una sola caja redonda.

   Que el lienzo sea una pieza y no tres es lo que hace que al
   plegarse el riel se corra un bloque entero y no un montón de
   cosas cambiando de sitio cada una por su lado. Es hermano del
   riel en la misma fila flexible: cuando el riel reserva menos
   ancho, el lienzo crece contra él, y la transición de ancho del
   riel arrastra la del lienzo sin una línea más.

   El suelo es un gris azulado un paso más hondo que el canvas. Sin
   él las dos piezas no tendrían contra qué recortarse y las sombras
   no dirían nada: se verían dos rectángulos claros sobre un fondo
   claro. Con él se leen como dos cosas apoyadas encima.

   El aire —el relleno de afuera y el hueco de en medio— lo pone
   este archivo y no las piezas. Cada una sabe cuánto mide; solo
   quien las tiene a las dos sabe cuánto tienen que separarse.
   ───────────────────────────────────────────────────────────── */

interface AppShellProps {
  rol: Rol;
  onLogout?: () => void;
  children: ReactNode;
}

const AppShell = ({ rol, onLogout, children }: AppShellProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { getProfile, roles, isAdmin, setActiveRole } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notificaciones, setNotificaciones] = useState<Notification[]>([]);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const rolesDisponibles: Rol[] = [
    ...roles,
    ...(isAdmin ? (["admin"] as const) : []),
  ];

  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  // Cerrar el cajón al navegar; si no, queda tapando la pantalla nueva.
  useEffect(() => setMenuAbierto(false), [pathname]);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null));
  }, [getProfile, pathname]);

  useEffect(() => {
    listNotifications().then(setNotificaciones).catch(() => setNotificaciones([]));
  }, [pathname]);

  const pendientes = notificaciones.filter((n) => !n.leido).length;

  const abrirNotificaciones = async () => {
    setNotificacionesAbiertas((abiertas) => !abiertas);
    try {
      setNotificaciones(await listNotifications());
    } catch {
      setNotificaciones([]);
    }
  };

  const leerNotificacion = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotificaciones((actuales) =>
        actuales.map((n) => (n.id_notificacion === id ? { ...n, leido: true } : n)),
      );
    } catch {
      setNotificaciones(await listNotifications());
    }
  };

  const rutaNotificacion = (notificacion: Notification) => {
    if (notificacion.tipo === "paseo") {
      return rol === "paseador" ? "/p/solicitudes" : "/paseos";
    }
    if (notificacion.tipo === "mascota_perdida") return "/mascotas-perdidas";
    if (notificacion.tipo === "verificacion") return "/perfil";
    if (notificacion.tipo === "pago") return "/pagos";
    if (notificacion.tipo === "resena") return rol === "paseador" ? "/p/resenas" : "/resenas";
    return "/";
  };

  const abrirDesdeNotificacion = async (notificacion: Notification) => {
    await leerNotificacion(notificacion.id_notificacion);
    setNotificacionesAbiertas(false);
    await navigate({ to: rutaNotificacion(notificacion) });
  };

  const leerTodas = async () => {
    try {
      await markAllNotificationsRead();
      setNotificaciones((actuales) => actuales.map((n) => ({ ...n, leido: true })));
    } catch {
      setNotificaciones(await listNotifications());
    }
  };

  const navegacion = {
    rol,
    profile,
    rolesDisponibles,
    onRoleChange: setActiveRole,
    onLogout,
  };

  return (
    <div className="suave flex h-dvh w-full gap-2.5 overflow-hidden bg-suelo p-2.5">
      <RielSuave {...navegacion} />
      <CajonSuave
        {...navegacion}
        abierto={menuAbierto}
        cerrar={cerrarMenu}
        onNavegar={cerrarMenu}
      />

      {/* ── El lienzo ── */}
      <div className="lienzo flex min-w-0 flex-1 flex-col overflow-hidden rounded-[26px] bg-canvas">
        {/* La barra superior no es una franja: el canvas del lienzo
            sube hasta el borde y solo flotan encima el título y los
            controles. Una franja blanca partiría el lienzo en dos
            justo debajo de su propia esquina redonda. */}
        <header className="anim-rise flex h-16 shrink-0 items-center gap-2 px-3 sm:gap-3 lg:px-4">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            className="flota flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-rail transition-transform duration-200 ease-out active:scale-[0.94] md:hidden"
          >
            <Menu size={19} />
          </button>

          <h1 className="titular min-w-0 flex-1 truncate text-[20px] text-ink">
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
              className="flota h-10 w-full rounded-full bg-surface pr-4 pl-10 text-[13.5px] text-ink outline-none placeholder:text-ink-mute focus:outline-2 focus:outline-offset-2 focus:outline-accent"
            />
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-mute"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="Notificaciones"
              aria-expanded={notificacionesAbiertas}
              onClick={() => void abrirNotificaciones()}
              className="flota relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-rail transition-transform duration-200 ease-out active:scale-[0.94]"
            >
              <Bell size={18} strokeWidth={1.9} />
              {pendientes > 0 && (
                <span
                  aria-hidden
                  className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent"
                />
              )}
            </button>

            {notificacionesAbiertas && (
              <div className="flota absolute top-12 right-0 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-[18px] bg-surface">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <h2 className="rotulo text-ink-mute">Notificaciones</h2>
                  {pendientes > 0 && (
                    <button
                      type="button"
                      onClick={() => void leerTodas()}
                      className="text-[12px] font-semibold text-accent-dark hover:underline"
                    >
                      Marcar leídas
                    </button>
                  )}
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notificaciones.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[13px] text-ink-soft">
                      No tienes notificaciones.
                    </p>
                  ) : (
                    notificaciones.map((n) => (
                      <button
                        key={n.id_notificacion}
                        type="button"
                        onClick={() => void abrirDesdeNotificacion(n)}
                        className={`block w-full px-4 py-3 text-left text-[12.5px] leading-snug hover:bg-sunken ${
                          n.leido ? "text-ink-soft" : "font-medium text-ink"
                        }`}
                      >
                        {n.mensaje}
                        <span className="nums mt-1 block text-[11px] font-normal text-ink-mute">
                          {new Intl.DateTimeFormat("es-CR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(n.fecha))}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {rol !== "admin" && profile?.verificacion.estado !== "aprobado" && (
          <div
            className="mx-3 flex flex-wrap items-center gap-2 rounded-[18px] bg-warn-wash px-5 py-3 text-[12.5px] text-warn lg:mx-4"
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
            {/* El fragmento no es decorativo: el perfil abre por
                pestañas y sin él este enlace deja al usuario en "Mis
                datos", que es justo lo que no vino a ver. */}
            <Link
              to="/perfil"
              hash="verificacion"
              className="font-semibold underline underline-offset-2"
            >
              Ir a verificación
            </Link>
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-y-auto">
          <main className="min-w-0 flex-1 px-3 pt-2 pb-4 lg:px-4">
            {/* La clave remonta el contenido en cada ruta: así la entrada
                se reproduce al navegar, no solo al cargar la página. */}
            <div key={pathname} className="anim-rise mx-auto w-full max-w-[900px]">
              {children}
            </div>
          </main>

          <aside
            aria-label="Contexto"
            className="anim-rise d-3 hidden w-[312px] shrink-0 flex-col gap-2.5 px-4 pt-2 pb-4 pl-0 xl:flex"
          >
            <AsideDeRol rol={rol} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
