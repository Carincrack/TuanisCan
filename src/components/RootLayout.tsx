import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Footprints,
  LogOut,
  PawPrint,
  ShieldCheck,
  Store,
} from "lucide-react";

import LoginPage from "../page/LoginPage";
import AppShell from "./AppShell";
import Landing from "../landing";
import Splash from "./Splash";

import {
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

  return (
    <main
      className="
        relative
        flex min-h-dvh
        items-center
        justify-center
        overflow-hidden
        bg-canvas
        px-4
        py-10
      "
    >
      {/* Decoración de fondo */}
      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          -left-24 -top-20
          h-72 w-72
          rounded-full
          bg-accent/[0.07]
          blur-3xl
        "
      />

      <div
        aria-hidden
        className="
          pointer-events-none
          absolute
          -bottom-28 -right-20
          h-80 w-80
          rounded-full
          bg-accent/[0.05]
          blur-3xl
        "
      />

      <section
        className="
          relative
          w-full
          max-w-[620px]
          overflow-hidden
          rounded-3xl
          border
          border-black/[0.06]
          bg-surface
          shadow-[0_24px_70px_rgba(15,32,44,0.10)]
        "
      >
        {/* ====================================================
            CABECERA
           ==================================================== */}

        <div
          className="
            relative
            overflow-hidden
            border-b
            border-black/[0.05]
            bg-gradient-to-br
            from-accent/[0.09]
            via-surface
            to-accent/[0.025]
            px-6
            py-7
            text-center
            sm:px-8
            sm:py-8
          "
        >
          <div
            aria-hidden
            className="
              pointer-events-none
              absolute
              left-1/2 top-0
              h-40 w-40
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-accent/[0.08]
              blur-3xl
            "
          />

          <div className="relative">
            <div
              className="
                mx-auto
                flex h-12 w-12
                items-center
                justify-center
                rounded-2xl
                bg-accent/10
                text-accent-dark
              "
            >
              <PawPrint size={22} strokeWidth={1.9} />
            </div>

            <p
              className="
                mt-4
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-accent-dark
              "
            >
              TuanisCan
            </p>

            <h1
              className="
                mt-2
                text-[25px]
                font-semibold
                tracking-[-0.025em]
                text-ink
                sm:text-[28px]
              "
            >
              ¿Cómo quieres ingresar?
            </h1>

            <p
              className="
                mx-auto
                mt-2
                max-w-md
                text-[13px]
                leading-relaxed
                text-ink-soft
              "
            >
              Selecciona el perfil que deseas utilizar. Podrás cambiarlo
              posteriormente desde la aplicación.
            </p>
          </div>
        </div>

        {/* ====================================================
            OPCIONES
           ==================================================== */}

        <div className="p-5 sm:p-6">
          {disponibles.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {disponibles.map((item) => {
                const meta = rolMeta[item];

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onChoose(item)}
                    className="
                      group
                      relative
                      flex min-h-[150px]
                      overflow-hidden
                      rounded-2xl
                      border
                      border-black/[0.06]
                      bg-surface
                      p-5
                      text-left
                      transition-all
                      duration-200

                      hover:-translate-y-0.5
                      hover:border-accent/30
                      hover:bg-accent/[0.025]
                      hover:shadow-[0_10px_30px_rgba(15,32,44,0.07)]

                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-accent/40
                    "
                  >
                    {/* Decoración al hover */}
                    <span
                      aria-hidden
                      className="
                        pointer-events-none
                        absolute
                        -right-10 -top-10
                        h-24 w-24
                        rounded-full
                        bg-accent/0
                        transition-all
                        duration-300
                        group-hover:bg-accent/[0.06]
                      "
                    />

                    <div className="relative flex w-full flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <span
                          className="
                            flex h-11 w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-accent/10
                            text-accent-dark
                            transition-all
                            duration-200

                            group-hover:bg-accent
                            group-hover:text-white
                          "
                        >
                          <meta.Icon size={20} strokeWidth={1.9} />
                        </span>

                        <span
                          className="
                            flex h-8 w-8
                            items-center
                            justify-center
                            rounded-full
                            text-ink-mute
                            transition-all
                            duration-200

                            group-hover:translate-x-0.5
                            group-hover:bg-accent/10
                            group-hover:text-accent-dark
                          "
                        >
                          <ArrowRight size={16} />
                        </span>
                      </div>

                      <div className="mt-4">
                        <h2
                          className="
                            text-[14px]
                            font-semibold
                            text-ink
                          "
                        >
                          {meta.titulo}
                        </h2>

                        <p
                          className="
                            mt-1.5
                            text-[11.5px]
                            leading-relaxed
                            text-ink-soft
                          "
                        >
                          {meta.descripcion}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              className="
                rounded-2xl
                border
                border-danger/10
                bg-danger-wash
                px-5
                py-5
                text-center
              "
            >
              <p className="text-[13px] font-medium text-danger">
                Esta cuenta no tiene perfiles activos.
              </p>

              <p className="mt-1 text-[11.5px] text-danger/80">
                Contacta a administración si consideras que esto es un error.
              </p>
            </div>
          )}

          {/* ====================================================
              CERRAR SESIÓN
             ==================================================== */}

          <div
            className="
              mt-6
              flex
              items-center
              justify-center
              border-t
              border-black/[0.05]
              pt-5
            "
          >
            <button
              type="button"
              onClick={onLogout}
              className="
                inline-flex
                items-center
                gap-2
                rounded-xl
                px-3
                py-2
                text-[12px]
                font-medium
                text-ink-mute
                transition

                hover:bg-sunken
                hover:text-ink

                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-accent/30
              "
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