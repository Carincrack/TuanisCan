import { gooeyToast } from "goey-toast";
import type { GooeyToastOptions } from "goey-toast";

/* ─────────────────────────────────────────────────────────────
   LOS AVISOS

   Una sola puerta para todo el sistema. Los sitios que avisan algo
   no tienen por qué saber de la librería ni de cómo se saca el
   mensaje de un error de Supabase: dicen qué pasó y ya.

   ── El aspecto es el de la librería, sin tocar ──

   Nada de colores, presets ni duraciones propias. `goey-toast` trae
   su propio aspecto —pastilla blanca, sombra baja, ícono de color
   según el tipo, animación de resorte— y es el que se usa.

   Vale la pena dejar dicho por qué, porque no es evidente: los
   colores propios no solo cambiaban el relleno. La librería decide
   la sombra así —

     boxShadow: borderColor ? "none" : "0 1px 4px rgba(0,0,0,.08)"

   — o sea que pasar `borderColor` APAGA la sombra. Un aviso de
   color plano, con borde y sin sombra, no se parecía al original.

   Lo único que llega desde acá es contenido: el título, la segunda
   línea, un botón, un id.

   ── Qué va acá y qué NO ──

   Acá van los DESENLACES de una acción: se guardó, se borró, se
   envió, se aprobó, falló. Los errores de validación de un campo se
   quedan donde están, pegados al campo: un aviso flotante no puede
   señalar cuál de los seis campos está mal, y quien lo lee ya no lo
   tiene delante cuando vuelve a mirar el formulario.
   ───────────────────────────────────────────────────────────── */

/** El mensaje legible de cualquier cosa que se haya lanzado.

    Estaba copiado en siete archivos —`carnet`, `mascotas`,
    `mascotasPerdidas`, `paseadores`, `ProfilePage` y los dos ganchos
    de administración—, cada uno con su propia frase de reserva. Acá
    vive una vez.

    El segundo caso no es paranoia: los errores de PostgREST llegan
    como objetos planos con `message`, sin ser instancias de `Error`,
    y sin esta rama se perdía el motivo real —"la zona está en uso",
    "faltan documentos"— y salía la frase genérica. */
export const motivo = (causa: unknown, respaldo = "No se pudo completar la operación.") => {
  if (causa instanceof Error) return causa.message;
  if (typeof causa === "string" && causa.trim()) return causa;
  if (typeof causa === "object" && causa && "message" in causa) {
    const mensaje = String((causa as { message: unknown }).message);
    if (mensaje.trim()) return mensaje;
  }
  return respaldo;
};

interface Detalle {
  /** Segunda línea. Va lo que el título no puede: la consecuencia, el
      nombre completo, el siguiente paso. */
  detalle?: string;
  /** Un botón dentro del aviso. Para deshacer, para ir a ver lo que
      se acaba de crear. */
  accion?: { label: string; onClick: () => void };
  /** Mismo id = el aviso se reemplaza en vez de apilarse. Sirve para
      lo que se dispara repetido, como guardar mientras se escribe. */
  id?: string;
}

/** Solo contenido. Ningún ajuste de aspecto: lo que no se manda, lo
    resuelve la librería con su propio valor. */
const opciones = (extra?: Detalle): GooeyToastOptions => ({
  ...(extra?.detalle ? { description: extra.detalle } : {}),
  ...(extra?.accion ? { action: extra.accion } : {}),
  ...(extra?.id ? { id: extra.id } : {}),
});

export const aviso = {
  /** Salió bien. */
  ok: (titulo: string, extra?: Detalle) => gooeyToast.success(titulo, opciones(extra)),

  /** Salió mal. Acepta el error crudo: le saca el mensaje solo. */
  error: (causa: unknown, extra?: Detalle & { respaldo?: string }) =>
    gooeyToast.error(motivo(causa, extra?.respaldo), opciones(extra)),

  /** Salió, pero hay que mirar algo. */
  ojo: (titulo: string, extra?: Detalle) => gooeyToast.warning(titulo, opciones(extra)),

  /** Ni bien ni mal: una noticia. */
  dato: (titulo: string, extra?: Detalle) => gooeyToast.info(titulo, opciones(extra)),

  /** Para lo que tarda. Un solo aviso que pasa de "guardando" a
      "guardado" o a la falla, sin que la pantalla tenga que llevar su
      propio estado de "ocupado" para contarlo. */
  proceso: <T>(
    promesa: Promise<T>,
    textos: { esperando: string; bien: string | ((dato: T) => string); mal?: string },
  ) =>
    gooeyToast.promise(promesa, {
      loading: textos.esperando,
      success: textos.bien,
      error: (causa) => motivo(causa, textos.mal),
    }),

  /** Cierra uno, varios por tipo, o todos. */
  cerrar: gooeyToast.dismiss,
};
