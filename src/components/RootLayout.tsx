import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Footprints,
  LogOut,
  PawPrint,
  ShieldCheck,
  Store,
} from "../lib/iconos";

import LoginPage from "../page/LoginPage";
import AppShell from "./AppShell";
import Landing from "../landing";
import Splash from "./Splash";

import {
  MARCA,
  navPorRol,
  RUTA_ADMIN,
  inicioDeRol,
  type Rol,
} from "../lib/nav";

import { useAuth } from "../hooks/useAuth";
import AuthGuard from "../guards/AuthGuard";
import RoleGuard from "../guards/RoleGuard";

/*
 * Un único login monta el shell correspondiente al rol recibido
 * desde Supabase Auth.
 */

/* ============================================================
   INFORMACIÓN VISUAL DE LOS ROLES
   ============================================================ */

const rolMeta: Record<
  Rol,
  {
    titulo: string;
    descripcion: string;
    Icon: typeof PawPrint;
  }
> = {
  dueno: {
    titulo: "Dueño",
    descripcion: "Administra tus mascotas, vacunas y solicitudes de paseo.",
    Icon: PawPrint,
  },

  paseador: {
    titulo: "Paseador",
    descripcion: "Gestiona solicitudes, disponibilidad y servicios de paseo.",
    Icon: Footprints,
  },

  negocio: {
    titulo: "Negocio",
    descripcion: "Administra tu negocio y presencia dentro del directorio.",
    Icon: Store,
  },

  admin: {
    titulo: "Administrador",
    descripcion: "Gestiona usuarios, verificaciones y configuración general.",
    Icon: ShieldCheck,
  },
};

/* ============================================================
   SELECTOR DE ROL
   ============================================================ */

