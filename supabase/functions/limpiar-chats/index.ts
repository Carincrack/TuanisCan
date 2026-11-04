// Borra de verdad los chats que ya no tiene nadie: los que borraron
// el dueño y el paseador, y los que pasaron 7 días. Mensajes y fotos.
//
// La llaman:
//   - la app, apenas el segundo de los dos borra el chat (con su sesión
//     y el id del paseo), y
//   - pg_cron todos los días a las 3:15 a. m. de Costa Rica, con la llave
//     del Vault en el encabezado `x-tarea` (ver la migración
//     20261020100000_chat_fotos_y_borrado.sql).
//
// Vive aquí y no en SQL porque las fotos solo se pueden borrar por la
// API de Storage.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = "chat-fotos";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const responder = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

type ChatPorPurgar = { id_paseo: string; hasta: string; rutas: string[] };

// Las fotos del chat: las que se mandaron y también las que se
// subieron pero nunca llegaron a mandarse (se cortó la señal, etc.).
async function fotosDelChat(chat: ChatPorPurgar): Promise<string[]> {
  const rutas = new Set(chat.rutas);
  const hasta = new Date(chat.hasta).getTime();
  const { data } = await admin.storage.from(BUCKET).list(chat.id_paseo, { limit: 1000 });
  for (const archivo of data ?? []) {
    if (archivo.id && new Date(archivo.created_at).getTime() <= hasta) {
      rutas.add(`${chat.id_paseo}/${archivo.name}`);
    }
  }
  return [...rutas];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  let filtro: { p_id_paseo?: string; p_usuario?: string } = {};

  const llave = req.headers.get("x-tarea");
  if (llave) {
    // pg_cron: todo lo pendiente.
    const { data: valida, error } = await admin.rpc("es_llave_de_limpieza", { p_llave: llave });
    if (error) return responder({ error: error.message }, 500);
    if (!valida) return responder({ error: "Llave no válida" }, 401);
  } else {
    // La app: solo ese chat, y solo si es de quien lo pide.
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return responder({ error: "Inicia sesión" }, 401);
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return responder({ error: "La sesión no es válida" }, 401);

    const cuerpo = await req.json().catch(() => ({}));
    const idPaseo = cuerpo?.id_paseo;
    if (typeof idPaseo !== "string" || !UUID.test(idPaseo)) {
      return responder({ error: "Falta el paseo" }, 400);
    }
    filtro = { p_id_paseo: idPaseo, p_usuario: data.user.id };
  }

  const { data: chats, error } = await admin.rpc("chats_por_purgar", filtro);
  if (error) return responder({ error: error.message }, 500);

  let mensajes = 0;
  let fotos = 0;
  const fallidos: string[] = [];

  for (const chat of (chats ?? []) as ChatPorPurgar[]) {
    const rutas = await fotosDelChat(chat);
    if (rutas.length) {
      const { data: borradas, error: errorFotos } = await admin.storage.from(BUCKET).remove(rutas);
      // Si las fotos no se pudieron borrar, los mensajes se quedan:
      // sin ellos se perderían las rutas. Se reintenta la próxima vez.
      if (errorFotos) {
        fallidos.push(chat.id_paseo);
        continue;
      }
      fotos += borradas?.length ?? 0;
    }
    const { data: cuantos, error: errorMensajes } = await admin.rpc("purgar_chat", {
      p_id_paseo: chat.id_paseo,
      p_hasta: chat.hasta,
    });
    if (errorMensajes) {
      fallidos.push(chat.id_paseo);
      continue;
    }
    mensajes += cuantos ?? 0;
  }

  return responder({ chats: (chats?.length ?? 0) - fallidos.length, mensajes, fotos, fallidos });
});
