import React, {
  createContext,
  useContext,
  useState,
} from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Menu,
  X,
  LayoutDashboard,
  PawPrint,
  Footprints,
  MapPin,
  Siren,
  Store,
  CreditCard,
  Star,
  ShieldCheck,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";

// ─────────────────────────────────────────────────────────
// Utilidad cn (idéntica a la que usa el ejemplo original)
// ─────────────────────────────────────────────────────────
const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

// ─────────────────────────────────────────────────────────
// Contexto del sidebar — mismo patrón que la referencia
// (open/setOpen + animate), solo que vive en este archivo
// ─────────────────────────────────────────────────────────
interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────
// Desktop: se expande al hacer hover (300px ↔ 60px), igual
// que la referencia. Fondo blanco en vez de neutral-oscuro.
// ─────────────────────────────────────────────────────────
const DesktopSidebar = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-white border-r border-slate-100 w-[300px] flex-shrink-0",
        className
      )}
      animate={{ width: animate ? (open ? "300px" : "60px") : "300px" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────
// Mobile: drawer full-screen con hamburguesa, igual que la
// referencia (posición, animación x, botón de cierre).
// ─────────────────────────────────────────────────────────
const MobileSidebar = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const { open, setOpen } = useSidebar();
  return (
    <div className="h-14 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-white border-b border-slate-100 w-full">
      <div className="flex justify-end z-20 w-full">
        <Menu
          className="text-slate-700 cursor-pointer"
          onClick={() => setOpen(!open)}
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed h-full w-full inset-0 bg-white p-10 z-[100] flex flex-col justify-between",
              className
            )}
          >
            <div
              className="absolute right-10 top-10 z-50 text-slate-700 cursor-pointer"
              onClick={() => setOpen(!open)}
            >
              <X />
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SidebarBody = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <>
    <DesktopSidebar className={className}>{children}</DesktopSidebar>
    <MobileSidebar className={className}>{children}</MobileSidebar>
  </>
);

// ─────────────────────────────────────────────────────────
// Link del sidebar — mismo patrón icon + motion.span que
// se desliza y aparece/desaparece con "open".
// ─────────────────────────────────────────────────────────
const SidebarLink = ({
  link,
  className,
  onClick,
}: {
  link: { label: string; to: string; icon: React.ReactNode };
  className?: string;
  onClick?: () => void;
}) => {
  const { open, animate } = useSidebar();
  const location = useLocation();
  const isActive = location.pathname === link.to;

  return (
    <Link
      to={link.to}
      onClick={onClick}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 rounded-lg px-2 -mx-2 transition-colors",
        isActive ? "text-[#0B7A82] bg-[#E6F7F8]" : "text-slate-600 hover:bg-slate-50",
        className
      )}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

// ─────────────────────────────────────────────────────────
// Íconos + colores por link (se calculan una vez, según el
// estado activo, para que resalten en teal al pasar/estar activos)
// ─────────────────────────────────────────────────────────
const iconClass = (active: boolean) =>
  cn(
    "h-5 w-5 flex-shrink-0 transition-colors",
    active ? "text-[#0EA5AE]" : "text-slate-500 group-hover/sidebar:text-[#0EA5AE]"
  );

// ─────────────────────────────────────────────────────────
// NavBar — versión de PetFinderCR del SidebarDemo original.
// Props idénticas a lo que ya tenías: onLogout + children.
// ─────────────────────────────────────────────────────────
interface NavBarProps {
  onLogout?: () => void;
  children: React.ReactNode;
}

const routeTitles: Record<string, string> = {
  "/": "Panel general",
  "/mascotas": "Mis mascotas",
  "/paseadores": "Paseadores",
  "/paseo-en-vivo": "Paseo en vivo",
  "/mascotas-perdidas": "Mascotas perdidas",
  "/directorio": "Directorio de negocios",
  "/pagos": "Pagos y comisiones",
  "/resenas": "Reseñas y calificaciones",
  "/administracion": "Panel administrativo",
  "/settings": "Configuración",
};

const NavBar: React.FC<NavBarProps> = ({ onLogout, children }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || "Panel general";

  // Módulos reales del MVP: perfiles/paseadores, geolocalización,
  // mascotas perdidas, directorio, pagos, reseñas y panel admin.
  const links = [
    { to: "/", label: "Panel general", Icon: LayoutDashboard },
    { to: "/mascotas", label: "Mis mascotas", Icon: PawPrint },
    { to: "/paseadores", label: "Paseadores", Icon: Footprints },
    { to: "/paseo-en-vivo", label: "Paseo en vivo", Icon: MapPin },
    { to: "/mascotas-perdidas", label: "Mascotas perdidas", Icon: Siren },
    { to: "/directorio", label: "Directorio", Icon: Store },
    { to: "/pagos", label: "Pagos", Icon: CreditCard },
    { to: "/resenas", label: "Reseñas", Icon: Star },
    { to: "/administracion", label: "Administración", Icon: ShieldCheck },
  ];

  return (
    <div className={cn("flex flex-col md:flex-row bg-slate-50 w-full h-screen overflow-hidden")}>
      <SidebarProvider open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Logo: ícono recortado colapsado, wordmark completo expandido */}
            <Link to="/" className="flex space-x-2 items-center text-sm py-1 relative z-20">
              <img
                src="/logo.png"
                alt="PetFinderCR"
                className="h-15 w-15 flex-shrink-0 object-contain"
              />
              <motion.span
                animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
                className="font-semibold text-[#123B40] whitespace-pre"
              >
                PetFinder<span className="text-[#0EA5AE]">CR</span>
              </motion.span>
            </Link>

            <div className="mt-8 flex flex-col gap-2">
              {links.map(({ to, label, Icon }) => (
                <SidebarLink
                  key={to}
                  link={{
                    to,
                    label,
                    icon: <Icon className={iconClass(location.pathname === to)} />,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <SidebarLink
              link={{
                to: "/settings",
                label: "Configuración",
                icon: <Settings className={iconClass(location.pathname === "/settings")} />,
              }}
            />
            {onLogout && (
              <SidebarLink
                onClick={onLogout}
                link={{
                  to: "#",
                  label: "Cerrar sesión",
                  icon: <LogOut className="h-5 w-5 flex-shrink-0 text-red-400" />,
                }}
                className="!text-red-500 hover:!bg-red-50"
              />
            )}
          </div>
        </SidebarBody>
      </SidebarProvider>

      {/* Panel de contenido: mismo tratamiento visual (esquina
          redondeada + borde suave) del ejemplo, con el contenido
          real de la ruta en vez de bloques de relleno. */}
      <div className="flex flex-1">
        <div className="p-2 md:p-6 rounded-tl-2xl border border-slate-200 bg-white flex flex-col gap-4 flex-1 w-full h-full overflow-auto">
          <div className="flex items-center justify-between px-2 pt-2">
            <h1 className="text-xl font-semibold text-slate-900">{currentTitle}</h1>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-slate-500" />
              </button>
              <div className="w-8 h-8 rounded-full bg-[#0EA5AE]/15 flex items-center justify-center text-[#0B7A82] text-sm font-semibold">
                U
              </div>
            </div>
          </div>
          <div className="flex-1 px-2 pb-2">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;