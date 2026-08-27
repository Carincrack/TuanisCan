import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import type { FunctionComponent } from "react";
import RootLayout from "./src/components/RootLayout";
import HomePage from "./src/page/HomePage";
import AboutPage from "./src/page/AboutPage";
import dashboardPage from "./src/page/dashboardPage";
import MascotasPage from "./src/page/MascotasPage";
import PaseadoresPage from "./src/page/PaseadoresPage";
import RegisterPage from "./src/page/RegisterPage";
import ForgotPasswordPage from "./src/page/ForgotPasswordPage";
import UpdatePasswordPage from "./src/page/UpdatePasswordPage";
import ProfilePage from "./src/page/ProfilePage";
import ZonasAdminPage from "./src/page/ZonasAdminPage";
import Paseos from "./src/components/paseos";
import PaseoEnVivo from "./src/components/paseoEnVivo";
import MascotasPerdidas from "./src/components/mascotasPerdidas";
import Directorio from "./src/components/directorio";
import Pagos from "./src/components/pagos";
import Resenas from "./src/components/resenas";
import CarnetDigital from "./src/components/carnet";
import { RUTA_ADMIN } from "./src/lib/nav";
import {
  FinanzasAdmin,
  PanelAdmin,
  PaseadoresAdmin,
  PaseosAdmin,
  UsuariosAdmin,
  VerificacionesAdmin,
} from "./src/components/admin";
import {
  AgendaPaseador,
  GananciasPaseador,
  PanelPaseador,
  PaseoActivoPaseador,
  PerfilPaseador,
  ResenasPaseador,
  SolicitudesPaseador,
} from "./src/components/paseador";

// 1. Definir root
const rootRoute = createRootRoute({
  component: RootLayout,
});

// 2. Definir rutas hijas
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutPage,
});
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/registro",
  component: RegisterPage,
});
const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recuperar-contrasena",
  component: ForgotPasswordPage,
});
const updatePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/actualizar-contrasena",
  component: UpdatePasswordPage,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/perfil",
  component: ProfilePage,
});
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: dashboardPage,
});
const mascotasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mascotas",
  component: MascotasPage,
});

const paseadoresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/paseadores",
  component: PaseadoresPage,
});

// Pantallas del Seguimiento 1: apuntan directo al componente, sin archivo
// wrapper en src/page porque el wrapper no agregaría nada.
const paseosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/paseos",
  component: Paseos,
});

const paseoEnVivoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/paseo-en-vivo",
  component: PaseoEnVivo,
});

const mascotasPerdidasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mascotas-perdidas",
  component: MascotasPerdidas,
});

const directorioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/directorio",
  component: Directorio,
});

const pagosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pagos",
  component: Pagos,
});

const resenasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/resenas",
  component: Resenas,
});

const ruta = (path: string, component: FunctionComponent) =>
  createRoute({ getParentRoute: () => rootRoute, path, component });

const carnetRoute = ruta("/carnet", CarnetDigital);

/* Lado del paseador. Prefijo /p/ para que las dos mitades de la
   plataforma no se pisen ni se confundan al leer las rutas. */
const panelPaseadorRoute = ruta("/p/panel", PanelPaseador);
const solicitudesRoute = ruta("/p/solicitudes", SolicitudesPaseador);
const agendaRoute = ruta("/p/agenda", AgendaPaseador);
const paseoActivoRoute = ruta("/p/paseo-activo", PaseoActivoPaseador);
const gananciasRoute = ruta("/p/ganancias", GananciasPaseador);
const perfilPaseadorRoute = ruta("/p/perfil", PerfilPaseador);
const resenasPaseadorRoute = ruta("/p/resenas", ResenasPaseador);

/* Panel interno de la plataforma. No se enlaza desde ninguna pantalla
   pública: se llega escribiendo la ruta. RootLayout exige el login de
   administración antes de montar cualquiera de estas. */
const adminPanelRoute = ruta(RUTA_ADMIN, PanelAdmin);
const adminFinanzasRoute = ruta(`${RUTA_ADMIN}/finanzas`, FinanzasAdmin);
const adminPaseadoresRoute = ruta(`${RUTA_ADMIN}/paseadores`, PaseadoresAdmin);
const adminVerificacionesRoute = ruta(
  `${RUTA_ADMIN}/verificaciones`,
  VerificacionesAdmin
);
const adminUsuariosRoute = ruta(`${RUTA_ADMIN}/usuarios`, UsuariosAdmin);
const adminZonasRoute = ruta(`${RUTA_ADMIN}/zonas`, ZonasAdminPage);
const adminPaseosRoute = ruta(`${RUTA_ADMIN}/paseos`, PaseosAdmin);

// 3. Añadir al root
rootRoute.addChildren([
  carnetRoute,
  adminPanelRoute,
  adminFinanzasRoute,
  adminPaseadoresRoute,
  adminVerificacionesRoute,
  adminUsuariosRoute,
  adminZonasRoute,
  adminPaseosRoute,
  panelPaseadorRoute,
  solicitudesRoute,
  agendaRoute,
  paseoActivoRoute,
  gananciasRoute,
  perfilPaseadorRoute,
  resenasPaseadorRoute,
  homeRoute,
  aboutRoute,
  registerRoute,
  forgotPasswordRoute,
  updatePasswordRoute,
  profileRoute,
  dashboardRoute,
  mascotasRoute,
  paseadoresRoute,
  paseosRoute,
  paseoEnVivoRoute,
  mascotasPerdidasRoute,
  directorioRoute,
  pagosRoute,
  resenasRoute,
]);

// 4. Crear router
const router = createRouter({
  routeTree: rootRoute,
});

export default router;
