import {
  BadgeCheck,
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
} from "lucide-react";
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

export type Rol = "dueno" | "paseador" | "admin";

export const RUTA_ADMIN = "/acceso-interno";

export interface NavItem {
  to: string;
  label: string;
  Icon: ElementType;
  /** Contador que se pinta a la derecha del ítem. */
  badge?: number;
}

export interface NavGroup {
  titulo: string;
  items: NavItem[];
}

export const navPorRol: Record<Rol, NavGroup[]> = {
  dueno: [
    {
      titulo: "Operación",
      items: [
        { to: "/", label: "Panel general", Icon: LayoutDashboard },
        { to: "/paseos", label: "Paseos", Icon: CalendarDays },
        { to: "/paseo-en-vivo", label: "Paseo en vivo", Icon: MapPin },
      ],
    },
    {
      titulo: "Mis mascotas",
      items: [
        { to: "/mascotas", label: "Mis mascotas", Icon: PawPrint },
        { to: "/carnet", label: "Carnet digital", Icon: IdCard },
      ],
    },
    {
      titulo: "Mi cuenta",
      items: [
        { to: "/pagos", label: "Pagos", Icon: CreditCard },
        { to: "/resenas", label: "Reseñas", Icon: Star },
      ],
    },
    {
      titulo: "Comunidad",
      items: [
        { to: "/paseadores", label: "Buscar paseadores", Icon: Footprints },
        { to: "/mascotas-perdidas", label: "Mascotas perdidas", Icon: Siren },
        { to: "/directorio", label: "Directorio", Icon: Store },
      ],
    },
  ],

  paseador: [
    {
      titulo: "Operación",
      items: [
        { to: "/p/panel", label: "Panel", Icon: LayoutDashboard },
        { to: "/p/solicitudes", label: "Solicitudes", Icon: Inbox, badge: 3 },
        { to: "/p/agenda", label: "Agenda", Icon: CalendarCheck },
        { to: "/p/paseo-activo", label: "Paseo activo", Icon: MapPin },
      ],
    },
    {
      titulo: "Mi cuenta",
      items: [
        { to: "/p/ganancias", label: "Ganancias", Icon: Wallet },
        { to: "/p/perfil", label: "Mi perfil", Icon: UserCircle },
        { to: "/p/resenas", label: "Reseñas recibidas", Icon: Star },
      ],
    },
  ],

  admin: [
    {
      titulo: "Plataforma",
      items: [
        { to: RUTA_ADMIN, label: "Panel general", Icon: BarChart3 },
        { to: `${RUTA_ADMIN}/finanzas`, label: "Finanzas", Icon: Wallet },
      ],
    },
    {
      titulo: "Gestión",
      items: [
        { to: `${RUTA_ADMIN}/paseadores`, label: "Paseadores", Icon: Footprints },
        {
          to: `${RUTA_ADMIN}/verificaciones`,
          label: "Verificaciones",
          Icon: BadgeCheck,
          badge: 4,
        },
        { to: `${RUTA_ADMIN}/usuarios`, label: "Usuarios", Icon: Users },
        { to: `${RUTA_ADMIN}/paseos`, label: "Paseos", Icon: CalendarDays },
      ],
    },
  ],
};

export const perfilPorRol: Record<Rol, { nombre: string; detalle: string }> = {
  dueno: { nombre: "Ana Corrales", detalle: "Dueña · San José" },
  paseador: { nombre: "María Fernández", detalle: "Paseadora · Curridabat" },
  admin: { nombre: "Administración", detalle: "TuanisCan" },
};

/** Título de la barra superior. Cae al primer ítem del rol si no hay match. */
export const tituloDeRuta = (rol: Rol, pathname: string) => {
  for (const grupo of navPorRol[rol]) {
    const item = grupo.items.find((i) => i.to === pathname);
    if (item) return item.label;
  }
  return navPorRol[rol][0].items[0].label;
};

/** Ruta de arranque de cada rol. */
export const inicioDeRol: Record<Rol, string> = {
  dueno: "/",
  paseador: "/p/panel",
  admin: RUTA_ADMIN,
};
