import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Bell, LogOut, Menu, Search, X } from "lucide-react";
import {
  MARCA,
  navPorRol,
  perfilPorRol,
  tituloDeRuta,
  type NavItem,
  type Rol,
} from "../lib/nav";
import { AsideDeRol } from "./aside";
import { input } from "./ui";

/* ─────────────────────────────────────────────────────────────
   Estructura de tres columnas:
     · izquierda  navegación (oscura, fija)
     · centro     contenido
     · derecha    contexto del rol (se oculta bajo 1280px)
   En móvil la izquierda pasa a un panel deslizable y la derecha
   baja al final del contenido.
   ───────────────────────────────────────────────────────────── */

const NavLink = ({
  item,
  orden,
  onNavigate,
}: {
  item: NavItem;
  orden: number;
  onNavigate?: () => void;
}) => {
  const { pathname } = useLocation();
  const activo = pathname === item.to;
  const { Icon } = item;

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={activo ? "page" : undefined}
      style={{ animationDelay: `${40 + orden * 32}ms` }}
      className={`anim-nav-in group relative flex items-center gap-3 py-2.5 pr-4 pl-5 text-[13.5px] transition-colors duration-200 ${
        activo
          ? "bg-rail-hover font-semibold text-white"
          : "text-rail-text hover:bg-rail-hover hover:text-white"
      }`}
    >
      {/* Marca de posición: crece desde el centro al activarse. */}
      <span
        aria-hidden
        className={`absolute top-0 bottom-0 left-0 w-[3px] bg-accent transition-transform duration-300 ease-out ${
          activo ? "scale-y-100" : "scale-y-0 group-hover:scale-y-50"
        }`}
      />
      <Icon
        size={17}
        strokeWidth={1.9}
        className={`flex-shrink-0 transition-[transform,color] duration-300 ease-out ${
          activo
            ? "scale-110 text-accent"
            : "text-rail-mute group-hover:scale-110 group-hover:text-accent"
        }`}
      />
      {/* El texto se corre un pelo al pasar el cursor; el icono ya creció. */}
      <span className="truncate transition-transform duration-300 ease-out group-hover:translate-x-0.5">
        {item.label}
      </span>
      {item.badge && (
        <span
          className={`nums ml-auto px-1.5 py-0.5 text-[11px] font-semibold ${
            activo ? "bg-accent text-white" : "bg-rail-mute/25 text-rail-text"
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
};

const Marca = () => (
  <div className="anim-fade flex items-center gap-3 px-5 py-5">
    <img
      src={MARCA.logoSimbolo}
      alt=""
      aria-hidden
      className="h-8 w-8 flex-shrink-0 object-contain"
    />
    <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">
      {MARCA.nombre}
      <span className="text-accent">{MARCA.acento}</span>
    </span>
  </div>
);

const Navegacion = ({ rol, onNavigate }: { rol: Rol; onNavigate?: () => void }) => {
  let orden = 0;

  return (
    <nav className="flex flex-1 flex-col overflow-y-auto pb-4">
      {navPorRol[rol].map((grupo) => (
        <div key={grupo.titulo} className="mb-1">
          <p
            style={{ animationDelay: `${40 + orden * 32}ms` }}
            className="anim-nav-in px-5 pt-5 pb-2 text-[10px] font-semibold tracking-[0.14em] text-rail-mute uppercase"
          >
            {grupo.titulo}
          </p>
          {grupo.items.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              orden={orden++}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
};

const PiePerfil = ({ rol, onLogout }: { rol: Rol; onLogout?: () => void }) => {
  const perfil = perfilPorRol[rol];

  return (
    <div className="bg-rail-hover">
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-accent text-[12px] font-semibold text-white">
          {perfil.nombre
            .split(" ")
            .slice(0, 2)
            .map((p) => p[0])
            .join("")}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium text-white">
            {perfil.nombre}
          </span>
          <span className="block truncate text-[11.5px] text-rail-mute">
            {perfil.detalle}
          </span>
        </span>
      </div>

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="group flex w-full items-center gap-3 px-5 py-3 text-[13px] text-rail-text transition-colors duration-200 hover:bg-[#2d6a86] hover:text-white"
        >
          <LogOut
            size={16}
            strokeWidth={1.9}
            className="transition-transform duration-300 ease-out group-hover:translate-x-0.5"
          />
          Cerrar sesión
        </button>
      )}
    </div>
  );
};

interface AppShellProps {
  rol: Rol;
  onLogout?: () => void;
  children: ReactNode;
}

const AppShell = ({ rol, onLogout, children }: AppShellProps) => {
  const { pathname } = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Cerrar el panel al navegar; si no, queda tapando la pantalla nueva.
  useEffect(() => setMenuAbierto(false), [pathname]);

  return (
    <div className="plano flex h-dvh w-full overflow-hidden bg-canvas">
      {/* ── Columna izquierda ── */}
      <aside className="hidden w-[248px] flex-shrink-0 flex-col bg-rail lg:flex">
        <Marca />
        <Navegacion rol={rol} />
        <PiePerfil rol={rol} onLogout={onLogout} />
      </aside>

      {/* Panel deslizable para móvil y tablet */}
      {menuAbierto && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="anim-fade absolute inset-0 bg-[#0b2331]/70"
            onClick={() => setMenuAbierto(false)}
          />
          <div className="anim-slide-left relative flex w-[272px] max-w-[82%] flex-col bg-rail">
            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
              className="absolute top-4 right-3 p-2 text-rail-text transition-colors duration-200 hover:bg-rail-hover hover:text-white"
            >
              <X size={18} />
            </button>
            <Marca />
            <Navegacion rol={rol} onNavigate={() => setMenuAbierto(false)} />
            <PiePerfil rol={rol} onLogout={onLogout} />
          </div>
        </div>
      )}

      {/* ── Barra superior + centro + derecha ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="anim-rise flex h-14 flex-shrink-0 items-center gap-2 bg-surface px-3 sm:gap-3 sm:px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            className="p-2 text-ink-soft transition-colors duration-200 hover:bg-sunken hover:text-ink lg:hidden"
          >
            <Menu size={19} />
          </button>

          <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {tituloDeRuta(rol, pathname)}
          </h1>

          <div className="relative ml-auto hidden w-[260px] md:block">
            <label htmlFor="busqueda-global" className="sr-only">
              Buscar en la plataforma
            </label>
            <input
              id="busqueda-global"
              type="search"
              placeholder="Buscar"
              className={`${input} pl-9`}
            />
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-mute"
            />
          </div>

          <button
            type="button"
            aria-label="Notificaciones"
            className="relative ml-auto p-2 text-ink-soft transition-colors duration-200 hover:bg-sunken hover:text-ink md:ml-0"
          >
            <Bell size={18} strokeWidth={1.9} />
            <span aria-hidden className="absolute top-2 right-2 h-1.5 w-1.5 bg-accent" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 overflow-y-auto">
          <main className="min-w-0 flex-1 p-3 lg:p-4">
            {/* La clave remonta el contenido en cada ruta: así la entrada
                se reproduce al navegar, no solo al cargar la página. */}
            <div key={pathname} className="anim-rise mx-auto w-full max-w-[900px]">
              {children}
            </div>
          </main>

          <aside className="anim-rise d-3 hidden w-[312px] flex-shrink-0 flex-col gap-3 p-4 pl-0 xl:flex">
            <AsideDeRol rol={rol} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
