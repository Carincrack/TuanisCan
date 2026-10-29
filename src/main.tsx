/* Primero que todo: pide el trozo de la pantalla que se va a ver
   (ver `precarga.ts`). Va arriba de React a propósito: los módulos
   corren en el orden en que se importan. */
import { puertaLista } from "./precarga";
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
import { I18nProvider } from "./context/I18nProvider";
import { resolveInitialLanguage } from "./i18n/languages";
import { cargarIdioma } from "./i18n/translations";

const root = ReactDOM.createRoot(document.getElementById("root")!);

/* Quien entra con el inglés ya elegido espera a que llegue su
   diccionario antes del primer pintado (la cortina de `index.html`
   sigue arriba mientras tanto): así nunca ve la pantalla en español
   y después el salto al inglés. En español no hay nada que esperar.
   También se espera a la portada, si es lo que se va a ver: el porqué
   está en `precarga.ts`. */
void Promise.all([cargarIdioma(resolveInitialLanguage()), puertaLista]).finally(() =>
  root.render(
    <React.StrictMode>
      <I18nProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </I18nProvider>
    </React.StrictMode>
  ),
);
