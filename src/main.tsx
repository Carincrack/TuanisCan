import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import router from "../routes"; // aquí importas lo que defines en routes.tsx
import "./index.css";
/* Sin esta hoja los avisos se pintan sin estilo ninguno. Va en la
   entrada y no junto al avisador porque es CSS: cargarla desde un
   componente la ataría a que ese componente esté montado. */
import "goey-toast/styles.css";
/* El registro de huesos. Se importa UNA vez en toda la aplicación:
   después, cada `<Skeleton name="…">` encuentra los suyos solo, sin
   importar nada más. Lo genera `npm run bones` a partir de las
   maquetas de `src/esqueletos`. */
import "./bones/registry";
import { AuthProvider } from "./context/AuthContext";

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
