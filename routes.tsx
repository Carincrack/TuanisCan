import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import type { ComponentType, FunctionComponent } from "react";
import { Skeleton } from "boneyard-js/react";
import RootLayout from "./src/components/RootLayout";
import { RUTA_ADMIN } from "./src/lib/nav";

/* ─────────────────────────────────────────────────────────────
   UNA PIEZA DE CÓDIGO POR RUTA

   Antes todo entraba por importaciones normales, así que el paquete
   era un solo archivo de 1,9 MB: quien abría la portada se bajaba
   también el panel de administración, el visor de documentos con su
   zoom, las siete pantallas del paseador y el carné. Y al revés: un
   dueño que entra a ver sus mascotas cargaba las animaciones de la
   portada.

   Con `lazy` cada ruta queda en su propio trozo y se pide la primera
   vez que se visita. Lo que se bajaba antes de ver nada ahora es
   solo el armazón.

   ── El respaldo del Suspense ──

   Mientras el trozo viaja hay que pintar algo, y acá se enlaza con
   los esqueletos: cada ruta declara el suyo. El efecto es continuo,
   porque son el mismo dibujo dos veces seguidas —primero mientras
   llega el código, después mientras el componente pide sus datos—.
   Quien mira ve un solo esqueleto que se convierte en la pantalla.

   Las rutas sin esqueleto propio no pintan nada: son formularios y
   pantallas de maqueta que aparecen enteros de una vez, y un
   parpadeo de relleno sería peor que el vacío de doscientos
   milisegundos que dura el trozo.
   ───────────────────────────────────────────────────────────── */

type Carga = () => Promise<{ default: ComponentType }>;

const perezoso = (carga: Carga, esqueleto?: string) => {
  const Componente = lazy(carga);

  const Ruta = () => (
    <Suspense
      fallback={
        esqueleto ? (
          <Skeleton name={esqueleto} loading>
            <div />
          </Skeleton>
        ) : null
      }
    >
      <Componente />
    </Suspense>
  );

  return Ruta;
};

/** Para los módulos que exportan varias pantallas con nombre —`admin`
    tiene seis, `paseador` siete—. Todas las de un módulo comparten
    trozo, que es lo correcto: quien entra al panel de administración
    va a recorrer sus otras pantallas. */
const nombrada = <T extends string>(carga: () => Promise<Record<T, ComponentType>>, clave: T): Carga =>
  () => carga().then((modulo) => ({ default: modulo[clave] }));

/* ── Las pantallas ──────────────────────────────────────────────── */

const HomePage = perezoso(() => import("./src/page/HomePage"));
const AboutPage = perezoso(() => import("./src/page/AboutPage"));
const RegisterPage = perezoso(() => import("./src/page/RegisterPage"));
const ForgotPasswordPage = perezoso(() => import("./src/page/ForgotPasswordPage"));
const UpdatePasswordPage = perezoso(() => import("./src/page/UpdatePasswordPage"));

const ProfilePage = perezoso(() => import("./src/page/ProfilePage"), "perfil-cuenta");
const dashboardPage = perezoso(() => import("./src/page/dashboardPage"), "panel-metricas");
const MascotasPage = perezoso(() => import("./src/page/MascotasPage"), "mascotas-rejilla");
const PaseadoresPage = perezoso(() => import("./src/page/PaseadoresPage"), "paseadores-rejilla");
const CarnetDigital = perezoso(() => import("./src/components/carnet"), "carnet-tarjeta");
const Paseos = perezoso(() => import("./src/components/paseos"), "paseos-lista");
const PaseoEnVivo = perezoso(() => import("./src/components/paseoEnVivo"));
const MascotasPerdidas = perezoso(() => import("./src/components/mascotasPerdidas"), "perdidas-rejilla");
const Directorio = perezoso(() => import("./src/components/directorio"), "directorio-rejilla");
const Pagos = perezoso(() => import("./src/components/pagos"));
const Resenas = perezoso(() => import("./src/components/resenas"));
const ZonasAdminPage = perezoso(() => import("./src/page/ZonasAdminPage"), "admin-tabla");
const PaginaCaptura = perezoso(() => import("./src/esqueletos/PaginaCaptura"));

