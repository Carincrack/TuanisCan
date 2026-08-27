import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import LoginPage from "../page/LoginPage";
import AppShell from "./AppShell";
import Landing from "./landing";
import Splash from "./Splash";
import { navPorRol, RUTA_ADMIN, inicioDeRol, type Rol } from "../lib/nav";
import { useAuth } from "../hooks/useAuth";
import AuthGuard from "../guards/AuthGuard";
import RoleGuard from "../guards/RoleGuard";

/* Un único login monta el shell correspondiente al rol recibido desde
  Supabase Auth. */

const rolLabel: Record<Rol, string> = {
  dueno: "Dueño",
  paseador: "Paseador",
  negocio: "Negocio",
  admin: "Admin",
};

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
  const disponibles: Rol[] = [...roles, ...(isAdmin ? (["admin"] as const) : [])];

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <section className="w-full max-w-[420px] bg-surface px-6 py-7 text-center shadow-[0_18px_50px_rgba(15,32,44,0.12)]">
        <h1 className="text-[24px] font-semibold text-ink">¿Cómo quieres ingresar?</h1>
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
          <p className="mt-4 text-[13px] text-danger">Esta cuenta no tiene perfiles activos.</p>
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

const RootLayout = () => {
  const [splash, setSplash] = useState(false);
  /* Qué ve quien no tiene sesión: la portada, o el login si ya pulsó
     alguno de sus botones. `null` = portada. */
  const [accesoPublico, setAccesoPublico] = useState<"signin" | "signup" | null>(
    null
  );
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { role, roles, isAdmin, logout, setActiveRole } = useAuth();

  const zonaAdmin = pathname.startsWith(RUTA_ADMIN);
  const esRutaAuth = [
    "/registro",
    "/recuperar-contrasena",
    "/actualizar-contrasena",
  ].includes(pathname);
  const rol = (zonaAdmin && isAdmin ? "admin" : role) as Rol;
  const rolesDeRuta = (Object.keys(navPorRol) as Rol[]).filter((rolDeRuta) =>
    navPorRol[rolDeRuta].some((grupo) =>
      grupo.items.some((item) => item.to === pathname)
    )
  );
  const rolesPermitidos: Rol[] = rolesDeRuta.length
    ? rolesDeRuta
    : zonaAdmin
    ? ["admin"]
    : ["dueno", "paseador", "negocio"];

  useEffect(() => {
    const rolesActuales = (Object.keys(navPorRol) as Rol[]).filter((rolDeRuta) =>
      navPorRol[rolDeRuta].some((grupo) =>
        grupo.items.some((item) => item.to === pathname)
      )
    );
    const rutaPermitida = rolesActuales.length
      ? rolesActuales
      : zonaAdmin
      ? ["admin"]
      : ["dueno", "paseador", "negocio"];

    if (zonaAdmin && isAdmin && role !== "admin") {
      setActiveRole("admin");
      return;
    }

    if (role && !rutaPermitida.includes(role)) {
      setSplash(true);
      navigate({ to: inicioDeRol[role] });
    }
  }, [isAdmin, navigate, pathname, role, setActiveRole, zonaAdmin]);

  const salir = async () => {
    await logout();
    navigate({ to: zonaAdmin ? RUTA_ADMIN : "/" });
  };

  const escogerRol = (rolEscogido: Rol) => {
    setActiveRole(rolEscogido);
    navigate({ to: inicioDeRol[rolEscogido] });
  };

  const cerrarSplash = useCallback(() => setSplash(false), []);

  if (esRutaAuth) return <Outlet />;

  /* La `key` cambia cuando el splash termina: eso remonta el shell y sus
     animaciones de entrada se reproducen ahí, no detrás de la cortina.
     Sin esto la barra lateral aparecía ya asentada — sus ítems habían
     animado mientras el splash los tapaba. */
  /* El panel interno no tiene portada: /acceso-interno entra directo al
     login. El resto del mundo llega primero a la portada pública. */
  const puertaPublica =
    zonaAdmin || accesoPublico !== null ? (
      <LoginPage
        modoInicial={accesoPublico ?? "signin"}
        onVolver={zonaAdmin ? undefined : () => setAccesoPublico(null)}
      />
    ) : (
      <Landing
        onEntrar={(modo) =>
          setAccesoPublico(modo === "registro" ? "signup" : "signin")
        }
      />
    );

  return (
    <AuthGuard
      fallback={puertaPublica}
    >
      <RoleGuard roles={rolesPermitidos} fallback={puertaPublica}>
        {splash && <Splash onFin={cerrarSplash} />}
        <div key={splash ? "cargando" : "listo"} className="anim-app-in">
          <AppShell rol={rol} onLogout={salir}>
            <Outlet />
          </AppShell>
        </div>
      </RoleGuard>
      {!role ? (
        <RoleChooser roles={roles} isAdmin={isAdmin} onChoose={escogerRol} onLogout={salir} />
      ) : (
        <RoleGuard roles={rolesPermitidos} fallback={<LoginPage />}>
          {splash && <Splash onFin={cerrarSplash} />}
          <div key={splash ? "cargando" : "listo"} className="anim-app-in">
            <AppShell rol={rol} onLogout={salir}>
              <Outlet />
            </AppShell>
          </div>
        </RoleGuard>
      )}
    </AuthGuard>
  );
};

export default RootLayout;
