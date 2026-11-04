import { lazy, type ComponentType } from "react";

/* ─────────────────────────────────────────────────────────────
   Tres puertas, tres trozos.

   La portada, el login y el armazón de la aplicación iban en el
   paquete principal, juntos: quien visitaba la portada se bajaba el
   sistema interno entero, y quien entraba al sistema se bajaba GSAP y
   Lenis de la portada. Ahora cada uno es un trozo aparte y se pide
   solo cuando hace falta. `RootLayout` monta los componentes de acá.

   Para que eso no agregue espera, el trozo probable se pide YA: con
   una sesión guardada, el armazón; sin ella, la portada (y el login,
   un poco después). Este archivo es lo PRIMERO que importa `main.tsx`,
   así que el pedido sale apenas corre el JS y no cuando terminó de
   arrancar todo lo demás.
   ───────────────────────────────────────────────────────────── */

type Trozo<C> = { default: C };

/* ── Un trozo que ya llegó se entrega en el acto ──
   `lazy` se suspende la primera vez que se pinta, AUNQUE el trozo ya
   haya llegado: no lo sabe hasta que la promesa le contesta, y eso
   siempre es después. Al suspenderse deja la pantalla vacía, y React
   retiene lo que sigue hasta 300 ms para no parpadear. Medido: la
   portada estaba lista a los 400 ms y aparecía a los 700.

   Por eso cada puerta recuerda su módulo cuando llega, y si `lazy` lo
   pide después, se lo entrega con un `then` que contesta en el momento
   (React acepta cualquier objeto con `then`, no solo promesas). Si
   todavía no llegó, se pide como siempre.

   El `any` es la misma restricción que pone `lazy`: acepta componentes
   con cualquier prop, y cada puerta conserva las suyas en `C`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const puerta = <C extends ComponentType<any>>(importar: () => Promise<Trozo<C>>) => {
  let llegado: Trozo<C> | undefined;

  const cargar = () =>
    importar().then((modulo) => {
      llegado = modulo;
      return modulo;
    });

  const Componente = lazy(() => {
    if (!llegado) return cargar();
    const listo = llegado;
    return { then: (entregar: (modulo: Trozo<C>) => void) => entregar(listo) } as Promise<Trozo<C>>;
  });

  return { cargar, Componente };
};

const portada = puerta(() => import("./landing"));
const login = puerta(() => import("./page/LoginPage"));
const armazon = puerta(() => import("./components/AppShell"));

export const Landing = portada.Componente;
export const LoginPage = login.Componente;
export const AppShell = armazon.Componente;

/* Supabase guarda la sesión como `sb-<proyecto>-auth-token`. Solo se
   mira si la clave existe: si la sesión venció, el armazón se habrá
   bajado de más, nada peor. */
const haySesionGuardada = () => {
  try {
    return Object.keys(localStorage).some((clave) => clave.startsWith("sb-") && clave.endsWith("-auth-token"));
  } catch {
    return false;
  }
};

/* Sin sesión, `main.tsx` espera a la portada antes del primer pintado:
   así ya llegó cuando `lazy` la pide y sale de una. Con sesión no se
   espera nada: el armazón llega mientras se consulta la cuenta, y
   esperarlo antes de pintar atrasaría esa consulta.

   Si un pedido falla acá no pasa nada: `lazy` lo vuelve a pedir
   cuando de verdad haga falta. */
const nada = () => undefined;
let primera: Promise<unknown> = Promise.resolve();

if (typeof window !== "undefined") {
  if (haySesionGuardada()) {
    void armazon.cargar().catch(nada);
  } else {
    primera = portada.cargar().catch(nada);
    window.setTimeout(() => void login.cargar().catch(nada), 2500);
  }
}

/** Se cumple cuando la primera pantalla ya se puede pintar sin esperar. */
export const puertaLista = primera;
