import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import RootLayout from "./src/components/RootLayout";
import HomePage from "./src/page/HomePage";
import AboutPage from "./src/page/AboutPage";
import dashboardPage from "./src/page/dashboardPage";

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
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: dashboardPage,
});


// 3. Añadir al root
rootRoute.addChildren([homeRoute, aboutRoute, dashboardRoute]);

// 4. Crear router
const router = createRouter({
  routeTree: rootRoute,
});

export default router;
