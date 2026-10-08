import {
  BadgeCheck,
  Banknote,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Footprints,
  IdCard,
  Inbox,
  LayoutDashboard,
  MapPin,
  PawPrint,
  Star,
  Store,
  Siren,
  UserCircle,
  Users,
  Wallet,
} from "./iconos";
import type { ElementType } from "react";

/* ─────────────────────────────────────────────────────────────
   Tres roles, tres aplicaciones distintas sobre el mismo shell.

     dueno     · contrata paseos para sus mascotas
     paseador  · recibe solicitudes y cobra por paseo
     admin     · nosotros, dueños de la plataforma

     El rol llega desde Supabase Auth y decide qué navegación y pantallas
     se montan. Todos los roles usan el mismo login.
   ───────────────────────────────────────────────────────────── */

export const MARCA = {
  /* Se escribe junto: TuanisCan. Va partido en dos para pintar la
     segunda mitad en el color de acento, sin espacio entre ambas. */
  nombre: "Tuanis",
  acento: "Can",
  completo: "TuanisCan",
  /* Tres versiones del logo, cada una para su fondo:

       logoLogin    lockup con contorno blanco → las dos pantallas de
                    login, donde va grande sobre el degradado azul.
       logoSistema  lockup sin contorno → dentro de la aplicación,
                    solo sobre fondos oscuros (el resplandor turquesa
                    se pierde sobre blanco).
       logoSimbolo  solo la huella, fondo transparente → funciona
                    igual sobre claro y oscuro; es el que se repite
                    en barras, cabeceras y el carnet. */
  logoLogin: "/logo-login.png",
  logoSistema: "/logo-sistema.png",
  logoSimbolo: "/logo-simbolo.png",
};

export type Rol = "dueno" | "paseador" | "negocio" | "admin";

export const RUTA_ADMIN = "/acceso-interno";

export interface NavItem {
  to: string;
  label: string;
  Icon: ElementType;
  /** Contador que se pinta a la derecha del ítem. */
  badge?: number;
  /** Ruta que pertenece al rol pero no se dibuja en el menú.

      Existe por `/perfil`: se llega tocando la tarjeta del usuario al
      pie del riel, así que como renglón del menú estaba repetida. Pero
      NO se puede borrar de esta lista: `RootLayout` decide qué rol
      puede entrar a cada ruta mirando justamente estas listas, y sin
      la entrada `/perfil` dejaría de pertenecer a nadie —al admin lo
      echaba de su propio perfil—. Oculta, sigue contando para los
      permisos y para el título de la página. */
  oculto?: boolean;
}

export interface NavGroup {
  titulo: string;
  items: NavItem[];
}

/* Los `label` y `titulo` de acá abajo NO son el texto a mostrar: son
   claves de traducción ("nav.item.panelGeneral", "nav.group.operacion")
   que resuelve `t()` en el idioma activo. Este módulo es datos puros
   —no un componente— así que no puede llamar al hook de traducción;
   quien consume estas listas (`rielSuave.tsx`, `AppShell.tsx`) es
   quien traduce al momento de pintarlas. */
