/* Levanta la cortina de entrada que pinta `index.html`.

   Se llama cuando la app ya sabe qué mostrar —la portada, el login o
   el panel—, pero saber qué mostrar no es tenerlo pintado: las
   pantallas llegan en trozos aparte (`routes.tsx`), y mientras el
   trozo viaja `#root` está vacío. Si la cortina se fuera en ese
   momento, se levantaría sobre una pantalla en blanco y el parpadeo
   volvería por la otra puerta.

   Por eso espera a que `#root` tenga algo adentro, y después dos
   cuadros más: el primero para que el navegador lo pinte, el segundo
   para asegurar que ese pintado ya está en pantalla. Recién ahí
   empieza el fundido. Si en cinco segundos no apareció nada, se va
   igual: una cortina eterna es peor que un cuadro vacío.

   Se puede llamar las veces que sea: solo la primera hace algo. */
const ESPERA_MAXIMA_MS = 5000;

export const levantarCortina = () => {
  const cortina = document.getElementById("cortina");
  if (!cortina || cortina.dataset.saliendo !== undefined) return;
  cortina.dataset.saliendo = "";

  const root = document.getElementById("root");
  const desde = performance.now();

  const irse = () => {
    cortina.dataset.fuera = "";
    const quitar = () => cortina.remove();
    cortina.addEventListener("transitionend", quitar, { once: true });
    /* Con movimiento reducido no hay transición, y entonces tampoco
       llega `transitionend`. */
    window.setTimeout(quitar, 600);
  };

  const esperar = () => {
    const listo = root?.firstElementChild;
    if (listo || performance.now() - desde > ESPERA_MAXIMA_MS) {
      requestAnimationFrame(() => requestAnimationFrame(irse));
    } else {
      requestAnimationFrame(esperar);
    }
  };

  esperar();
};
