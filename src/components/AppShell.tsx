import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Bell, Check, Footprints, Menu, PawPrint, ShieldAlert, Star, Trash2, Wallet } from "../lib/iconos";
import type { Icono } from "../lib/iconos";

import { inicioDeRol, MARCA, RUTA_ADMIN, tituloDeRuta, type Rol } from "../lib/nav";
import { NotificationButtonContext, PageWidthContext } from "./ui";
import QuickLanguageSwitcher from "./QuickLanguageSwitcher";
import type { UserProfile } from "../types/auth.types";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import { useMedia } from "../hooks/useMedia";
import { GooeyToaster } from "goey-toast";
import {
  deleteAllNotifications,
  deleteNotification,
  escucharNotificaciones,
  LIMITE_NOTIFICACIONES,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from "../services/notifications.service";
import { CajonSuave, RielSuave } from "./rielSuave";
import { aviso } from "../lib/aviso";
import { prepararSonido, sonarAviso } from "../lib/sonido";
import { anunciarNotificacion, useAlLlegarNotificacion } from "../lib/tiempoReal";
import { ContadoresMenu } from "../lib/contadoresMenu";
import { contarSolicitudesPendientes } from "../services/walk-requests.service";

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

/** De qué se trata cada aviso, de un vistazo y sin leerlo. */
const ICONO_NOTIFICACION: Record<Notification["tipo"], Icono> = {
  paseo: Footprints,
  pago: Wallet,
  resena: Star,
  verificacion: BadgeCheck,
  mascota_perdida: PawPrint,
};

/** «ahora», «hace 5 minutos», «hace 2 horas», «ayer» y, de ahí para
    atrás, la fecha. Lo reciente se lee mejor por distancia que por
    hora; la fecha y hora exactas quedan en el `title`. */
const haceCuanto = (fecha: string, localeTag: string) => {
  const segundos = (Date.now() - new Date(fecha).getTime()) / 1000;
  const relativo = new Intl.RelativeTimeFormat(localeTag, { numeric: "auto" });
  if (segundos < 45) return relativo.format(0, "second");
  if (segundos < 3600) return relativo.format(-Math.round(segundos / 60), "minute");
  if (segundos < 86_400) return relativo.format(-Math.round(segundos / 3600), "hour");
  if (segundos < 172_800) return relativo.format(-1, "day");
  return new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(new Date(fecha));
};

interface AppShellProps {
  rol: Rol;
  onLogout?: () => void;
  children: ReactNode;
}

const AppShell = ({ rol, onLogout, children }: AppShellProps) => {
  const { pathname } = useLocation();
  /* Estas pantallas piden su propio botón de notificaciones —ver
     `NotificationButtonContext` más abajo— y con eso la franja
     superior les queda vacía: se pliega solo para ellas. */
  const conEncabezadoPropio =
    pathname === RUTA_ADMIN ||
    pathname === "/acceso-interno/usuarios" ||
    pathname === "/acceso-interno/finanzas" ||
    pathname === "/acceso-interno/paseadores" ||
    pathname === "/acceso-interno/zonas" ||
    pathname === "/acceso-interno/paseos" ||
    pathname === "/pagos" ||
    pathname === "/pagos/tarjetas" ||
    pathname === "/directorio" ||
    pathname === "/perfil";
  const navigate = useNavigate();
  const { t, localeTag } = useTranslation();
  const { getProfile, roles, isAdmin, setActiveRole, user } = useAuth();
  const idUsuario = user?.id ?? null;
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [contenidoAncho, setContenidoAncho] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  /* Solo con el perfil cargado. Ver la nota junto al aviso. */
  const avisoVerificacion =
    rol !== "admin" && profile !== null && profile.verificacion.estado !== "aprobado";
  const [notificaciones, setNotificaciones] = useState<Notification[]>([]);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  /* El botón vive en dos sitios posibles —ver `NotificationButtonContext`
     más abajo—, así que el panel no puede colgarse de una posición fija
     en pantalla: en las páginas de "encabezado propio" (`/pagos`, por
     ejemplo, que además pide el carril ancho) el botón real queda lejos
     del borde derecho de la ventana, y un panel anclado a ese borde se
     abre en un sitio que no tiene nada que ver con lo que se tocó. Se
     mide la posición del botón al abrir y el panel se ancla ahí.

     Se guarda el botón que se TOCÓ y no uno fijo: en el teléfono la
     campana vive en la barra de arriba y en la computadora, en esas
     páginas, dentro de su encabezado. Las dos copias existen a la vez
     y una está oculta; medir la oculta da todo en cero. */
  const notifBotonRef = useRef<HTMLButtonElement | null>(null);
  const [notifPanelPos, setNotifPanelPos] = useState<{ top: number; right: number; ancho: number } | null>(null);
  /* En el teléfono los avisos van arriba y centrados: abajo a la
     derecha quedaban corridos, con la X suelta, encima del buscador. */
  const esTelefono = !useMedia("(min-width: 640px)");
  const [notificacionesError, setNotificacionesError] = useState<string | null>(null);
  const [accionNotificacion, setAccionNotificacion] = useState<string | null>(null);
  const rolesDisponibles: Rol[] = [
    ...roles,
    ...(isAdmin ? (["admin"] as const) : []),
  ];

  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);
  const cambiarRol = useCallback((rol: Rol) => {
    setActiveRole(rol);
    void navigate({ to: inicioDeRol[rol] });
  }, [navigate, setActiveRole]);

  // Cerrar el cajón al navegar; si no, queda tapando la pantalla nueva.
  useEffect(() => setMenuAbierto(false), [pathname]);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null));
  }, [getProfile, pathname]);

  /* ── Lo que ya se conoce ──
     Los avisos que ya pasaron por la lista. Sirve para saber cuáles son
     NUEVOS de verdad: cada uno se anuncia una sola vez, llegue por el
     canal en tiempo real o por una recarga. `null` es que todavía no se
     cargó nada: la primera carga solo aprende, no anuncia lo de antes. */
  const conocidas = useRef<Set<string> | null>(null);
  const abrirDesdeAviso = useRef<(n: Notification) => void>(() => undefined);

  /** Anuncia lo nuevo: avisa a las pantallas abiertas, suena una vez y
      saca un aviso. Con uno solo, el aviso trae «Ver», que lleva a la
      pantalla del aviso; con varios juntos —volver de estar sin
      conexión—, un resumen en vez de una ráfaga. */
  const recibir = useCallback((nuevas: Notification[]) => {
    if (!nuevas.length) return;
    for (const n of nuevas) anunciarNotificacion(n);
    sonarAviso();
    if (nuevas.length === 1) {
      /* Título corto —de qué se trata— y el mensaje entero debajo. Con
         el mensaje como título, la pastilla del aviso es de una sola
         línea y lo cortaba a media frase contra el borde. */
      const [nueva] = nuevas;
      aviso.dato(t(`shell.notifications.types.${nueva.tipo}`), {
        detalle: nueva.mensaje,
        id: nueva.id_notificacion,
        accion: { label: t("shell.notifications.view"), onClick: () => abrirDesdeAviso.current(nueva) },
      });
    } else {
      aviso.dato(t("shell.notifications.newMany", { n: nuevas.length }));
    }
  }, [t]);

  /* Cargar es también ponerse al día: si la base trae avisos sin leer
     que nunca pasaron por acá —se perdieron con la conexión cortada—,
     se anuncian. Si falla, la lista que ya estaba se queda: vaciarla
     hacía creer que no había nada. */
  const cargarNotificaciones = useCallback(async () => {
    try {
      const lista = await listNotifications();
      setNotificaciones(lista);
      setNotificacionesError(null);
      const vistas = conocidas.current;
      conocidas.current = new Set([...(vistas ?? []), ...lista.map((n) => n.id_notificacion)]);
      if (vistas) recibir(lista.filter((n) => !n.leido && !vistas.has(n.id_notificacion)).reverse());
    } catch {
      setNotificacionesError(t("shell.notifications.loadError"));
    }
  }, [t, recibir]);

  useEffect(() => {
    void cargarNotificaciones();
  }, [cargarNotificaciones, pathname]);

  const cargarRef = useRef(cargarNotificaciones);
  const recibirRef = useRef(recibir);
  useEffect(() => {
    cargarRef.current = cargarNotificaciones;
    recibirRef.current = recibir;
  });

  /* ── En tiempo real ──
     Cada notificación nueva entra arriba de la lista —la campana cuenta
     una más sin recargar—, suena, aparece como aviso y se anuncia a la
     pantalla abierta para que se refresque sola (ver
     `lib/tiempoReal.ts`). Es una sola suscripción para toda la app,
     atada al usuario y no a la ruta: cambiar de pantalla no la corta.

     Y se pone al día sola en los tres momentos en que pudo perderse
     algo: cuando el canal se vuelve a conectar, cuando la pantalla
     vuelve a verse (el teléfono estaba bloqueado o en otra app) y
     cuando vuelve la conexión a internet. */
  useEffect(() => {
    if (!idUsuario) return;
    const despertar = prepararSonido();
    const dejarDeEscuchar = escucharNotificaciones(
      idUsuario,
      (nueva) => {
        setNotificaciones((actuales) =>
          actuales.some((n) => n.id_notificacion === nueva.id_notificacion)
            ? actuales
            : [nueva, ...actuales].slice(0, LIMITE_NOTIFICACIONES),
        );
        if (conocidas.current?.has(nueva.id_notificacion)) return;
        conocidas.current?.add(nueva.id_notificacion);
        recibirRef.current([nueva]);
      },
      () => void cargarRef.current(),
    );
    const alVolver = () => {
      if (document.visibilityState === "visible") void cargarRef.current();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", alVolver);
    return () => {
      dejarDeEscuchar();
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", alVolver);
      window.removeEventListener("pointerdown", despertar);
      window.removeEventListener("keydown", despertar);
    };
  }, [idUsuario]);

  /* ── Solicitudes esperando ──
     El número junto a «Solicitudes» en el menú del paseador. Se cuenta
     al cambiar de pantalla —responder una baja el número— y cuando
     llega un aviso de paseo, que es como entra una solicitud nueva o
     se va una que el dueño canceló. */
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const contarSolicitudes = useCallback(async () => {
    if (rol !== "paseador" || !idUsuario) {
      setSolicitudesPendientes(0);
      return;
    }
    try {
      setSolicitudesPendientes(await contarSolicitudesPendientes(idUsuario));
    } catch {
      setSolicitudesPendientes(0);
    }
  }, [rol, idUsuario]);

  useEffect(() => {
    void contarSolicitudes();
  }, [contarSolicitudes, pathname]);

  useAlLlegarNotificacion(["paseo"], () => void contarSolicitudes());

  const contadoresMenu = { "/p/solicitudes": solicitudesPendientes };

  const pendientes = notificaciones.filter((n) => !n.leido).length;

  /* Lo que no se leyó, también en la pestaña del navegador: «(2)
     TuanisCan». Así se ve desde otra pestaña sin volver a la app. */
  useEffect(() => {
    const sinNumero = document.title.replace(/^\(\d+\+?\) /, "");
    document.title = pendientes > 0 ? `(${pendientes > 9 ? "9+" : pendientes}) ${sinNumero}` : sinNumero;
  }, [pendientes, pathname]);

  /* «Eliminar todas» no se deshace: pide un segundo toque. Antes se
     borraba todo con uno solo y era fácil quedarse sin avisos. */
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  /* El panel cuelga de la campana pero nunca se sale de la pantalla.
     Antes solo se cuidaba el borde derecho: en el teléfono la campana
     de Pagos queda a media pantalla y el panel, de 358 px, se salía
     por la izquierda con el título y el comienzo de cada aviso
     cortados. Ahora el ancho se acota a la ventana y el borde derecho
     se corre lo que haga falta para que el izquierdo quede adentro.
     En el teléfono eso da un panel de lado a lado con 12 px de aire. */
  const medirPosicionPanel = useCallback(() => {
    const rect = notifBotonRef.current?.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return;
    const margen = 12;
    const ancho = Math.min(420, window.innerWidth - margen * 2);
    const derechaDelBoton = window.innerWidth - rect.right;
    setNotifPanelPos({
      top: rect.bottom + 8,
      right: Math.min(Math.max(margen, derechaDelBoton), window.innerWidth - margen - ancho),
      ancho,
    });
  }, []);

  const abrirNotificaciones = async (boton: HTMLButtonElement) => {
    notifBotonRef.current = boton;
    const seAbre = !notificacionesAbiertas;
    if (seAbre) medirPosicionPanel();
    setNotificacionesAbiertas(seAbre);
    setNotificacionesError(null);
    setConfirmarBorrado(false);
    if (seAbre) await cargarNotificaciones();
  };

  useEffect(() => {
    if (!notificacionesAbiertas) return;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setNotificacionesAbiertas(false);
    };
    window.addEventListener("resize", medirPosicionPanel);
    window.addEventListener("keydown", alTeclear);
    return () => {
      window.removeEventListener("resize", medirPosicionPanel);
      window.removeEventListener("keydown", alTeclear);
    };
  }, [notificacionesAbiertas, medirPosicionPanel]);

  const leerNotificacion = async (id: string) => {
    setNotificacionesError(null);
    setAccionNotificacion(id);
    try {
      await markNotificationRead(id);
      await cargarNotificaciones();
    } catch {
      setNotificacionesError(t("shell.notifications.markReadError"));
    } finally {
      setAccionNotificacion(null);
    }
  };

  const rutaNotificacion = (notificacion: Notification) => {
    if (notificacion.tipo === "paseo") {
      return rol === "paseador" ? "/p/solicitudes" : "/paseos";
    }
    if (notificacion.tipo === "mascota_perdida") return "/mascotas-perdidas";
    /* Al admin, «nueva solicitud de verificación» lo lleva a revisarla;
       a los demás, a la pestaña de verificación de su perfil. */
    if (notificacion.tipo === "verificacion") {
      return rol === "admin" ? `${RUTA_ADMIN}/verificaciones` : "/perfil#verificacion";
    }
    if (notificacion.tipo === "pago") {
      /* Al paseador le llegan dos avisos de pago: «el dueño confirmó el
         pago, ya puedes iniciar» —va a Paseo activo— y «se acreditaron
         ₡X» al terminar —va a Ganancias—. Los dos los escribe la base
         (`retener_pago_paseo` y `finalizar_mi_paseo`), por eso se
         distinguen por cómo empieza el mensaje. */
      if (rol === "paseador") {
        return notificacion.mensaje.startsWith("Se acreditaron") ? "/p/ganancias" : "/p/paseo-activo";
      }
      // Al dueño lo lleva a confirmar ESE pago, con la ventana abierta.
      return notificacion.referencia_id ? `/pagos?pagar=${notificacion.referencia_id}` : "/pagos";
    }
    if (notificacion.tipo === "resena") return rol === "paseador" ? "/p/resenas" : "/resenas";
    return "/";
  };

  const abrirDesdeNotificacion = async (notificacion: Notification) => {
    await leerNotificacion(notificacion.id_notificacion);
    setNotificacionesAbiertas(false);
    // `href` y no `to`: la ruta puede traer `?pagar=…`.
    await navigate({ href: rutaNotificacion(notificacion) });
  };

  // El «Ver» de un aviso flotante hace lo mismo que tocarlo en el panel.
  useEffect(() => {
    abrirDesdeAviso.current = (n) => void abrirDesdeNotificacion(n);
  });

  const leerTodas = async () => {
    setNotificacionesError(null);
    setAccionNotificacion("todas");
    try {
      await markAllNotificationsRead();
      await cargarNotificaciones();
    } catch {
      setNotificacionesError(t("shell.notifications.markAllReadError"));
    } finally {
      setAccionNotificacion(null);
    }
  };

  const eliminarNotificacion = async (id: string) => {
    setNotificacionesError(null);
    setAccionNotificacion(id);
    try {
      await deleteNotification(id);
      await cargarNotificaciones();
    } catch {
      setNotificacionesError(t("shell.notifications.deleteError"));
    } finally {
      setAccionNotificacion(null);
    }
  };

  const eliminarTodas = async () => {
    setConfirmarBorrado(false);
    setNotificacionesError(null);
    setAccionNotificacion("todas");
    try {
      await deleteAllNotifications();
      await cargarNotificaciones();
    } catch {
      setNotificacionesError(t("shell.notifications.deleteAllError"));
    } finally {
      setAccionNotificacion(null);
    }
  };

  const navegacion = {
    rol,
    profile,
    rolesDisponibles,
    onRoleChange: cambiarRol,
    onLogout,
  };

  /* Mismo botón, dos posibles domicilios: acá si la página no pide lo
     contrario, o dentro de su propio `PageHeader` cuando sí —ver
     `NotificationButtonContext`—. El estado y el panel no se mueven. */
  const botonNotificaciones = (
    <button
      type="button"
      aria-label={
        pendientes > 0
          ? t("shell.notifications.buttonUnread", { n: pendientes })
          : t("shell.notifications.button")
      }
      aria-expanded={notificacionesAbiertas}
      onClick={(evento) => void abrirNotificaciones(evento.currentTarget)}
      className="flota relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-rail transition-transform duration-200 ease-out active:scale-[0.94]"
    >
      <Bell size={18} strokeWidth={1.9} />
      {/* Cuántas faltan por leer, no solo que hay alguna: con un punto
          no se sabía si era una o veinte. */}
      {pendientes > 0 && (
        <span
          aria-hidden
          className="nums absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] leading-none font-semibold text-white ring-2 ring-surface"
        >
          {pendientes > 9 ? "9+" : pendientes}
        </span>
      )}
    </button>
  );

  return (
    <div className="suave flex h-dvh w-full gap-2.5 overflow-hidden bg-suelo p-2.5">
      {/* El avisador se monta acá y no en `main.tsx` a propósito: el
          pedido era para el sistema por dentro, no para la portada,
          y colgado de la entrada estaría también sobre la landing.

          Pero se PINTA en el `body`, por portal, y eso no es un
          adorno. Dos razones, las dos medidas:

          1. `RootLayout` envuelve todo esto en un div `.anim-app-in`,
             cuya animación termina en `transform: scale(1)` y se
             queda puesta porque el relleno es `both`. Un `transform`
             distinto de `none` convierte al elemento en bloque
             contenedor de todo `position: fixed` que tenga dentro.
             La lista de sonner es `fixed`: dentro del árbol dejaba
             de anclarse a la pantalla, pasaba a anclarse a ese div y
             entonces SÍ contaba para el alto del documento. Aparecía
             un aviso y aparecía barra de desplazamiento.

          2. Suelto en el árbol era además hijo de esta fila `flex`,
             o sea un ítem más, con su `gap` propio robándole ancho
             al lienzo.

          En el `body` no hay ancestro con `transform` y no hay fila
          que estorbar: `fixed` vuelve a medir contra la pantalla.

          Abajo a la derecha: el riel está a la izquierda y la columna
          de contexto solo aparece a partir de xl, así que esa esquina
          es la única que no tapa nada en ningún ancho.

          En el teléfono, arriba y al centro: abajo a la derecha la
          pastilla del título se corría a un lado, la X quedaba suelta
          del otro y el aviso tapaba el buscador o el botón de la
          pantalla, que en el teléfono viven abajo.

          Solo posición y comportamiento. El aspecto y la animación
          son los que trae la librería: no se le pasa `preset`, ni
          separación, ni margen. */}
      {createPortal(
        <GooeyToaster
          position={esTelefono ? "top-center" : "bottom-right"}
          closeButton={!esTelefono}
          swipeToDismiss
          closeOnEscape
          visibleToasts={4}
        />,
        document.body,
      )}

      <ContadoresMenu.Provider value={contadoresMenu}>
        <RielSuave {...navegacion} />
        <CajonSuave
          {...navegacion}
          abierto={menuAbierto}
          cerrar={cerrarMenu}
          onNavegar={cerrarMenu}
        />
      </ContadoresMenu.Provider>

      {/* ── El lienzo ── */}
      <div className="lienzo flex min-w-0 flex-1 flex-col overflow-hidden rounded-[26px] bg-canvas">
        {/* La barra superior no es una franja: el canvas del lienzo
            sube hasta el borde y solo flotan encima el título y los
            controles. Una franja blanca partiría el lienzo en dos
            justo debajo de su propia esquina redonda. */}
        <header
          className={`anim-rise relative z-[80] flex h-16 shrink-0 items-center gap-2 px-3 sm:gap-3 lg:px-4 ${
            conEncabezadoPropio ? "md:h-0 md:overflow-hidden md:px-0 md:opacity-0" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label={t("shell.menu.open")}
            aria-expanded={menuAbierto}
            className="flota flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-rail transition-transform duration-200 ease-out active:scale-[0.94] md:hidden"
          >
            <Menu size={19} />
          </button>

          {!conEncabezadoPropio && (
            <h1 className="titular min-w-0 flex-1 truncate text-[20px] text-ink">
              {(() => {
                const clave = tituloDeRuta(rol, pathname);
                return clave ? t(clave) : MARCA.completo;
              })()}
            </h1>
          )}
          {conEncabezadoPropio && <div className="min-w-0 flex-1" />}

          <QuickLanguageSwitcher className="flota flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-rail transition-transform duration-200 ease-out active:scale-[0.94]" />

          <div className="relative">
            {/* En las páginas de encabezado propio la campana se pinta
                dentro de ese encabezado —vía `NotificationButtonContext`—,
                pero solo en la computadora. En el teléfono va siempre
                acá, en la barra de arriba junto al menú y el idioma: es
                donde se la busca, y abajo, al lado de "Gestionar
                tarjetas", parecía un botón más de la página. */}
            {conEncabezadoPropio ? <div className="md:hidden">{botonNotificaciones}</div> : botonNotificaciones}

            {notificacionesAbiertas && createPortal(
              <>
                <button
                  type="button"
                  aria-label={t("shell.notifications.closeAria")}
                  onClick={() => setNotificacionesAbiertas(false)}
                  className="fixed inset-0 z-[110] cursor-default"
                />
                <div
                  role="dialog"
                  aria-label={t("shell.notifications.title")}
                  className="flota pointer-events-auto fixed z-[120] flex flex-col overflow-hidden rounded-[18px] bg-surface shadow-xl"
                  style={{
                    top: notifPanelPos?.top ?? 76,
                    right: notifPanelPos?.right ?? 12,
                    width: notifPanelPos?.ancho ?? "min(420px, calc(100vw - 24px))",
                    // Que el panel termine dentro de la pantalla y la
                    // lista ruede por dentro, no la página.
                    maxHeight: `calc(100dvh - ${(notifPanelPos?.top ?? 76) + 12}px)`,
                  }}
                >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-sunken px-4 py-3">
                  <h2 className="rotulo text-ink-mute">{t("shell.notifications.title")}</h2>
                  {notificaciones.length > 0 && (confirmarBorrado ? (
                    /* El segundo toque, en el mismo sitio: la pregunta
                       reemplaza a los botones y nada salta de lugar. */
                    <div className="flex items-center gap-3" role="group" aria-label={t("shell.notifications.deleteAllConfirm")}>
                      <span className="text-[12px] font-semibold text-ink">{t("shell.notifications.deleteAllConfirm")}</span>
                      <button
                        type="button"
                        onClick={() => void eliminarTodas()}
                        disabled={accionNotificacion !== null}
                        className="text-[12px] font-semibold text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t("shell.notifications.deleteAllYes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmarBorrado(false)}
                        className="text-[12px] font-semibold text-ink-soft hover:underline"
                      >
                        {t("shell.notifications.deleteAllNo")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {pendientes > 0 && (
                        <button
                          type="button"
                          onClick={() => void leerTodas()}
                          disabled={accionNotificacion !== null}
                          className="text-[12px] font-semibold text-accent-dark hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("shell.notifications.markAllRead")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmarBorrado(true)}
                        disabled={accionNotificacion !== null}
                        className="text-[12px] font-semibold text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t("shell.notifications.deleteAll")}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:max-h-[420px]">
                  {notificacionesError && (
                    <p className="mb-2 rounded-[12px] bg-danger-wash px-3 py-2 text-[12px] text-danger">
                      {notificacionesError}
                    </p>
                  )}
                  {notificaciones.length === 0 ? (
                    <div className="flex flex-col items-center px-4 py-8 text-center">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-sunken text-ink-mute">
                        <Bell size={18} />
                      </span>
                      <p className="mt-3 text-[13px] font-semibold text-ink">{t("shell.notifications.empty")}</p>
                      <p className="mt-1 max-w-[260px] text-[12px] text-ink-soft">{t("shell.notifications.emptyHint")}</p>
                    </div>
                  ) : (
                    notificaciones.map((n) => {
                      const IconoTipo = ICONO_NOTIFICACION[n.tipo] ?? Bell;
                      return (
                      /* El mensaje se queda con todo el ancho y debajo va
                         un solo renglón: cuándo, a la izquierda, y los
                         dos botones a la derecha. El círculo de la
                         izquierda dice de qué se trata —un paseo, un
                         pago, una reseña— y, en turquesa, que no se leyó. */
                      <div
                        key={n.id_notificacion}
                        className={`flex items-start gap-3 rounded-[14px] px-3 pt-3 pb-1.5 hover:bg-sunken ${
                          n.leido ? "text-ink-soft" : "text-ink"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full ${
                            n.leido ? "bg-sunken text-ink-mute" : "bg-accent-wash text-accent-dark"
                          }`}
                        >
                          <IconoTipo size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => void abrirDesdeNotificacion(n)}
                          disabled={accionNotificacion !== null}
                          className="block w-full text-left disabled:cursor-not-allowed"
                        >
                          <span className={`block text-[12.5px] leading-snug ${n.leido ? "" : "font-medium"}`}>
                            {n.mensaje}
                          </span>
                        </button>
                        <div className="relative z-10 mt-0.5 flex items-center gap-1">
                          <time
                            dateTime={n.fecha}
                            title={new Intl.DateTimeFormat(localeTag, {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(n.fecha))}
                            className="nums mr-auto text-[11px] font-normal text-ink-mute"
                          >
                            {haceCuanto(n.fecha, localeTag)}
                          </time>
                          {!n.leido && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void leerNotificacion(n.id_notificacion);
                              }}
                              aria-label={t("shell.notifications.markRead")}
                              title={t("shell.notifications.markRead")}
                              disabled={accionNotificacion !== null}
                              className="flex h-8 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold text-ink-soft hover:bg-ok-wash hover:text-ok disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Check size={14} />
                              {t("shell.notifications.read")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void eliminarNotificacion(n.id_notificacion);
                            }}
                            aria-label={t("shell.notifications.delete")}
                            title={t("shell.notifications.delete")}
                            disabled={accionNotificacion !== null}
                            className="flex h-8 items-center justify-center gap-1 rounded-full px-2 text-[11px] font-semibold text-ink-soft hover:bg-danger-wash hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            {t("common.delete")}
                          </button>
                        </div>
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
                </div>
              </>,
              document.body,
            )}
          </div>
        </header>

        {/* ── El aviso de verificación ──

            Antes la condición era `profile?.verificacion.estado !==
            "aprobado"`. Mientras el perfil carga, `profile` es `null`,
            la cadena da `undefined`, y `undefined !== "aprobado"` es
            verdadero: la app trataba como NO verificado a todo el que
            todavía no había terminado de cargar. A quien sí estaba
            verificado le aparecía el aviso amarillo un instante y se
            iba, empujando la pantalla dos veces.

            Ahora el aviso solo se decide con el perfil YA en la mano.
            Mientras carga —o si la consulta falla— no se acusa a nadie.

            Y cuando sí corresponde, se abre: la fila pasa de 0fr a 1fr
            en vez de aparecer de golpe y bajar todo el contenido de un
            salto. Es la única forma de animar a una altura que no se
            conoce de antemano sin medirla. */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
          style={{ gridTemplateRows: avisoVerificacion ? "1fr" : "0fr" }}
        >
          <div className="min-h-0 overflow-hidden">
            {avisoVerificacion && profile && (
              <div
                className="mx-3 flex flex-wrap items-center gap-2 rounded-[18px] bg-warn-wash px-5 py-3 text-[12.5px] text-warn lg:mx-4"
                role="status"
              >
                <ShieldAlert size={16} aria-hidden className="shrink-0" />
                <span className="min-w-[16rem] flex-1">
                  {profile?.verificacion.estado === "pendiente"
                    ? t("shell.verificationBanner.pending")
                    : profile?.verificacion.estado === "rechazado"
                      ? t("shell.verificationBanner.rejected", {
                          detail:
                            profile.verificacion.observacion ??
                            t("shell.verificationBanner.rejectedFallback"),
                        })
                      : t("shell.verificationBanner.none")}
                </span>
                {/* El fragmento no es decorativo: el perfil abre por
                    pestañas y sin él este enlace deja al usuario en "Mis
                    datos", que es justo lo que no vino a ver. */}
                <Link
                  to="/perfil"
                  hash="verificacion"
                  className="font-semibold underline underline-offset-2"
                >
                  {t("shell.verificationBanner.link")}
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-y-auto">
          <main className="min-w-0 flex-1 px-3 pt-2 pb-4 lg:px-4">
            {/* La clave remonta el contenido en cada ruta: así la entrada
                se reproduce al navegar, no solo al cargar la página. */}
            <div
              key={pathname}
              className={`anim-rise mx-auto w-full ${contenidoAncho ? "max-w-[1600px]" : "max-w-[900px]"}`}
            >
              <PageWidthContext.Provider value={setContenidoAncho}>
                {/* La copia del encabezado de la página: solo desde `md`.
                    En el teléfono manda la de la barra de arriba. */}
                <NotificationButtonContext.Provider
                  value={conEncabezadoPropio ? <span className="hidden md:contents">{botonNotificaciones}</span> : null}
                >
                  {children}
                </NotificationButtonContext.Provider>
              </PageWidthContext.Provider>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
};

export default AppShell;
