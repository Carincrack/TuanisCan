import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import LoginPage from "../page/LoginPage";
import AdminLoginPage from "../page/AdminLoginPage";
import AppShell from "./AppShell";
import Splash from "./Splash";
import { RUTA_ADMIN, inicioDeRol, type Rol } from "../lib/nav";

const CLAVE_ROL = "tuaniscan:rol";

const esRol = (v: string | null): v is Rol =>
  v === "dueno" || v === "paseador" || v === "admin";

/* Tres puertas de entrada sobre el mismo shell:

     /acceso-interno*  → login de administración (admin / 1234)
     el resto          → login público, donde se elige dueño o paseador

   La sesión es solo el rol guardado. No hay autenticación real todavía:
   el backend llega después de la defensa. */

const RootLayout = () => {
  const [rol, setRol] = useState<Rol | null>(null);
  const [cargado, setCargado] = useState(false);
  const [splash, setSplash] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const zonaAdmin = pathname.startsWith(RUTA_ADMIN);

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE_ROL);
    if (esRol(guardado)) setRol(guardado);
    setCargado(true);
  }, []);

  const entrar = (elegido: Rol) => {
    localStorage.setItem(CLAVE_ROL, elegido);
    setRol(elegido);
    setSplash(true);
    navigate({ to: inicioDeRol[elegido] });
  };

  const salir = () => {
    localStorage.removeItem(CLAVE_ROL);
    setRol(null);
    navigate({ to: zonaAdmin ? RUTA_ADMIN : "/" });
  };

  const cerrarSplash = useCallback(() => setSplash(false), []);

  // Evita el parpadeo del login mientras se lee localStorage.
  if (!cargado) return <div className="min-h-dvh bg-rail" />;

  if (zonaAdmin && rol !== "admin") {
    return <AdminLoginPage onLogin={() => entrar("admin")} />;
  }

  if (!zonaAdmin && (rol === null || rol === "admin")) {
    return <LoginPage onLogin={entrar} />;
  }

  /* La `key` cambia cuando el splash termina: eso remonta el shell y sus
     animaciones de entrada se reproducen ahí, no detrás de la cortina.
     Sin esto la barra lateral aparecía ya asentada — sus ítems habían
     animado mientras el splash los tapaba. */
  return (
    <>
      {splash && <Splash onFin={cerrarSplash} />}
      <div key={splash ? "cargando" : "listo"} className="anim-app-in">
        <AppShell rol={rol as Rol} onLogout={salir}>
          <Outlet />
        </AppShell>
      </div>
    </>
  );
};

export default RootLayout;
