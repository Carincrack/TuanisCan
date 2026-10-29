import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/* ─────────────────────────────────────────────────────────────
   EL CHAT DEL PASEO

   Un chat por paseo, entre el dueño y el paseador:

     paseo en curso   -> se escribe, se mandan fotos
     paseo terminado  -> solo se lee
     7 días después   -> se borra solo, con sus fotos

   Cada uno puede borrar el chat de su lado; cuando lo borraron los
   dos, se borra de verdad (mensajes y fotos) con la función
   `limpiar-chats`.

   Escribir pasa siempre por `enviar_mensaje`, que es la que controla
   que el paseo esté en curso. Los mensajes nuevos y los «visto» llegan
   por el tiempo real de la tabla; «está escribiendo…» y «en línea» van
   por el mismo canal pero sin tocar la base (broadcast y presence).
   ───────────────────────────────────────────────────────────── */

export type TipoMensaje = "texto" | "sticker" | "foto";

/** Las fotos del chat: privadas, en una carpeta por paseo. */
const BUCKET_FOTOS = "chat-fotos";

export interface Mensaje {
  id_mensaje: string;
  es_mio: boolean;
  tipo: TipoMensaje;
  contenido: string;
  leido: boolean;
  fecha_envio: string;
}

export interface ChatResumen {
  id_paseo: string;
  mascota: string;
  foto_mascota: string | null;
  otra_persona: string;
  foto_otra_persona: string | null;
  /** Qué soy yo en este paseo. */
  soy: "dueno" | "paseador";
  estado_paseo: string;
  /** Se puede escribir: el paseo está en curso. */
  abierto: boolean;
  /** Cuándo se borra el chat. */
  vence_en: string;
  ultimo_contenido: string | null;
  ultimo_tipo: TipoMensaje | null;
  ultimo_es_mio: boolean | null;
  ultimo_en: string | null;
  sin_leer: number;
}

/** Una fila tal como la manda el tiempo real. */
interface FilaMensaje {
  id_mensaje: string;
  id_paseo: string;
  id_remitente: string;
  id_destinatario: string;
  tipo: TipoMensaje;
  contenido: string;
  leido: boolean;
  fecha_envio: string;
}

export const deFila = (fila: FilaMensaje, miId: string): Mensaje => ({
  id_mensaje: fila.id_mensaje,
  es_mio: fila.id_remitente === miId,
  tipo: fila.tipo ?? "texto",
  contenido: fila.contenido,
  leido: fila.leido,
  fecha_envio: fila.fecha_envio,
});

export const listarMisChats = async (): Promise<ChatResumen[]> => {
  const { data, error } = await supabase.rpc("listar_mis_chats");
  if (error) throw error;
  return (data ?? []) as ChatResumen[];
};

export const listarMensajes = async (idPaseo: string): Promise<Mensaje[]> => {
  const { data, error } = await supabase.rpc("listar_mensajes", { p_id_paseo: idPaseo });
  if (error) throw error;
  return (data ?? []) as Mensaje[];
};

export const enviarMensaje = async (idPaseo: string, contenido: string, tipo: TipoMensaje = "texto"): Promise<Mensaje> => {
  const { data, error } = await supabase.rpc("enviar_mensaje", {
    p_id_paseo: idPaseo,
    p_contenido: contenido,
    p_tipo: tipo,
  });
  if (error) throw error;
  return (data as Mensaje[])[0];
};

export const marcarChatLeido = async (idPaseo: string) => {
  const { error } = await supabase.rpc("marcar_chat_leido", { p_id_paseo: idPaseo });
  if (error) throw error;
};

export const contarMensajesSinLeer = async (): Promise<number> => {
  const { data, error } = await supabase.rpc("contar_mensajes_sin_leer");
  if (error) throw error;
  return Number(data ?? 0);
};

/** Borra el chat de mi lado. Si con esto ya lo borraron los dos, pide
    el borrado total; si esa llamada falla, la limpieza de la noche lo
    hace igual. Devuelve si quedó borrado para los dos. */
export const borrarMiChat = async (idPaseo: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc("borrar_mi_chat", { p_id_paseo: idPaseo });
  if (error) throw error;
  const ambos = data === true;
  if (ambos) await supabase.functions.invoke("limpiar-chats", { body: { id_paseo: idPaseo } }).catch(() => undefined);
  return ambos;
};

/* ── Fotos ──
   Del teléfono salen fotos de 4 MB o más. Antes de subirlas se achican
   a 1600 px por el lado largo, en JPEG: se ven igual de bien en el
   chat, suben en un segundo con datos móviles y entran holgadas en el
   límite de 5 MB del bucket. La orientación se respeta (las fotos de
   teléfono la traen aparte, en los datos EXIF). */
