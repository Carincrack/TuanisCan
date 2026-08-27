import { useRef } from "react";

import Cierre from "./secciones/Cierre";
import Hero from "./secciones/Hero";
import MenuMovil from "./secciones/MenuMovil";
import Pasos from "./secciones/Pasos";
import Pie from "./secciones/Pie";
import Servicios from "./secciones/Servicios";
import { useCursorPortada, usePortadaAnimacion } from "./animacion";
import { useMenuMovil } from "./hooks/useMenuMovil";
import { NAVY } from "./tokens";
import type { LandingProps } from "./tipos";

/* ─────────────────────────────────────────────────────────────
   Portada pública. Lo primero que ve alguien sin sesión.

   A sangre: cada sección es una banda que toca los cuatro bordes
   de la pantalla, sin margen ni esquinas redondeadas. La
   referencia de `src/resources` mete su contenido en una tarjeta
   flotante; acá no, porque el wordmark gigante gana cuando cruza
   la pantalla entera y no cuando lo enmarca una caja.

   De la referencia se hereda la composición: el wordmark gigante,
   el perro grande, los garabatos a mano y las píldoras en las
   esquinas. Los colores no — salen del `@theme` de la aplicación:
   azules suaves alrededor del turquesa del logo.

   El degradado azul del login sale de esta misma familia, así que
   entrar a la aplicación no rompe el mundo.

   El movimiento vive entero en `animacion.ts`, colgado de esta
   raíz: las secciones solo se marcan con `data-anim`. El aro que
   sigue al puntero se monta aparte porque no depende del scroll ni
   de la raíz — vive pegado al `body`, encima de todo.

   Este archivo solo apila las bandas y reparte `onEntrar`.
   ───────────────────────────────────────────────────────────── */

const Landing = ({ onEntrar }: LandingProps) => {
  const { abierto, abrir, cerrar, irA } = useMenuMovil();
  const raiz = useRef<HTMLDivElement>(null);

  usePortadaAnimacion(raiz);
  useCursorPortada();

  return (
    <div ref={raiz} className="portada min-h-screen" style={{ background: NAVY }}>
      {abierto && <MenuMovil onEntrar={onEntrar} onCerrar={cerrar} irA={irA} />}

      <Hero onEntrar={onEntrar} onAbrirMenu={abrir} />

      <main>
        <Servicios />
        <Pasos />
        <Cierre onEntrar={onEntrar} />
      </main>

      <Pie />
    </div>
  );
};

export default Landing;
