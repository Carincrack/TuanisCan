/* ─────────────────────────────────────────────────────────────
   LA MEMORIA DE CONSULTAS

   Antes cada pantalla le pedía todo a la base cada vez que se abría,
   y varias piezas pedían lo mismo al mismo tiempo: entrar al panel del
   dueño eran 43 peticiones, 24 de ellas repetidas, y cada paso por
   «Paseos» otras 48.

   Esta memoria se pone entre la app y Supabase —es el `fetch` del
   cliente, ver `lib/supabase.ts`— y hace tres cosas, nada más:

   1. JUNTA lo repetido: si dos piezas piden exactamente lo mismo al
      mismo tiempo, sale una sola petición y las dos reciben la misma
      respuesta.

   2. RECUERDA por un rato lo que está en la tabla `VIGENCIAS`, y solo
      eso. Lo que no está en la tabla no se recuerda nunca: el chat,
      las notificaciones, la ubicación del paseo en vivo, el inicio de
      sesión.

   3. OLVIDA en cuanto algo cambia:
        · después de cualquier escritura de la app (ver `esEscritura`),
        · cuando llega una notificación: alguien más cambió algo
          (`olvidarDatos` desde `lib/tiempoReal.ts`),
        · al cambiar de usuario o cerrar sesión (`olvidarTodo` desde
          `AuthContext`).

   Es por usuario: la clave de cada respuesta lleva el token de quien
   la pidió, así que nunca se le entrega a una cuenta lo de otra.
   ───────────────────────────────────────────────────────────── */

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;

/* Qué se recuerda y cuánto. El nombre es el de la tabla
   (`/rest/v1/<tabla>`) o el de la función (`rpc/<nombre>`). */
const VIGENCIAS: Record<string, number> = {
  // La cuenta propia. Cambia cuando la persona la edita, y esa
  // escritura la olvida.
  "rpc/obtener_mi_perfil": MINUTO,
  paseadores: MINUTO,
  perfil_usuario: MINUTO,
  documentos_paseador: MINUTO,
  documentos_verificacion_usuario: MINUTO,
  negocios: MINUTO,

  // Casi fijas.
  zonas: 10 * MINUTO,
  "rpc/buscar_paseadores": 2 * MINUTO,
  "rpc/buscar_negocios_cercanos": 2 * MINUTO,
  "rpc/listar_resenas_publicas_paseador": 2 * MINUTO,

  // Las listas de trabajo: medio minuto. Alcanza para volver a una
  // pantalla sin pedirlo todo otra vez, y es poco para que algo quede
  // viejo (lo que cambia de verdad ya llega con su notificación).
  mascotas: 30 * SEGUNDO,
  paseos: 30 * SEGUNDO,
  metodos_pago: 30 * SEGUNDO,
  resenas: 30 * SEGUNDO,
  mascotas_perdidas: 30 * SEGUNDO,
  avistamientos: 30 * SEGUNDO,
  "rpc/obtener_matches_mascota": 30 * SEGUNDO,
  "rpc/listar_pagos_dueno": 30 * SEGUNDO,
  "rpc/listar_agenda_paseador": 30 * SEGUNDO,
  "rpc/listar_solicitudes_paseador": 30 * SEGUNDO,
  "rpc/listar_ganancias_paseador": 30 * SEGUNDO,
  "rpc/listar_historial_paseador": 30 * SEGUNDO,
  "rpc/listar_resenas_paseador": 30 * SEGUNDO,
  "rpc/listar_finanzas_admin": 30 * SEGUNDO,
  "rpc/listar_usuarios_admin": 30 * SEGUNDO,
  "rpc/listar_paseadores_admin": 30 * SEGUNDO,
  "rpc/listar_paseos_admin": 30 * SEGUNDO,
  "rpc/listar_verificaciones_admin": 30 * SEGUNDO,
};

/* Las fotos privadas se ven con un enlace firmado que dura una hora.
   Firmar otra vez en cada pantalla no solo era una petición más: el
   enlace nuevo era otra dirección, y el navegador volvía a bajar la
   misma foto. Recordar la firma 50 minutos deja la dirección quieta y
   la foto queda en la caché del navegador. */
const VIGENCIA_FIRMA = 50 * MINUTO;

/* Las funciones que solo leen empiezan así; cualquier otra escribe. */
const LECTURA_RPC = /^(listar|obtener|contar|buscar)_/;

/* Escrituras que no tocan nada de lo que se recuerda: solo las
   notificaciones o el chat, que nunca se recuerdan. Sin esta lista,
   marcar una notificación como leída borraba la memoria entera. */
const NO_CAMBIAN_NADA = new Set([
  "marcar_notificacion_leida",
  "marcar_notificaciones_leidas",
  "eliminar_notificacion",
  "eliminar_notificaciones",
  "marcar_chat_leido",
  "enviar_mensaje",
  "borrar_mi_chat",
]);

type Guardada = {
  status: number;
  statusText: string;
  headers: [string, string][];
  cuerpo: ArrayBuffer;
};

type Entrada = {
  /** Hasta cuándo vale. Mientras la petición viaja, 0. */
  vence: number;
  esFirma: boolean;
  respuesta: Promise<Guardada>;
};

