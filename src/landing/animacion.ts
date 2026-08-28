import { useEffect, useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import Lenis from "lenis";

import { RECORRIDO, REPOSO, trazarOnda, trazarOndaBajo } from "./onda";
import { registrarScroll } from "./scroll";

/* ─────────────────────────────────────────────────────────────
   Movimiento de la portada, en un solo lugar.

   Las secciones no saben animar: solo se marcan con `data-anim` y
   `data-par`. Acá se orquesta todo, así que se puede afinar el
   ritmo de la página entera sin abrir un componente.

   Tres reglas que no se rompen:

   1. Toda entrada es `gsap.from()`. El estado final es el que
      pinta el navegador; la animación solo dice de dónde viene. Si
      el script no carga, la portada se ve completa igual.
   2. Con `prefers-reduced-motion` no se crea ni una animación —
      no basta con acortarlas, porque GSAP no escucha la regla CSS
      que ya tiene el sistema. Tampoco arranca el scroll suave.
   3. Entrada y parallax nunca tocan la misma propiedad del mismo
      elemento. Las dos escriben en `y` y la última en correr le
      pisa el valor a la otra: la ficha entra y se queda a medio
      camino. Por eso la entrada va en la `figure` —donde solo
      toca escala y opacidad— y el desplazamiento en la `img` de
      adentro.
   ───────────────────────────────────────────────────────────── */

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

/** Ease de entrada: arranca rápido y frena. Nada entra despacio. */
const SALIDA = "power3.out";
/** Más duro todavía, para las palabras de los titulares. */
const TITULAR = "expo.out";
/** Los trazos dibujados sí aceleran y frenan: imitan una mano. */
const MANO = "power2.inOut";

/* La onda y el parallax se miden contra la banda que los
   contiene. El pie es una banda más —lleva la última onda— pero es
   un `footer`, no un `section`. */
const BANDA = "section, footer";

/* GSAP arranca ANTES del primer pintado y no después.

   `useEffect` corre cuando el navegador ya pintó, así que toda entrada
   hecha con `gsap.from()` muestra un fotograma en su estado final antes
   de saltar al inicial. Con una sola cosa moviéndose casi no se nota;
   con el hero entero encima del pliegue es un parpadeo.

   El `typeof window` es por si algún día esto se renderiza en el
   servidor: ahí no hay pintado que adelantar y React avisa por consola
   de que el efecto de layout no corre. */
const useEfectoVisual = typeof window === "undefined" ? useEffect : useLayoutEffect;

const quieto = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Scroll suave ──────────────────────────────────────────────
   Es lo que separa un scroll atado al notch de la rueda de uno
   que se desliza, y sin él todo lo que va con `scrub` se ve a
   saltos: el parallax y la onda persiguen una posición que salta
   de 100 en 100 píxeles.

   Lenis toma el control del scroll, así que ScrollTrigger tiene
   que enterarse por él y no por el evento nativo, y el `raf` de
   Lenis tiene que correr en el reloj de GSAP. Con dos relojes
   distintos las dos cosas quedan un frame desfasadas.

   `lagSmoothing(0)`: si la pestaña se congela, GSAP normalmente
   se salta el tiempo perdido. Acá eso deja el scroll suave
   desincronizado de la posición real. */
const montarScrollSuave = () => {
  /* `anchors`: los enlaces del menú apuntan a `#servicios` y
     `#pasos`. Sin esto el salto por hash lo hace el navegador de
     golpe, en medio de un scroll que por lo demás se desliza. */
  const lenis = new Lenis({ duration: 1.05, smoothWheel: true, anchors: true });

  const avanzar = (tiempo: number) => lenis.raf(tiempo * 1000);

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(avanzar);
  gsap.ticker.lagSmoothing(0);
  registrarScroll(lenis);

  return () => {
    registrarScroll(null);
    gsap.ticker.remove(avanzar);
    gsap.ticker.lagSmoothing(500, 33);
    lenis.destroy();
  };
};

export const usePortadaAnimacion = (raiz: RefObject<HTMLElement | null>) => {
  useEfectoVisual(() => {
    const nodo = raiz.current;
    if (!nodo) return;

    const desmontarScroll = quieto() ? null : montarScrollSuave();
    const mm = gsap.matchMedia(nodo);

    mm.add(
      {
        anima: "(prefers-reduced-motion: no-preference)",
      },
      (ctx) => {
        if (!ctx.conditions?.anima) return;
        const q = ctx.selector;
        if (!q) return;

        /* ── La entrada del hero ──────────────────────────────
           Todo el hero entra en UNA línea de tiempo. No es prolijidad:
           es la única forma de repartir la carga. Con cinco tweens
           sueltos cada uno arranca cuando su `forEach` llega, todos
           caen encima del mismo cuarto de segundo y la pantalla se
           mueve entera de golpe.

           Va al montar y no con el scroll: está en la primera
           pantalla, así que un disparador de scroll no se dispararía
           nunca.

           El orden es una jerarquía de lectura, no un adorno. El
           wordmark manda —es lo que hay que leer primero— y arranca
           en cero, solo. Todo lo demás sale escalonado detrás y sin
           coincidir con el pico de nadie:

             0.00  wordmark   la marca, sola en escena
             0.05  barra      cae desde arriba, se quita de en medio
             0.18  perro      grande, así que lento
             0.34  entrada    el párrafo, cuando la marca ya asentó
             0.50  píldoras   lo último, cuando ya hay dónde pararse

           A los 0.34 el wordmark todavía se mueve, pero `expo.out`
           gasta el 90% de su recorrido en el primer tercio: lo que
           queda es un frenado, no movimiento que compita.

           Nada usa escala y ningún desplazamiento pasa de 16 px salvo
           las letras. Lo que se quería es que apareciera entero y
           tranquilo, no que cada pieza hiciera su número. */
        const entrada = gsap.timeline({ defaults: { ease: SALIDA } });

        /* Las letras suben desde detrás del borde de la máscara, el
           mismo gesto que los titulares de sección. `110` y no `100`
           para que la letra quede del todo fuera antes de empezar:
           con exactamente el 100% su borde de arriba coincide con el
           de la máscara y se alcanza a ver una raya.

           El escalonado es corto —35 ms— porque son nueve letras: a
           50 ms la última entraría medio segundo después que la
           primera y dejaría de leerse como una sola palabra. */
        q("[data-anim='marca']").forEach((marca) => {
          entrada.from(
            marca.querySelectorAll(".letra"),
            { yPercent: 110, duration: 1.05, ease: TITULAR, stagger: 0.035 },
            0,
          );
        });

        entrada.from(q("[data-entra='barra']"), { y: -14, opacity: 0, duration: 0.7 }, 0.05);

        /* La foto va en `yPercent` y no en píxeles a propósito: el alto
           del escenario cambia con la ventana, y un desplazamiento en
           píxeles que en escritorio es un roce, en un móvil bajo es un
           salto. El 2.5% se mide siempre contra la foto.

           Es el elemento más grande de la pantalla y por eso es el más
           lento: en el mundo real las cosas grandes tardan más en
           frenar, y una foto de ese tamaño entrando en medio segundo
           se lee como un empujón. */
        entrada.from(
          q("[data-entra='perro']"),
          { yPercent: 2.5, opacity: 0, duration: 1.1 },
          0.18,
        );

        entrada.from(q("[data-entra='entrada']"), { y: 14, opacity: 0, duration: 0.75 }, 0.34);

        /* Las píldoras se animan por hijos y no por el contenedor: en
           escritorio ese contenedor es `absolute` contra la banda, así
           que moverlo movería las dos esquinas a la vez. Por dentro,
           cada una llega por su lado. */
        q("[data-entra='pildoras']").forEach((cont) => {
          entrada.from(
            cont.children,
            { y: 16, opacity: 0, duration: 0.7, stagger: 0.09 },
            0.5,
          );
        });

        /* ── El borde entre bandas ────────────────────────────
           La curva se estira mientras la sección sube por la
           pantalla. `quickTo` reusa un solo tween en vez de crear
           uno por evento de scroll, y su `onUpdate` repinta el
           path: el valor se persigue con inercia propia, así que
           la curva sigue moviéndose un instante después de que el
           scroll se detiene.

           `y` arranca en `REPOSO` para que el primer repintado
           salga del mismo sitio donde el navegador ya lo dejó. */
        q("[data-anim='onda']").forEach((path) => {
          const escena = path.closest(BANDA);
          if (!escena) return;

          /* Un separador puede traer dos capas: la de arriba, que
             derrama el color de la banda anterior, y la `tapa`, que
             recorta con el color de esta. Misma curva, cerrada contra
             el borde contrario. */
          const trazar =
            path.getAttribute("data-onda") === "bajo" ? trazarOndaBajo : trazarOnda;

          const estado = { y: REPOSO };
          const mover = gsap.quickTo(estado, "y", {
            duration: 0.35,
            ease: "power2.out",
            onUpdate: () => path.setAttribute("d", trazar(estado.y)),
          });

          /* El rango arranca en `REPOSO` y no en cero. Con cero, el
             primer `onRefresh` mandaba la curva a `y = 0` —una panza
             del 52.5%, más honda que cualquier punto del recorrido— y
             la portada abría con un salto respecto de lo que el
             navegador ya había pintado. */
          const alScroll = (self: ScrollTrigger) =>
            mover(gsap.utils.mapRange(0, 1, REPOSO, RECORRIDO, self.progress));

          /* `onRefresh` además de `onUpdate`: si la página carga ya
             pasada esta banda —una recarga a media página, una
             vuelta con el botón atrás— `onUpdate` no se dispara
             nunca y la curva se queda en reposo con la de al lado
             ya movida. */
          ScrollTrigger.create({
            trigger: escena,
            start: "top bottom",
            end: "top 25%",
            onUpdate: alScroll,
            onRefresh: alScroll,
          });
        });

        /* ── Parallax ─────────────────────────────────────────
           `data-par` es el recorrido vertical en píxeles: positivo
           baja al entrar y sube al salir, negativo al revés.
           Encontrados, dos elementos de la misma escena se separan
           y aparece la profundidad; con el mismo signo se mueven
           en bloque y no se nota nada.

           `data-par-x` y `data-par-rot` agregan deriva lateral y
           un giro mínimo. Sin ellos el parallax es un ascensor:
           todo sube en la misma línea recta. Con ellos las piezas
           se acomodan, que es lo que hace la referencia.

           El recorrido es corto a propósito (30–70 px). El
           parallax largo se ve bien en una captura y marea en uso
           real, sobre todo con texto al lado.

           Va simétrico —de `-x` a `+x`— para que el punto medio
           del recorrido sea el sitio donde el navegador ya pintó
           el elemento. */
        q("[data-par]").forEach((el) => {
          const caja = el as HTMLElement;
          const recorrido = Number(caja.dataset.par);
          if (!recorrido) return;

          const deriva = Number(caja.dataset.parX) || 0;
          const giro = Number(caja.dataset.parRot) || 0;

          const escena = el.closest(BANDA);
          if (!escena) return;

          gsap.fromTo(
            el,
            { y: recorrido, x: -deriva, rotate: -giro },
            {
              y: -recorrido,
              x: deriva,
              rotate: giro,
              ease: "none",
              scrollTrigger: {
                trigger: escena,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.6,
              },
            },
          );
        });

        /* ── Titulares ────────────────────────────────────────
           Cada línea es una ventana y las palabras suben desde
           debajo de su borde. No hay fundido: el ojo lee un
           movimiento físico, no una opacidad.

           Las líneas se recorren una por una porque el retraso
           entre líneas (0.24 s) es mucho mayor que el retraso
           entre palabras (0.03 s). Un solo `stagger` sobre todas
           las palabras no distingue una cosa de la otra.

           `yPercent` y no `y`: el recorrido tiene que ser el alto
           de la palabra, que cambia con el cuerpo de la letra en
           cada breakpoint. En píxeles, en móvil las palabras
           arrancarían desde demasiado abajo. */
        q("[data-anim='titular']").forEach((titular) => {
          const lineas = titular.querySelectorAll("[data-anim='linea']");

          lineas.forEach((linea, indice) => {
            gsap.from(linea.querySelectorAll(".palabra"), {
              yPercent: 110,
              duration: 0.9,
              ease: TITULAR,
              stagger: 0.03,
              delay: indice * 0.24,
              scrollTrigger: { trigger: titular, start: "top 86%" },
            });
          });

          /* El subrayado se dibuja cuando ya hay algo que
             subrayar: después de la última línea. */
          const trazo = titular.querySelector("[data-anim='trazo']");
          if (trazo) {
            gsap.from(trazo, {
              drawSVG: "0% 0%",
              duration: 0.6,
              ease: MANO,
              delay: lineas.length * 0.24 + 0.3,
              scrollTrigger: { trigger: titular, start: "top 86%" },
            });
          }
        });

        q("[data-anim='ante']").forEach((el) => {
          gsap.from(el, {
            y: 16,
            opacity: 0,
            duration: 0.6,
            ease: SALIDA,
            scrollTrigger: { trigger: el, start: "top 90%" },
          });
        });

        q("[data-anim='apoyo']").forEach((el) => {
          gsap.from(el, {
            y: 18,
            opacity: 0,
            duration: 0.7,
            ease: SALIDA,
            delay: 0.14,
            scrollTrigger: { trigger: el, start: "top 90%" },
          });
        });

        /* Las fichas no entran de un golpe: crecen atadas al
           scroll, así que el que llega despacio las ve crecer
           despacio. Es el mismo recurso que usa la referencia con
           sus fotos de producto.

           La manija va en una capa intermedia, no en el marco: el
           marco reacciona al mouse con `hover:scale` de Tailwind y
           GSAP escribe el transform en línea, que le gana siempre a
           la clase. Con las dos escalas en el mismo elemento el
           hover no hacía absolutamente nada.

           Escala y opacidad, nunca `y`: el desplazamiento es del
           parallax que corre en la `img` de adentro. */
        q("[data-anim='ficha']").forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 0.9, opacity: 0.45 },
            {
              scale: 1,
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top 100%",
                end: "top 60%",
                scrub: true,
              },
            },
          );
        });

        /* ── Los tres módulos ─────────────────────────────────
           Tres tarjetas en escalera, no una lista con filetes: cada
           una sube por separado y con su propio retraso, así que la
           cascada dibuja el mismo escalonado que ya tienen en reposo
           por CSS (`md:mt-*`). Nada de línea divisoria — el aire
           entre columnas ya separa una cosa de la otra. */
        q("[data-anim='modulos']").forEach((lista) => {
          gsap.from(lista.querySelectorAll("[data-anim='modulo']"), {
            y: 34,
            opacity: 0,
            duration: 0.75,
            ease: SALIDA,
            stagger: 0.14,
            scrollTrigger: { trigger: lista, start: "top 82%" },
          });
        });

        /* ── La lista de los pasos ────────────────────────────
           Es tipografía, no tarjeta: el número de cada fila entra
           deslizándose desde la izquierda —no con el rebote que
           usan los puntos de un mapa— y el bloque de texto lo sigue
           justo después. Ambos por fila, así que la lista se lee
           fila por fila y no como dos columnas que entran por
           separado. */
        q("[data-anim='ruta']").forEach((cont) => {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: cont, start: "top 80%" },
          });

          tl.from(cont.querySelectorAll("[data-anim='cifra']"), {
            x: -18,
            opacity: 0,
            duration: 0.6,
            ease: SALIDA,
            stagger: 0.16,
          }).from(
            cont.querySelectorAll("[data-anim='paso']"),
            { y: 18, opacity: 0, duration: 0.6, ease: SALIDA, stagger: 0.16 },
            0.08,
          );
        });

        /* ── Cierre ───────────────────────────────────────────
           La correa cruza el fondo dibujándose durante todo el
           bloque; el texto sube encima mientras tanto. */
        q("[data-anim='cierre']").forEach((cont) => {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: cont, start: "top 72%" },
          });

          tl.from(cont.querySelectorAll("[data-anim='linea-cierre']"), {
            y: 26,
            opacity: 0,
            duration: 0.8,
            ease: SALIDA,
            stagger: 0.1,
          });

          const correa = cont.querySelector("[data-anim='correa']");
          if (correa) {
            tl.from(correa, { drawSVG: "0% 0%", duration: 1.5, ease: MANO }, 0);
          }
        });
      },
    );

    /* Las tipografías y las fotos llegan después del primer pintado
       y mueven todo hacia abajo. Sin este refresco los disparadores
       quedan apuntando a posiciones viejas. */
    let vivo = true;
    document.fonts?.ready.then(() => {
      if (vivo) ScrollTrigger.refresh();
    });

    return () => {
      vivo = false;
      mm.revert();
      desmontarScroll?.();
    };
  }, [raiz]);
};