const LADO_MAXIMO = 1600;

/* Algunos navegadores viejos de teléfono no tienen `createImageBitmap`
   (o no con opciones): ahí se lee con un <img>, que también respeta la
   orientación. */
const leerImagen = async (archivo: File): Promise<{ fuente: CanvasImageSource; ancho: number; alto: number; soltar: () => void }> => {
  try {
    const mapa = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    return { fuente: mapa, ancho: mapa.width, alto: mapa.height, soltar: () => mapa.close() };
  } catch {
    const url = URL.createObjectURL(archivo);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, soltar: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("No se pudo leer la foto. Prueba con otra.");
    }
  }
};

const comprimirFoto = async (archivo: File): Promise<Blob> => {
  const imagen = await leerImagen(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.ancho, imagen.alto));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.ancho * escala);
  lienzo.height = Math.round(imagen.alto * escala);
  lienzo.getContext("2d")?.drawImage(imagen.fuente, 0, 0, lienzo.width, lienzo.height);
  imagen.soltar();
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo preparar la foto."))), "image/jpeg", 0.82),
  );
};

const nombreAlAzar = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

/** Achica y sube la foto. Devuelve su ruta, que es lo que se manda
    como mensaje (`enviarMensaje(idPaseo, ruta, "foto")`). */
export const subirFoto = async (idPaseo: string, archivo: File): Promise<string> => {
  const foto = await comprimirFoto(archivo);
  const ruta = `${idPaseo}/${nombreAlAzar()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, foto, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return ruta;
};

/** Enlaces temporales (una hora) para ver las fotos. El bucket es
    privado: sin enlace firmado no las ve nadie. */
export const enlacesDeFotos = async (rutas: string[]): Promise<Record<string, string>> => {
  if (!rutas.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(rutas, 3600);
  if (error) throw error;
  const enlaces: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) enlaces[d.path] = d.signedUrl;
  return enlaces;
};

/** El canal de UN chat: mensajes nuevos, «visto», «escribiendo» y
    «en línea». Devuelve cómo avisar que uno escribe y cómo cerrarlo. */
export const abrirCanalChat = (
  idPaseo: string,
  miId: string,
  manejadores: {
    alLlegar: (mensaje: Mensaje) => void;
    alActualizar: (mensaje: Mensaje) => void;
    alEscribir: () => void;
    alCambiarPresencia: (otroEnLinea: boolean) => void;
  },
) => {
  const canal: RealtimeChannel = supabase.channel(`chat-${idPaseo}`, {
    config: { presence: { key: miId }, broadcast: { self: false } },
  });

  canal
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "mensajes", filter: `id_paseo=eq.${idPaseo}` },
      ({ new: fila }) => manejadores.alLlegar(deFila(fila as FilaMensaje, miId)),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "mensajes", filter: `id_paseo=eq.${idPaseo}` },
      ({ new: fila }) => manejadores.alActualizar(deFila(fila as FilaMensaje, miId)),
    )
    .on("broadcast", { event: "escribiendo" }, () => manejadores.alEscribir())
    .on("presence", { event: "sync" }, () => {
      const presentes = Object.keys(canal.presenceState());
      manejadores.alCambiarPresencia(presentes.some((clave) => clave !== miId));
    })
    .subscribe((estado) => {
      if (estado === "SUBSCRIBED") void canal.track({ en_linea: true });
    });

  return {
    avisarEscribiendo: () => void canal.send({ type: "broadcast", event: "escribiendo", payload: {} }),
    cerrar: () => void supabase.removeChannel(canal),
  };
};

/** Todos los mensajes que me llegan, de cualquier chat: para el número
    del menú y el aviso flotante cuando no estoy mirando ese chat. */
export const escucharMensajesParaMi = (miId: string, alLlegar: (fila: FilaMensaje) => void) => {
  const canal = supabase
    .channel(`mensajes-para-${miId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "mensajes", filter: `id_destinatario=eq.${miId}` },
      ({ new: fila }) => alLlegar(fila as FilaMensaje),
    )
    .subscribe();
  return () => void supabase.removeChannel(canal);
};

/** Ruta del chat de un paseo según el rol con que se mira. */
export const rutaChat = (idPaseo: string, rol: "dueno" | "paseador") =>
  `${rol === "paseador" ? "/p/mensajes" : "/mensajes"}?chat=${idPaseo}`;
