import { Skeleton } from "boneyard-js/react";
import type { ReactNode } from "react";
import {
  MaquetaCarnet,
  MaquetaDirectorio,
  MaquetaMascotas,
  MaquetaPanel,
  MaquetaPaseadores,
  MaquetaPaseos,
  MaquetaPerdidas,
  MaquetaPerfil,
  MaquetaSolicitudes,
  MaquetaTabla,
  MaquetaVerificaciones,
} from "./fixtures";

/* ─────────────────────────────────────────────────────────────
   LA PÁGINA DE CAPTURA

   El CLI de boneyard descubre pantallas SIGUIENDO ENLACES desde la
   dirección que se le da. Todo este sistema vive detrás del login de
   Supabase, así que saliendo de "/" solo llegaría a la portada y al
   formulario de acceso: ni una sola de las pantallas que necesitan
   esqueleto.

   De ahí esta ruta. Es pública, no monta el armazón de la aplicación
   y reúne todos los `<Skeleton>` en un sitio al que la cámara sí
   puede entrar. En modo captura cada uno pinta su maqueta marcada con
   `data-boneyard="<nombre>"`, y el CLI guarda un archivo de huesos por
   nombre. Después, en la aplicación de verdad, cada `<Skeleton>` con
   ese mismo nombre los encuentra solo.

   ── Por qué se repite la geometría del armazón ──

   Los huesos son rectángulos medidos en píxeles. Si la maqueta se
   fotografía a 1280 de ancho y en la aplicación el mismo bloque mide
   834 —porque tiene el riel a la izquierda, la columna de contexto a
   la derecha y un tope de 900—, el esqueleto sale desalineado.

   Así que acá se reconstruye la caja del contenido con las medidas
   exactas de `AppShell`:

     · el relleno exterior de 10 px
     · el riel de 72 px a partir de `md`, más 10 de separación
     · el relleno del contenido: 12 px, 16 a partir de `lg`
     · la columna de contexto de 312 px a partir de `xl`
     · el tope de 900 px del contenido

   El riel y la columna van como huecos vacíos: lo único que hace
   falta de ellos es que ocupen su sitio.

   `select: "viewport"` en `boneyard.config.json` es la otra mitad de
   lo mismo: le dice al runtime que elija el juego de huesos por el
   ancho de la VENTANA y no por el del contenedor, que es lo correcto
   cuando el contenedor es más angosto que la ventana.
   ───────────────────────────────────────────────────────────── */

const Marco = ({ children }: { children: ReactNode }) => (
  <div className="suave flex w-full gap-2.5 bg-suelo p-2.5">
    <div className="hidden w-[72px] shrink-0 md:block" />

    <div className="lienzo flex min-w-0 flex-1 flex-col rounded-[26px] bg-canvas">
      <div className="flex flex-1">
        <main className="min-w-0 flex-1 px-3 pt-2 pb-4 lg:px-4">
          <div className="mx-auto w-full max-w-[900px]">{children}</div>
        </main>

        <div className="hidden w-[312px] shrink-0 px-4 pt-2 pb-4 pl-0 xl:block" />
      </div>
    </div>
  </div>
);

/* Cada entrada es un nombre y su maqueta. El nombre es el contrato
   con la aplicación: `<Skeleton name="paseadores-rejilla">` en la
   pantalla real busca los huesos que se generen acá con ese nombre. */
const CAPTURAS = [
  { nombre: "paseadores-rejilla", Maqueta: MaquetaPaseadores },
  { nombre: "perdidas-rejilla", Maqueta: MaquetaPerdidas },
  { nombre: "mascotas-rejilla", Maqueta: MaquetaMascotas },
  { nombre: "directorio-rejilla", Maqueta: MaquetaDirectorio },
  { nombre: "carnet-tarjeta", Maqueta: MaquetaCarnet },
  { nombre: "admin-verificaciones", Maqueta: MaquetaVerificaciones },
  { nombre: "paseador-solicitudes", Maqueta: MaquetaSolicitudes },
  { nombre: "panel-metricas", Maqueta: MaquetaPanel },
  { nombre: "admin-tabla", Maqueta: MaquetaTabla },
  { nombre: "paseos-lista", Maqueta: MaquetaPaseos },
  { nombre: "perfil-cuenta", Maqueta: MaquetaPerfil },
] as const;

const PaginaCaptura = () => (
  <div className="min-h-dvh bg-suelo">
    {CAPTURAS.map(({ nombre, Maqueta }) => (
      <Marco key={nombre}>
        {/* `loading` va en falso: fuera del modo captura esta página
            no tiene por qué mostrar esqueletos, y dentro del modo
            captura el componente ignora la bandera y pinta la maqueta
            igual. */}
        <Skeleton name={nombre} loading={false} fixture={<Maqueta />}>
          <Maqueta />
        </Skeleton>
      </Marco>
    ))}
  </div>
);

export default PaginaCaptura;
