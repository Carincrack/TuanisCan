/* ─────────────────────────────────────────────────────────────
   EL SONIDO DE UNA NOTIFICACIÓN

   Dos notas cortas, una más aguda que la otra, generadas con el
   audio del navegador: no hay archivo que descargar ni que se pueda
   romper. En el teléfono, además, una vibración breve.

   Los navegadores no dejan sonar nada hasta que la persona toca la
   página una vez —es la regla contra la publicidad con sonido—. Por
   eso `prepararSonido` espera ese primer toque para "despertar" el
   audio; hasta entonces las notificaciones llegan igual, solo que en
   silencio.
   ───────────────────────────────────────────────────────────── */

let contexto: AudioContext | null = null;

const audio = () => {
  if (contexto) return contexto;
  const Contexto =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Contexto) return null;
  contexto = new Contexto();
  return contexto;
};

/** Despierta el audio con el primer toque o tecla de la persona. */
export const prepararSonido = () => {
  const despertar = () => {
    void audio()?.resume();
    window.removeEventListener("pointerdown", despertar);
    window.removeEventListener("keydown", despertar);
  };
  window.addEventListener("pointerdown", despertar);
  window.addEventListener("keydown", despertar);
  return despertar;
};

/** Las dos notas: La5 y Mi6, la segunda 110 ms después. */
export const sonarAviso = () => {
  const ctx = audio();
  if (ctx && ctx.state === "running") {
    const ahora = ctx.currentTime;
    for (const [frecuencia, retraso] of [
      [880, 0],
      [1318.5, 0.11],
    ]) {
      const oscilador = ctx.createOscillator();
      const volumen = ctx.createGain();
      oscilador.type = "sine";
      oscilador.frequency.value = frecuencia;
      volumen.gain.setValueAtTime(0.0001, ahora + retraso);
      volumen.gain.exponentialRampToValueAtTime(0.16, ahora + retraso + 0.015);
      volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + retraso + 0.32);
      oscilador.connect(volumen).connect(ctx.destination);
      oscilador.start(ahora + retraso);
      oscilador.stop(ahora + retraso + 0.34);
    }
  }
  navigator.vibrate?.([40, 30, 40]);
};
