/* Banco de pruebas del riel. Temporal: no se enlaza desde ninguna
   parte y se borra al terminar de mirarlo. Monta el AppShell con un
   perfil de mentira para poder ver la barra sin pasar por Supabase. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
} from "@tanstack/react-router";

import "./index.css";
import AppShell from "./components/AppShell";
import { AuthContext } from "./context/auth-context";
import { navPorRol, type Rol } from "./lib/nav";
import { PanelAdmin } from "./components/admin";
import EmployeeHome from "./components/home";

const ROL: Rol = (new URLSearchParams(window.location.search).get("rol") as Rol) ?? "dueno";
const RUTA = new URLSearchParams(window.location.search).get("ruta") ?? "/";

const perfil = {
  id_usuario: "demo",
  email: "ana@ejemplo.cr",
  nombre: "Ana Corrales Vargas",
  telefono: "8888-8888",
  foto_perfil: null,
  zona_id: null,
  roles: ["dueno", "paseador"],
  isAdmin: true,
  fecha_registro: "2026-01-01",
  activo: true,
  zona: null,
  paseador: null,
  negocio: null,
  verificacion: { estado: "aprobado", observacion: null },
};

const auth = {
  user: null,
  session: null,
  role: ROL,
  roles: ["dueno", "paseador"],
  isAdmin: true,
  loading: false,
  accessError: null,
  login: async () => {},
  register: async () => true,
  getProfile: async () => perfil,
  updateProfile: async () => {},
  addRole: async () => {},
  setActiveRole: () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  logout: async () => {},
};

const Pantalla = () => {
  if (ROL === "admin") return <PanelAdmin />;
  if (ROL === "dueno") return <EmployeeHome />;
  return (
    <div className="bg-surface px-6 py-5">
      <h2 className="text-[19px] font-semibold text-ink">Contenido de prueba</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Solo está aquí para ver cómo se reparte el ancho.
      </p>
    </div>
  );
};

const root = createRootRoute({
  component: () => (
    <AppShell rol={ROL} onLogout={() => {}}>
      <Pantalla />
    </AppShell>
  ),
});

const rutas = Array.from(
  new Set(
    (Object.keys(navPorRol) as Rol[]).flatMap((rol) =>
      navPorRol[rol].flatMap((grupo) => grupo.items.map((item) => item.to)),
    ),
  ),
);

root.addChildren(
  rutas.map((path) =>
    createRoute({ getParentRoute: () => root, path, component: Pantalla }),
  ),
);

const router = createRouter({
  routeTree: root,
  history: createMemoryHistory({ initialEntries: [RUTA] }),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthContext.Provider value={auth as unknown as never}>
      <RouterProvider router={router as never} />
    </AuthContext.Provider>
  </StrictMode>,
);