export const navPorRol: Record<Rol, NavGroup[]> = {
  dueno: [
    {
      titulo: "nav.group.operacion",
      items: [
        { to: "/", label: "nav.item.panelGeneral", Icon: LayoutDashboard },
        { to: "/paseos", label: "nav.item.paseos", Icon: CalendarDays },
        { to: "/paseo-en-vivo", label: "nav.item.paseoEnVivo", Icon: MapPin },
      ],
    },
    {
      titulo: "nav.group.misMascotas",
      items: [
        { to: "/mascotas", label: "nav.item.misMascotas", Icon: PawPrint },
        { to: "/carnet", label: "nav.item.carnetDigital", Icon: IdCard },
      ],
    },
    {
      titulo: "nav.group.miCuenta",
      items: [
        { to: "/pagos", label: "nav.item.pagos", Icon: CreditCard },
        { to: "/resenas", label: "nav.item.resenas", Icon: Star },
        { to: "/perfil", label: "nav.item.misDatos", Icon: UserCircle, oculto: true },
      ],
    },
    {
      titulo: "nav.group.comunidad",
      items: [
        { to: "/paseadores", label: "nav.item.buscarPaseadores", Icon: Footprints },
        { to: "/mascotas-perdidas", label: "nav.item.mascotasPerdidas", Icon: Siren },
        { to: "/directorio", label: "nav.item.directorio", Icon: Store },
      ],
    },
  ],

  paseador: [
    {
      titulo: "nav.group.operacion",
      items: [
        { to: "/p/panel", label: "nav.item.panel", Icon: LayoutDashboard },
        { to: "/p/solicitudes", label: "nav.item.solicitudes", Icon: Inbox, badge: 3 },
        { to: "/p/agenda", label: "nav.item.agenda", Icon: CalendarCheck },
        { to: "/p/paseo-activo", label: "nav.item.paseoActivo", Icon: MapPin },
      ],
    },
    {
      titulo: "nav.group.miCuenta",
      items: [
        { to: "/p/ganancias", label: "nav.item.ganancias", Icon: Wallet },
        { to: "/p/tarifas", label: "nav.item.tarifas", Icon: Banknote },
        { to: "/perfil", label: "nav.item.miPerfil", Icon: UserCircle, oculto: true },
        { to: "/p/perfil", label: "nav.item.perfilPublico", Icon: UserCircle },
        { to: "/p/resenas", label: "nav.item.resenasRecibidas", Icon: Star },
      ],
    },
  ],

  negocio: [
    {
      titulo: "nav.group.miNegocio",
      items: [
        { to: "/directorio", label: "nav.item.directorio", Icon: Store },
        { to: "/perfil", label: "nav.item.miPerfil", Icon: UserCircle, oculto: true },
      ],
    },
  ],

  admin: [
    {
      titulo: "nav.group.plataforma",
      items: [
        { to: RUTA_ADMIN, label: "nav.item.panelGeneral", Icon: BarChart3 },
        { to: `${RUTA_ADMIN}/finanzas`, label: "nav.item.finanzas", Icon: Wallet },
        { to: "/perfil", label: "nav.item.misDatos", Icon: UserCircle, oculto: true },
      ],
    },
    {
      titulo: "nav.group.gestion",
      items: [
        { to: `${RUTA_ADMIN}/paseadores`, label: "nav.item.paseadores", Icon: Footprints },
        {
          to: `${RUTA_ADMIN}/verificaciones`,
          label: "nav.item.verificaciones",
          Icon: BadgeCheck,
        },
        { to: `${RUTA_ADMIN}/usuarios`, label: "nav.item.usuarios", Icon: Users },
        { to: `${RUTA_ADMIN}/zonas`, label: "nav.item.zonas", Icon: MapPin },
        { to: `${RUTA_ADMIN}/paseos`, label: "nav.item.paseos", Icon: CalendarDays },
        { to: "/directorio", label: "nav.item.directorio", Icon: Store },
      ],
    },
  ],
};

export const perfilPorRol: Record<Rol, { nombre: string; detalle: string }> = {
  dueno: { nombre: "Ana Corrales", detalle: "Dueña · San José" },
  paseador: { nombre: "María Fernández", detalle: "Paseadora · Curridabat" },
  negocio: { nombre: "Mi negocio", detalle: "Cuenta de negocio" },
  admin: { nombre: "Administración", detalle: "TuanisCan" },
};

/** Clave de traducción del título de la barra superior. Cae al primer
    ítem del rol si no hay match; `tituloDeRuta` devuelve la CLAVE, no
    el texto: quien la pinta es quien la traduce con `t()`. */
export const tituloDeRuta = (rol: Rol, pathname: string) => {
  const item = navPorRol[rol]
    .flatMap((grupo) => grupo.items)
    .find((navItem) => navItem.to === pathname);

  return item?.label ?? null;
};

/** Ruta de arranque de cada rol. */
export const inicioDeRol: Record<Rol, string> = {
  dueno: "/",
  paseador: "/p/panel",
  negocio: "/directorio",
  admin: RUTA_ADMIN,
};
