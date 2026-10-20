import { useEffect, useRef } from "react";
import type { Notification } from "../services/notifications.service";

/* ─────────────────────────────────────────────────────────────
   CUANDO LLEGA ALGO NUEVO

   Una sola suscripción en tiempo real —la de `AppShell`— escucha las
   notificaciones del usuario. Cada notificación que llega se anuncia
   acá, y las pantallas que muestran algo que pudo cambiar con ella se
   vuelven a cargar solas:

     el paseador ve la solicitud nueva sin recargar,
     el dueño ve que se la aceptaron,
     el paseador ve que el dueño confirmó el pago, y así.

   Toda acción del flujo ya deja una notificación en la base, así que
   no hace falta escuchar cada tabla por separado: la notificación es
   el timbre, y la pantalla va a buscar el dato fresco a la base.
   ───────────────────────────────────────────────────────────── */

const EVENTO = "tuaniscan:notificacion";

export type TipoNotificacion = Notification["tipo"];

/** Lo llama `AppShell` por cada notificación que llega. */
export const anunciarNotificacion = (notificacion: Notification) => {
  window.dispatchEvent(new CustomEvent<Notification>(EVENTO, { detail: notificacion }));
};

/** Vuelve a ejecutar `alLlegar` cada vez que llega una notificación de
    alguno de esos tipos. */
export const useAlLlegarNotificacion = (
  tipos: TipoNotificacion[],
  alLlegar: (notificacion: Notification) => void,
) => {
  // El último `alLlegar` y los últimos tipos, sin tener que volver a
  // suscribirse cada vez que la pantalla se dibuja.
  const ultimo = useRef(alLlegar);
  const filtro = useRef(tipos);
  useEffect(() => {
    ultimo.current = alLlegar;
    filtro.current = tipos;
  });

  useEffect(() => {
    const escuchar = (evento: Event) => {
      const notificacion = (evento as CustomEvent<Notification>).detail;
      if (filtro.current.includes(notificacion.tipo)) ultimo.current(notificacion);
    };
    window.addEventListener(EVENTO, escuchar);
    return () => window.removeEventListener(EVENTO, escuchar);
  }, []);
};
