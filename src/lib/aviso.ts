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

/* ── El mismo aviso no sale dos veces seguidas ──

   Si una pantalla se monta dos veces o dos ganchos fallan por la misma
   causa en el mismo instante, salía una pila de pastillas idénticas.

   NO se resuelve dándole al aviso un id fijo. `goey-toast` está hecho
   para ids al azar: lleva un registro propio por id y anima la forma
   de cada pastilla según ese id, así que reusar uno revive un aviso
   que se estaba cerrando y la pastilla se deforma. Se resuelve antes
   de llegar a la librería: si el mismo texto salió hace menos de
   cuatro segundos, no se vuelve a mandar. Lo que sí se manda va con
   el comportamiento normal de la librería, sin tocar. */
const VENTANA_MS = 4000;
const recientes = new Map<string, number>();

const repetido = (tipo: string, titulo: string) => {
  const clave = `${tipo}:${titulo}`;
  const ahora = Date.now();
  const antes = recientes.get(clave);
  recientes.set(clave, ahora);
  return antes !== undefined && ahora - antes < VENTANA_MS;
};

export const aviso = {
  /** Salió bien. */
  ok: (titulo: string, extra?: Detalle) =>
    repetido("ok", titulo) ? undefined : gooeyToast.success(titulo, opciones(extra)),

  /** Salió mal. Acepta el error crudo: le saca el mensaje solo. */
  error: (causa: unknown, extra?: Detalle & { respaldo?: string }) => {
    const texto = motivo(causa, extra?.respaldo);
    return repetido("error", texto) ? undefined : gooeyToast.error(texto, opciones(extra));
  },

  /** Salió, pero hay que mirar algo. */
  ojo: (titulo: string, extra?: Detalle) =>
    repetido("ojo", titulo) ? undefined : gooeyToast.warning(titulo, opciones(extra)),

  /** Ni bien ni mal: una noticia. */
  dato: (titulo: string, extra?: Detalle) =>
    repetido("dato", titulo) ? undefined : gooeyToast.info(titulo, opciones(extra)),

  /** Para lo que tarda. Un solo aviso que pasa de "guardando" a
      "guardado" o a la falla, sin que la pantalla tenga que llevar su
      propio estado de "ocupado" para contarlo.

      `gooeyToast.promise` devuelve el id del toast, no la promesa: un
      `await aviso.proceso(...)` no esperaba el resultado real y quien
      llamaba seguía de largo —a recargar la lista, a cerrar el
      diálogo— antes de que la operación hubiera terminado en el
      servidor. Acá se dispara el toast y se devuelve la promesa
      original, para que el await sí espere y el catch sí reciba el
      error si algo sale mal. */
  proceso: <T>(
    promesa: Promise<T>,
    textos: { esperando: string; bien: string | ((dato: T) => string); mal?: string },
  ): Promise<T> => {
    gooeyToast.promise(promesa, {
      loading: textos.esperando,
      success: textos.bien,
      error: (causa) => motivo(causa, textos.mal),
    });
    return promesa;
  },

  /** Cierra uno, varios por tipo, o todos. */
  cerrar: gooeyToast.dismiss,
};