/* ─────────────────────────────────────────────────────────────
   El aro que persigue al puntero.

   No reemplaza al cursor del sistema: lo acompaña. Esconderlo se
   ve bien en una captura y arruina la precisión — el usuario deja
   de saber exactamente dónde va a hacer clic. La referencia lo
   usa así, como una segunda capa.

   Se abre sobre todo lo que se puede tocar —enlaces, botones, y
   lo que se marque con `data-cursor`— así que sirve de realce de
   puntero y no solo de adorno.

   La etiqueta solo aparece si `data-cursor` trae texto, y ese
   texto dice qué hay del otro lado. Una foto que no lleva a ningún
   lado abre el aro y no dice nada: poner ahí una palabra sería
   prometer un destino que no existe.

   Solo en escritorio con puntero fino: en una pantalla táctil no
   hay puntero al que seguir, y con `prefers-reduced-motion` un
   objeto que persigue al mouse es exactamente lo que la
   preferencia pide evitar.
   ───────────────────────────────────────────────────────────── */
/** Todo lo que responde al puntero, esté marcado o no. */
const TOCABLE = "a[href], button, [data-cursor]";

export const useCursorPortada = () => {
  useEffect(() => {
    if (quieto()) return;
    if (!window.matchMedia("(min-width: 981px) and (pointer: fine)").matches) return;

    const aro = document.createElement("div");
    aro.className = "portada-aro";
    aro.setAttribute("aria-hidden", "true");

    const etiqueta = document.createElement("span");
    aro.appendChild(etiqueta);
    document.body.appendChild(aro);

    /* El retraso es el efecto: el aro llega un instante después
       que el puntero. Sin él sería un punto pegado al mouse, que
       no aporta nada. */
    const seguirX = gsap.quickTo(aro, "x", { duration: 0.5, ease: "power3" });
    const seguirY = gsap.quickTo(aro, "y", { duration: 0.5, ease: "power3" });

    let visible = false;

    const alMover = (evento: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.set(aro, { x: evento.clientX, y: evento.clientY });
        gsap.to(aro, { autoAlpha: 1, duration: 0.3 });
      }
      seguirX(evento.clientX);
      seguirY(evento.clientY);
    };

    const alEntrar = (evento: PointerEvent) => {
      const objetivo = (evento.target as Element | null)?.closest?.(TOCABLE);
      const texto = objetivo?.getAttribute("data-cursor");

      aro.dataset.abierto = objetivo ? "si" : "no";
      etiqueta.textContent = texto || "";
    };

    gsap.set(aro, { autoAlpha: 0 });
    document.addEventListener("pointermove", alMover, { passive: true });
    document.addEventListener("pointerover", alEntrar, { passive: true });

    return () => {
      document.removeEventListener("pointermove", alMover);
      document.removeEventListener("pointerover", alEntrar);
      gsap.killTweensOf(aro);
      aro.remove();
    };
  }, []);
};