const memoria = new Map<string, Entrada>();

/* Cada olvido sube la generación. Una petición que salió antes de un
   olvido y vuelve después no se guarda: traería lo de antes del
   cambio (o, al cambiar de usuario, lo del usuario anterior). */
let generacion = 0;

/** Olvida los datos, pero no las firmas de las fotos: una foto no
    cambia porque cambió un paseo. */
export const olvidarDatos = () => {
  generacion += 1;
  for (const [clave, entrada] of memoria) if (!entrada.esFirma) memoria.delete(clave);
};

/** Olvida todo. Al cambiar de usuario y al cerrar sesión. */
export const olvidarTodo = () => {
  generacion += 1;
  memoria.clear();
};

/* De la dirección, el recurso: «paseos», «rpc/listar_pagos_dueno»,
   «firma» para una foto firmada. */
const recursoDe = (ruta: string) => {
  if (ruta.startsWith("/storage/v1/object/sign/")) return "firma";
  const rest = ruta.match(/^\/rest\/v1\/(rpc\/)?([a-z_]+)/);
  return rest ? `${rest[1] ?? ""}${rest[2]}` : null;
};

const esEscritura = (metodo: string, ruta: string) => {
  if (ruta.startsWith("/rest/v1/rpc/")) {
    const nombre = ruta.slice("/rest/v1/rpc/".length);
    return !LECTURA_RPC.test(nombre) && !NO_CAMBIAN_NADA.has(nombre);
  }
  if (ruta.startsWith("/rest/v1/")) {
    if (metodo === "GET" || metodo === "HEAD") return false;
    return !ruta.startsWith("/rest/v1/notificaciones");
  }
  if (ruta.startsWith("/storage/v1/object/")) {
    // Firmar y listar leen; subir, reemplazar y borrar escriben.
    return !ruta.startsWith("/storage/v1/object/sign/") && !ruta.startsWith("/storage/v1/object/list/");
  }
  return ruta.startsWith("/functions/v1/");
};

const guardar = async (respuesta: Response): Promise<Guardada> => ({
  status: respuesta.status,
  statusText: respuesta.statusText,
  headers: [...respuesta.headers.entries()],
  cuerpo: await respuesta.arrayBuffer(),
});

const entregar = (guardada: Guardada) =>
  new Response(
    // Algunas respuestas no pueden llevar cuerpo, y un HEAD tampoco trae.
    [204, 205, 304].includes(guardada.status) || guardada.cuerpo.byteLength === 0 ? null : guardada.cuerpo.slice(0),
    { status: guardada.status, statusText: guardada.statusText, headers: guardada.headers },
  );

/** El `fetch` del cliente de Supabase. */
export const fetchConMemoria: typeof fetch = async (entrada, opciones) => {
  const pedido = new Request(entrada, opciones);
  const url = new URL(pedido.url);
  const metodo = pedido.method.toUpperCase();

  if (esEscritura(metodo, url.pathname)) {
    const respuesta = await fetch(pedido);
    // Lo que se recuerde de ahora en más ya ve el cambio. Si la escritura
    // tocó archivos, las firmas también se olvidan.
    if (url.pathname.startsWith("/storage/v1/object/")) olvidarTodo();
    else olvidarDatos();
    return respuesta;
  }

  const recurso = recursoDe(url.pathname);
  const esFirma = recurso === "firma";
  const vigencia = esFirma ? VIGENCIA_FIRMA : recurso ? VIGENCIAS[recurso] : undefined;
  // Leer una función por POST también es leer; cualquier otro POST no se recuerda.
  const recordable = vigencia !== undefined && (metodo === "GET" || metodo === "HEAD" || metodo === "POST");
  if (!recordable) return fetch(pedido);

  const cuerpo = metodo === "GET" || metodo === "HEAD" ? "" : await pedido.clone().text();
  const clave = [
    pedido.headers.get("authorization") ?? "",
    metodo,
    url.pathname + url.search,
    cuerpo,
    // Cambian lo que devuelve la base: una fila o una lista, un rango, el conteo.
    pedido.headers.get("accept") ?? "",
    pedido.headers.get("range") ?? "",
    pedido.headers.get("prefer") ?? "",
  ].join("|");

  const ahora = Date.now();
  const guardada = memoria.get(clave);
  if (guardada && (guardada.vence === 0 || guardada.vence > ahora)) return entregar(await guardada.respuesta);

  const generacionAlSalir = generacion;
  const respuesta = fetch(pedido).then(guardar);
  const nueva: Entrada = { vence: 0, esFirma, respuesta };
  memoria.set(clave, nueva);

  try {
    const lista = await respuesta;
    const sigueVigente = memoria.get(clave) === nueva && generacion === generacionAlSalir;
    // Solo se recuerdan las respuestas buenas; un error se vuelve a intentar.
    if (sigueVigente && lista.status < 400) nueva.vence = Date.now() + vigencia;
    else if (memoria.get(clave) === nueva) memoria.delete(clave);
    return entregar(lista);
  } catch (error) {
    if (memoria.get(clave) === nueva) memoria.delete(clave);
    throw error;
  }
};
