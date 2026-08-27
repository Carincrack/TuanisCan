import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import LoginPage from "../page/LoginPage";
import AppShell from "./AppShell";
import Landing from "./landing";
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

const rolLabel: Record<Rol, string> = {
  dueno: "Dueño",
  paseador: "Paseador",
  negocio: "Negocio",
  admin: "Admin",
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
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <section className="w-full max-w-[420px] bg-surface px-6 py-7 text-center shadow-[0_18px_50px_rgba(15,32,44,0.12)]">
        <h1 className="text-[24px] font-semibold text-ink">
          ¿Cómo quieres ingresar?
        </h1>

        <div className="mt-6 grid gap-2">
          {disponibles.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChoose(item)}
              className="bg-sunken px-4 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-accent hover:text-white"
            >
              {rolLabel[item]}
            </button>
          ))}
        </div>

        {!disponibles.length && (
          <p className="mt-4 text-[13px] text-danger">
            Esta cuenta no tiene perfiles activos.
          </p>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="mt-5 text-[13px] font-medium text-ink-soft hover:text-ink"
        >
          Cerrar sesión
        </button>
      </section>
    </div>
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
        grupo.items.some((item) => item.to === pathname)
      )
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
          grupo.items.some((item) => item.to === pathname)
        )
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
              : "signin"
          );
        }}
      />
    );

  /* ============================================================
     RENDER PRINCIPAL
     ============================================================ */

  return (
    <AuthGuard fallback={puertaPublica}>
      {/*
       * Ya existe una sesión, pero todavía no se ha escogido
       * cuál perfil utilizar.
       *
       * Ejemplo:
       *
       * usuario
       * ├── dueño
       * ├── paseador
       * └── negocio
       *
       * Aquí aparece el selector.
       */}
      {!role ? (
        <RoleChooser
          roles={roles}
          isAdmin={isAdmin}
          onChoose={escogerRol}
          onLogout={salir}
        />
      ) : (
        /*
         * Ya existe sesión y además existe un rol activo.
         * Ahora validamos que ese rol tenga permiso para
         * entrar a la ruta actual.
         */
        <RoleGuard
          roles={rolesPermitidos}
          fallback={puertaPublica}
        >
          {splash && (
            <Splash onFin={cerrarSplash} />
          )}

          {/*
           * La key cambia cuando termina el Splash.
           *
           * Esto hace que AppShell vuelva a montarse y las
           * animaciones se ejecuten después del splash.
           */}
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