const admin = () => import("./src/components/admin");
const PanelAdmin = perezoso(nombrada(admin, "PanelAdmin"), "panel-metricas");
const FinanzasAdmin = perezoso(nombrada(admin, "FinanzasAdmin"), "panel-metricas");
const PaseadoresAdmin = perezoso(nombrada(admin, "PaseadoresAdmin"), "admin-tabla");
const VerificacionesAdmin = perezoso(nombrada(admin, "VerificacionesAdmin"), "admin-verificaciones");
const UsuariosAdmin = perezoso(nombrada(admin, "UsuariosAdmin"), "admin-tabla");
const PaseosAdmin = perezoso(nombrada(admin, "PaseosAdmin"), "admin-tabla");

const paseador = () => import("./src/components/paseador");
const PanelPaseador = perezoso(nombrada(paseador, "PanelPaseador"), "panel-metricas");
const SolicitudesPaseador = perezoso(nombrada(paseador, "SolicitudesPaseador"), "paseador-solicitudes");
const AgendaPaseador = perezoso(nombrada(paseador, "AgendaPaseador"));
const PaseoActivoPaseador = perezoso(nombrada(paseador, "PaseoActivoPaseador"));
const GananciasPaseador = perezoso(nombrada(paseador, "GananciasPaseador"));
const PerfilPaseador = perezoso(nombrada(paseador, "PerfilPaseador"));
const ResenasPaseador = perezoso(nombrada(paseador, "ResenasPaseador"));

/* ── El árbol ───────────────────────────────────────────────────── */

const rootRoute = createRootRoute({
  component: RootLayout,
});

const ruta = (path: string, component: FunctionComponent) =>
  createRoute({ getParentRoute: () => rootRoute, path, component });

const homeRoute = ruta("/", HomePage);
const aboutRoute = ruta("/about", AboutPage);
const registerRoute = ruta("/registro", RegisterPage);
const forgotPasswordRoute = ruta("/recuperar-contrasena", ForgotPasswordPage);
const updatePasswordRoute = ruta("/actualizar-contrasena", UpdatePasswordPage);
const profileRoute = ruta("/perfil", ProfilePage);
const dashboardRoute = ruta("/dashboard", dashboardPage);
const mascotasRoute = ruta("/mascotas", MascotasPage);
const paseadoresRoute = ruta("/paseadores", PaseadoresPage);

/* Pantallas del Seguimiento 1: apuntan directo al componente, sin
   archivo envoltorio en src/page porque el envoltorio no agregaría
   nada. */
const paseosRoute = ruta("/paseos", Paseos);
const paseoEnVivoRoute = ruta("/paseo-en-vivo", PaseoEnVivo);
const mascotasPerdidasRoute = ruta("/mascotas-perdidas", MascotasPerdidas);
const directorioRoute = ruta("/directorio", Directorio);
const pagosRoute = ruta("/pagos", Pagos);
const resenasRoute = ruta("/resenas", Resenas);
const carnetRoute = ruta("/carnet", CarnetDigital);

/* Ruta de servicio: la usa el CLI de boneyard para fotografiar las
   maquetas y generar los huesos de los esqueletos. Es pública a
   propósito —el rastreador no puede pasar el login— y no muestra
   ningún dato: solo cajas de relleno. */
const esqueletosRoute = ruta("/esqueletos", PaginaCaptura);

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
const adminVerificacionesRoute = ruta(`${RUTA_ADMIN}/verificaciones`, VerificacionesAdmin);
const adminUsuariosRoute = ruta(`${RUTA_ADMIN}/usuarios`, UsuariosAdmin);
const adminZonasRoute = ruta(`${RUTA_ADMIN}/zonas`, ZonasAdminPage);
const adminPaseosRoute = ruta(`${RUTA_ADMIN}/paseos`, PaseosAdmin);

rootRoute.addChildren([
  carnetRoute,
  esqueletosRoute,
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

const router = createRouter({
  routeTree: rootRoute,
});

export default router;
