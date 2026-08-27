import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import LoginPage from "../page/LoginPage";
import AppShell from "./AppShell";
import Landing from "../landing";
import Splash from "./Splash";
import { navPorRol, RUTA_ADMIN, inicioDeRol, type Rol } from "../lib/nav";
import { useAuth } from "../hooks/useAuth";
import AuthGuard from "../guards/AuthGuard";
import RoleGuard from "../guards/RoleGuard";

/* Un único login monta el shell correspondiente al rol recibido desde
  Supabase Auth. */

const RootLayout = () => {
  const [splash, setSplash] = useState(false);
  /* Qué ve quien no tiene sesión: la portada, o el login si ya pulsó
     alguno de sus botones. `null` = portada. */
  const [accesoPublico, setAccesoPublico] = useState<"signin" | "signup" | null>(
    null
  );
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { role, logout } = useAuth();

  const zonaAdmin = pathname.startsWith(RUTA_ADMIN);
  const esRutaAuth = [
    "/registro",
    "/recuperar-contrasena",
    "/actualizar-contrasena",
  ].includes(pathname);
  const rol = role as Rol;
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

    if (role && !rutaPermitida.includes(role)) {
      setSplash(true);
      navigate({ to: inicioDeRol[role] });
    }
  }, [navigate, pathname, role, zonaAdmin]);

  const salir = async () => {
    await logout();
    navigate({ to: zonaAdmin ? RUTA_ADMIN : "/" });
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
    </AuthGuard>
  );
};

export default RootLayout;