const RoleChooser = ({
  roles,
  isAdmin,
  onChoose,
  onLogout,
}: {
  roles: Exclude<Rol, "admin">[];
  isAdmin: boolean;
  onChoose: (rol: Rol) => void;
  onLogout: () => void;
}) => {
  /*
   * Si además de sus perfiles normales el usuario es administrador,
   * agregamos "admin" a las opciones disponibles.
   */
  const disponibles: Rol[] = [
    ...roles,
    ...(isAdmin ? (["admin"] as const) : []),
  ];

  /* ── La antesala ──
     Esta pantalla se ve entre el login y la aplicación, así que se
     viste como la aplicación: suelo gris azulado, una tarjeta que
     flota encima, píldoras y Archivo. Antes era otra cosa —manchas
     difuminadas de fondo, un degradado en la cabecera y un borde
     alrededor de cada caja—, y ninguno de esos tres recursos existe
     en el resto del sistema: acá lo que separa las cosas es el color
     del fondo y la distancia, nunca una línea.

     Los perfiles van en filas y no en tarjetas grandes de dos
     columnas. Son entre uno y cuatro, se leen de un vistazo, y una
     lista corta en filas se recorre más rápido que una cuadrícula —
     que además deja un hueco desparejado cuando el número es impar,
     que es el caso más común porque casi nadie tiene cuatro. */
  return (
    <main className="suave flex min-h-dvh items-center justify-center bg-suelo px-4 py-8">
      <section className="lienzo w-full max-w-[540px] overflow-hidden rounded-[26px] bg-surface">
        {/* El celeste del login: esta pantalla viene justo después de
            esa, y compartir el color hace que se lea como el mismo
            trayecto y no como otra aplicación.

            El texto vuelve a ser claro. Sobre este celeste el blanco
            da 6.3:1 y el pálido 5.3:1; la tinta se quedaría en 4.3 y
            no pasaría AA, que es lo contrario de lo que pasaba con el
            azul suave de la portada —ahí el claro era el que fallaba.
            Al cambiar el fondo hay que rehacer la cuenta, no arrastrar
            los colores de antes. */}
        <div className="bg-rail-claro px-6 py-7 text-center sm:px-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-canvas">
            <img
              src={MARCA.logoSimbolo}
              alt=""
              aria-hidden
              className="h-8 w-8 object-contain"
            />
          </span>

          <p className="rotulo mt-4 text-accent-wash">{MARCA.completo}</p>

          <h1 className="titular mt-2 text-[26px] text-white sm:text-[28px]">
            ¿Cómo quieres ingresar?
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-accent-wash">
            Elegí el perfil que vas a usar. Podés cambiarlo después sin
            volver a entrar.
          </p>
        </div>

        <div className="p-4 sm:p-5">
          {disponibles.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {disponibles.map((item, i) => {
                const meta = rolMeta[item];

                return (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => onChoose(item)}
                      style={{ animationDelay: `${60 + i * 60}ms` }}
                      className="anim-rise group flex w-full items-center gap-4 rounded-[18px] px-4 py-4 text-left transition-[background-color,transform] duration-200 ease-out hover:bg-sunken active:scale-[0.985]"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-deep transition-colors duration-200 group-hover:bg-rail group-hover:text-white">
                        <meta.Icon size={20} strokeWidth={1.9} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="titular block text-[16px] text-ink">
                          {meta.titulo}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">
                          {meta.descripcion}
                        </span>
                      </span>

                      {/* El disco de turquesa con la flecha navy: el
                          mismo remate de las píldoras de la portada.
                          Blanco sobre turquesa daría 3.0:1 y se
                          ensucia; navy encima se lee limpio. */}
                      <span
                        aria-hidden
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-ink-mute transition-[background-color,color,transform] duration-200 ease-out group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-rail"
                      >
                        <ArrowRight size={17} strokeWidth={2.4} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-[18px] bg-danger-wash px-5 py-6 text-center">
              <p className="text-[13.5px] font-semibold text-danger">
                Esta cuenta no tiene perfiles activos.
              </p>
              <p className="mt-1.5 text-[12.5px] text-danger/80">
                Escribile a administración si creés que es un error.
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-medium text-ink-mute transition-[background-color,color,transform] duration-150 ease-out hover:bg-sunken hover:text-ink active:scale-[0.97]"
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

/* ============================================================
   ROOT LAYOUT
   ============================================================ */

const RootLayout = () => {
  const [splash, setSplash] = useState(false);

  /*
   * null:
   *   Se muestra la Landing pública.
   *
   * signin:
   *   Se muestra el formulario de inicio de sesión.
   *
   * signup:
   *   Se muestra el formulario de registro.
   */
  const [accesoPublico, setAccesoPublico] = useState<
    "signin" | "signup" | null
  >(null);

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const {
    role,
    roles,
    isAdmin,
    logout,
    setActiveRole,
  } = useAuth();

  /* ============================================================
     DETECTAR TIPO DE RUTA
     ============================================================ */

  const zonaAdmin = pathname.startsWith(RUTA_ADMIN);

  /*
   * Estas rutas manejan su propia interfaz y no deben pasar
   * por Landing, AppShell ni RoleChooser.
   */
  const esRutaAuth = [
    "/registro",
    "/recuperar-contrasena",
    "/actualizar-contrasena",
    /* La página de captura de esqueletos trae su propia reconstrucción
       del armazón, a medida para que los huesos salgan con las
       medidas reales. Montarla dentro del armazón de verdad la
       encerraría dos veces. */
    "/esqueletos",
  ].includes(pathname);

  /*
   * Si estamos dentro del panel administrativo y el usuario
   * realmente es administrador, forzamos visualmente el rol admin.
   *
   * En cualquier otro caso usamos el rol activo.
   */
  const rolActual: Rol | null =
    zonaAdmin && isAdmin ? "admin" : role;

  /* ============================================================
     DETERMINAR QUÉ ROLES PUEDEN VER LA RUTA ACTUAL
     ============================================================ */

  const rolesDeRuta = (Object.keys(navPorRol) as Rol[]).filter(
    (rolDeRuta) =>
      navPorRol[rolDeRuta].some((grupo) =>
        grupo.items.some((item) => item.to === pathname),
      ),
  );

  /*
   * Si encontramos la ruta dentro de navPorRol,
   * usamos únicamente esos roles.
   *
   * Si no aparece:
   *
   * - rutas /admin... → únicamente admin
   * - resto → perfiles normales
   */
  const rolesPermitidos: Rol[] = rolesDeRuta.length
    ? rolesDeRuta
    : zonaAdmin
      ? ["admin"]
      : ["dueno", "paseador", "negocio"];

  /* ============================================================
     CORREGIR NAVEGACIÓN SEGÚN EL ROL
     ============================================================ */

  useEffect(() => {
    const rolesActuales = (Object.keys(navPorRol) as Rol[]).filter(
      (rolDeRuta) =>
        navPorRol[rolDeRuta].some((grupo) =>
          grupo.items.some((item) => item.to === pathname),
        ),
    );

    const rutaPermitida: Rol[] = rolesActuales.length
      ? rolesActuales
      : zonaAdmin
        ? ["admin"]
        : ["dueno", "paseador", "negocio"];

    /*
     * Si entró a una ruta administrativa y su cuenta
     * tiene privilegios de administrador, activamos ese rol.
     */
    if (zonaAdmin && isAdmin && role !== "admin") {
      setActiveRole("admin");
      return;
    }

    /*
     * Si ya tiene un rol seleccionado pero intenta entrar
     * a una sección que no pertenece a ese rol,
     * lo devolvemos al inicio correspondiente.
     */
    if (role && !rutaPermitida.includes(role)) {
      setSplash(true);

      navigate({
        to: inicioDeRol[role],
      });
    }
  }, [
    isAdmin,
    navigate,
    pathname,
    role,
    setActiveRole,
    zonaAdmin,
  ]);

  /* ============================================================
     CERRAR SESIÓN
     ============================================================ */

  const salir = async () => {
    await logout();

    /*
     * Si estaba en el acceso administrativo,
     * vuelve al acceso administrativo.
     *
     * En cualquier otro caso vuelve a la Landing.
     */
    navigate({
      to: zonaAdmin ? RUTA_ADMIN : "/",
    });

    setAccesoPublico(null);
  };

  /* ============================================================
     ELEGIR ROL
     ============================================================ */

  const escogerRol = (rolEscogido: Rol) => {
    setActiveRole(rolEscogido);

    navigate({
      to: inicioDeRol[rolEscogido],
    });
  };

  /* ============================================================
     SPLASH
     ============================================================ */

  const cerrarSplash = useCallback(() => {
    setSplash(false);
  }, []);

  /* ============================================================
     RUTAS DE AUTENTICACIÓN INDEPENDIENTES
     ============================================================ */

  if (esRutaAuth) {
    return <Outlet />;
  }

  /* ============================================================
     PUERTA PÚBLICA
     ============================================================ */

  /*
   * El administrador no pasa por la Landing.
   * /acceso-interno abre directamente LoginPage.
   *
   * Para usuarios normales:
   *
   * Landing
   *   ↓
   * Entrar / Registrarse
   *   ↓
   * LoginPage
   */
  const puertaPublica =
    zonaAdmin || accesoPublico !== null ? (
      <LoginPage
        initialMode={accesoPublico ?? "signin"}
        onBack={
          zonaAdmin
            ? undefined
            : () => setAccesoPublico(null)
        }
      />
    ) : (
      <Landing
        onEntrar={(modo) => {
          setAccesoPublico(
            modo === "registro"
              ? "signup"
              : "signin",
          );
        }}
      />
    );

  /* ============================================================
     RENDER PRINCIPAL
     ============================================================ */

  return (
    <AuthGuard fallback={puertaPublica}>
      {!role ? (
        <RoleChooser
          roles={roles}
          isAdmin={isAdmin}
          onChoose={escogerRol}
          onLogout={salir}
        />
      ) : (
        <RoleGuard
          roles={rolesPermitidos}
          fallback={puertaPublica}
        >
          {splash && (
            <Splash onFin={cerrarSplash} />
          )}

          <div
            key={splash ? "cargando" : "listo"}
            className="anim-app-in"
          >
            {rolActual && (
              <AppShell
                rol={rolActual}
                onLogout={salir}
              >
                <Outlet />
              </AppShell>
            )}
          </div>
        </RoleGuard>
      )}
    </AuthGuard>
  );
};

export default RootLayout;