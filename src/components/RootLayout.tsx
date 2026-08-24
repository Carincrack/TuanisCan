import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import LoginPage from "../page/LoginPage";
import AppShell from "./AppShell";
import Splash from "./Splash";
import { navPorRol, RUTA_ADMIN, inicioDeRol, type Rol } from "../lib/nav";
import { useAuth } from "../hooks/useAuth";
import AuthGuard from "../guards/AuthGuard";
import RoleGuard from "../guards/RoleGuard";

/* Un único login monta el shell correspondiente al rol recibido desde
  Supabase Auth. */

const RootLayout = () => {
  const [splash, setSplash] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { role, logout } = useAuth();

  const zonaAdmin = pathname.startsWith(RUTA_ADMIN);
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
    : ["dueno", "paseador"];

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
      : ["dueno", "paseador"];

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

  /* La `key` cambia cuando el splash termina: eso remonta el shell y sus
     animaciones de entrada se reproducen ahí, no detrás de la cortina.
     Sin esto la barra lateral aparecía ya asentada — sus ítems habían
     animado mientras el splash los tapaba. */
  return (
    <AuthGuard
      fallback={<LoginPage />}
    >
      <RoleGuard roles={rolesPermitidos} fallback={<LoginPage />}>
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
