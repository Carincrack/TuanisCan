import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, ChevronRight, Loader, Lock, MessageCircle, PawPrint, Send, Trash2, X } from "../../lib/iconos";
import { useAuth } from "../../hooks/useAuth";
import { useMedia } from "../../hooks/useMedia";
import { useTranslation } from "../../hooks/useTranslation";
import { aviso, motivo } from "../../lib/aviso";
import {
  abrirCanalChat,
  borrarMiChat,
  enlacesDeFotos,
  enviarMensaje,
  listarMensajes,
  listarMisChats,
  marcarChatLeido,
  subirFoto,
  type ChatResumen,
  type Mensaje,
  type TipoMensaje,
} from "../../services/chat.service";
import { Avatar, Confirmar, EmptyState, Page, PageHeader } from "../ui";
import { ArteSticker, Sticker } from "./stickers";
import { CODIGOS_STICKER } from "./codigosSticker";

/* ─────────────────────────────────────────────────────────────
   MENSAJES

   La lista de chats y la conversación. En el teléfono la conversación
   ocupa la pantalla entera —encima de todo, como una app de mensajes—
   y el botón «atrás» del teléfono la cierra, porque abrir un chat es
   navegar (`?chat=<id del paseo>`). En la computadora van lado a lado.

   Un chat se abre cuando empieza el paseo, queda para leer cuando
   termina y se borra a los 7 días con sus fotos (eso lo hace la base).
   Arriba de la conversación, siempre, una franja dice en qué está el
   paseo: en curso (se escribe) o terminado (solo se lee).

   Cada uno puede borrar el chat de su lado; si lo borran los dos, se
   borra de verdad.
   ───────────────────────────────────────────────────────────── */

/** Los emojis del selector: lo que se usa para hablar de un paseo. */
const EMOJIS = [
  "😀", "😂", "🥰", "😍", "😊", "😉", "😅", "🤗",
  "👍", "👏", "🙌", "🙏", "💪", "👋", "👌", "✌️",
  "❤️", "🧡", "💙", "💚", "✨", "⭐", "🔥", "🎉",
  "🐶", "🐕", "🦮", "🐩", "🐾", "🦴", "🐱", "🐈",
  "🏠", "🌳", "🌧️", "☀️", "⛅", "💧", "📍", "⏰",
  "🚶", "🏃", "🎾", "🥏", "🧸", "💩", "✅", "❌",
];

/** Un mensaje de 1 a 3 emojis va grande y sin globo. */
const soloEmojis = (texto: string) =>
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|️|‍|\s)+$/u.test(texto) &&
  [...texto.replace(/\s/g, "")].filter((c) => /\p{Extended_Pictographic}/u.test(c)).length <= 3;

type MensajeVista = Mensaje & { enviando?: boolean };

/** La base guarda cuándo vence el chat: 7 días después de abrirse. */
const SIETE_DIAS = 7 * 86_400_000;

/** Lo que se abre encima de la conversación a pantalla completa del
    teléfono, que ya está en `z-[95]`. */
const CAPA_SOBRE_CHAT = "z-[110]";

/* ── Las palomitas ──
   Solo en los mensajes propios: un reloj mientras sale, una palomita
   cuando llegó a la base y dos, en turquesa, cuando el otro lo vio. */
const Vistos = ({ estado }: { estado: "enviando" | "enviado" | "visto" }) => {
  const { t } = useTranslation();
  const etiqueta = t(estado === "enviando" ? "chat.conv.sending" : estado === "visto" ? "chat.conv.seen" : "chat.conv.sent");
  return (
    <svg
      viewBox="0 0 18 12"
      width="16"
      height="11"
      role="img"
      aria-label={etiqueta}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={estado === "visto" ? "text-accent" : "opacity-75"}
    >
      {estado === "enviando" ? (
        <>
          <circle cx="9" cy="6" r="4.6" />
          <path d="M9 3.6V6l1.6 1.2" />
        </>
      ) : estado === "enviado" ? (
        <path d="m4.5 6.2 2.8 2.8 6-6.2" />
      ) : (
        <>
          <path d="m1.5 6.2 2.8 2.8 6-6.2" />
          <path d="m8.6 8.4.6.6 6-6.2" />
        </>
      )}
    </svg>
  );
};

/** La hora del mensaje y, si es mío, sus palomitas. */
const Pie = ({ m, hora, clase }: { m: MensajeVista; hora: string; clase: string }) => (
  <span className={`nums inline-flex items-center gap-1 text-[10.5px] leading-none whitespace-nowrap ${clase}`}>
    {hora}
    {m.es_mio && <Vistos estado={m.enviando ? "enviando" : m.leido ? "visto" : "enviado"} />}
  </span>
);

/* ── La conversación ─────────────────────────────────────────── */

const Conversacion = ({
  chat,
  miId,
  onCerrar,
  onCambio,
  onBorrado,
  pantallaCompleta,
}: {
  chat: ChatResumen;
  miId: string;
  onCerrar: () => void;
  /** Algo cambió (mensaje nuevo, leídos): la lista se pone al día. */
  onCambio: () => void;
  /** Lo borré de mi lado: se vuelve a la lista. */
  onBorrado: () => void;
  pantallaCompleta: boolean;
}) => {
  const { t, localeTag } = useTranslation();
  const navigate = useNavigate();
  const [mensajes, setMensajes] = useState<MensajeVista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState("");
  const [selector, setSelector] = useState<"cerrado" | "stickers" | "emojis">("cerrado");
  const [escribiendo, setEscribiendo] = useState(false);
  const [enLinea, setEnLinea] = useState(false);
  /* Ruta de cada foto -> dirección para verla. Las ajenas, enlaces
     firmados; las propias recién mandadas, la foto local, que ya está
     en el teléfono y no hace falta bajar. */
  const [enlaces, setEnlaces] = useState<Record<string, string>>({});
  const [fotoAbierta, setFotoAbierta] = useState<MensajeVista | null>(null);
  const [preguntarBorrar, setPreguntarBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const entradaFoto = useRef<HTMLInputElement>(null);
  const canal = useRef<ReturnType<typeof abrirCanalChat> | null>(null);
  const ultimoAvisoEscribiendo = useRef(0);
  const finEscribiendo = useRef<number | undefined>(undefined);
  const pegadoAbajo = useRef(true);
  const pidiendo = useRef(new Set<string>());
  const locales = useRef<string[]>([]);
  const onCambioRef = useRef(onCambio);
  useEffect(() => {
    onCambioRef.current = onCambio;
  });

  const abierto = chat.abierto;
  const tactil = useMedia("(pointer: coarse)");

  /* Agrega o reemplaza un mensaje sin repetirlo. El propio llega dos
     veces —la respuesta de enviar y el tiempo real— y mientras tanto
     hay uno provisorio «enviando» con el mismo contenido. */
  const incorporar = useCallback((nuevo: Mensaje) => {
    setMensajes((actuales) => {
      if (actuales.some((m) => m.id_mensaje === nuevo.id_mensaje)) {
        return actuales.map((m) => (m.id_mensaje === nuevo.id_mensaje ? { ...m, ...nuevo, enviando: false } : m));
      }
      const provisorio = nuevo.es_mio
        ? actuales.findIndex((m) => m.enviando && m.tipo === nuevo.tipo && m.contenido === nuevo.contenido)
        : -1;
      if (provisorio >= 0) {
        const copia = [...actuales];
        copia[provisorio] = nuevo;
        return copia;
      }
      return [...actuales, nuevo];
    });
  }, []);

  const marcarLeido = useCallback(() => {
    void marcarChatLeido(chat.id_paseo).then(() => onCambioRef.current()).catch(() => undefined);
  }, [chat.id_paseo]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setMensajes([]);
    listarMensajes(chat.id_paseo)
      .then((lista) => {
        if (!vigente) return;
        setMensajes(lista);
        marcarLeido();
      })
      .catch((causa) => aviso.error(causa, { respaldo: t("chat.conv.loadFailed") }))
      .finally(() => vigente && setCargando(false));

    canal.current = abrirCanalChat(chat.id_paseo, miId, {
      alLlegar: (nuevo) => {
        incorporar(nuevo);
        if (!nuevo.es_mio) {
          setEscribiendo(false);
          marcarLeido();
        }
      },
      alActualizar: (cambiado) => incorporar(cambiado),
      alEscribir: () => {
        setEscribiendo(true);
        window.clearTimeout(finEscribiendo.current);
        finEscribiendo.current = window.setTimeout(() => setEscribiendo(false), 3500);
      },
      alCambiarPresencia: setEnLinea,
    });

    return () => {
      vigente = false;
      canal.current?.cerrar();
      canal.current = null;
      window.clearTimeout(finEscribiendo.current);
    };
  }, [chat.id_paseo, miId, incorporar, marcarLeido, t]);

  // Las fotos locales se sueltan al cerrar el chat.
  useEffect(() => {
    const propias = locales.current;
    return () => propias.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  /* Los enlaces de las fotos que todavía no tienen, todos de una vez. */
  useEffect(() => {
    const faltan = mensajes
      .filter((m) => m.tipo === "foto" && !m.enviando && !enlaces[m.contenido] && !pidiendo.current.has(m.contenido))
      .map((m) => m.contenido);
    if (!faltan.length) return;
    faltan.forEach((ruta) => pidiendo.current.add(ruta));
    enlacesDeFotos(faltan)
      .then((nuevos) => setEnlaces((actuales) => ({ ...actuales, ...nuevos })))
      .catch(() => undefined)
      .finally(() => faltan.forEach((ruta) => pidiendo.current.delete(ruta)));
  }, [mensajes, enlaces]);

  /* Bajar al último mensaje cuando llega uno y la persona estaba abajo
     (si subió a leer algo viejo, no se la arrastra). */
  const bajar = useCallback(() => {
    const el = caja.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    if (pegadoAbajo.current || mensajes.at(-1)?.es_mio) bajar();
  }, [mensajes, escribiendo, bajar]);

  const alDesplazar = () => {
    const el = caja.current;
    if (el) pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Escape cierra la foto abierta.
  useEffect(() => {
    if (!fotoAbierta) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setFotoAbierta(null);
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [fotoAbierta]);

  const reemplazarProvisorio = (idProvisorio: string, guardado: Mensaje) =>
    setMensajes((actuales) =>
      actuales.some((m) => m.id_mensaje === guardado.id_mensaje)
        ? actuales.filter((m) => m.id_mensaje !== idProvisorio)
        : actuales.map((m) => (m.id_mensaje === idProvisorio ? guardado : m)),
    );

  const mandar = async (contenido: string, tipo: TipoMensaje) => {
    const limpio = tipo === "texto" ? contenido.trim() : contenido;
    if (!limpio || !abierto) return;
    const provisorio: MensajeVista = {
      id_mensaje: `tmp-${Date.now()}`,
      es_mio: true,
      tipo,
      contenido: limpio,
      leido: false,
      fecha_envio: new Date().toISOString(),
      enviando: true,
    };
    setMensajes((actuales) => [...actuales, provisorio]);
    if (tipo === "texto") setTexto("");
    try {
      reemplazarProvisorio(provisorio.id_mensaje, await enviarMensaje(chat.id_paseo, limpio, tipo));
      onCambioRef.current();
    } catch (causa) {
      setMensajes((actuales) => actuales.filter((m) => m.id_mensaje !== provisorio.id_mensaje));
      if (tipo === "texto") setTexto(limpio);
      aviso.error(causa, { respaldo: t("chat.conv.sendFailed") });
    }
  };

  /* La foto aparece al instante con la copia local y un indicador
     encima; mientras, se achica, se sube y se manda. */
  const mandarFoto = async (archivo: File) => {
    if (!abierto) return;
    if (!archivo.type.startsWith("image/")) {
      aviso.ojo(t("chat.conv.notAnImage"));
      return;
    }
    const id = `tmp-${Date.now()}`;
    const clave = `local-${id}`;
    const local = URL.createObjectURL(archivo);
    locales.current.push(local);
    setEnlaces((actuales) => ({ ...actuales, [clave]: local }));
    setMensajes((actuales) => [
      ...actuales,
      { id_mensaje: id, es_mio: true, tipo: "foto", contenido: clave, leido: false, fecha_envio: new Date().toISOString(), enviando: true },
    ]);
    try {
      const ruta = await subirFoto(chat.id_paseo, archivo);
      setEnlaces((actuales) => ({ ...actuales, [ruta]: local }));
      setMensajes((actuales) => actuales.map((m) => (m.id_mensaje === id ? { ...m, contenido: ruta } : m)));
      reemplazarProvisorio(id, await enviarMensaje(chat.id_paseo, ruta, "foto"));
      onCambioRef.current();
    } catch (causa) {
      setMensajes((actuales) => actuales.filter((m) => m.id_mensaje !== id));
      aviso.error(causa, { respaldo: t("chat.conv.photoFailed") });
    }
  };

  const alEscribirTexto = (valor: string) => {
    setTexto(valor);
    const ahora = Date.now();
    if (valor && ahora - ultimoAvisoEscribiendo.current > 1500) {
      ultimoAvisoEscribiendo.current = ahora;
      canal.current?.avisarEscribiendo();
    }
  };

  const borrar = async () => {
    setBorrando(true);
    try {
      const ambos = await borrarMiChat(chat.id_paseo);
      aviso.ok(t(ambos ? "chat.conv.deletedBoth" : "chat.conv.deleted"));
      setPreguntarBorrar(false);
      onBorrado();
    } catch (causa) {
      aviso.error(causa, { respaldo: t("chat.conv.deleteFailed") });
    } finally {
      setBorrando(false);
    }
  };

  // El campo crece con el texto, hasta cinco renglones.
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [texto]);

  const hora = (valor: string | Date) => new Intl.DateTimeFormat(localeTag, { hour: "numeric", minute: "2-digit" }).format(new Date(valor));
  const dia = (valor: string) => {
    const fecha = new Date(valor);
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);
    if (fecha.toDateString() === hoy.toDateString()) return t("chat.conv.today");
    if (fecha.toDateString() === ayer.toDateString()) return t("chat.conv.yesterday");
    return new Intl.DateTimeFormat(localeTag, { weekday: "long", day: "numeric", month: "long" }).format(fecha);
  };
  const vence = useVence();
  const desde = new Date(new Date(chat.vence_en).getTime() - SIETE_DIAS);
  const irAlPaseo = () => void navigate({ to: chat.soy === "paseador" ? "/p/paseo-activo" : "/paseo-en-vivo" });

  const estadoPersona = escribiendo
    ? { texto: t("chat.conv.typing"), clase: "text-accent-dark" }
    : enLinea
      ? { texto: t("chat.conv.online"), clase: "text-ok" }
      : null;

  const globo = (m: MensajeVista, cierraGrupo: boolean) => {
    const mio = m.es_mio;
    const cola = cierraGrupo ? (mio ? "rounded-br-[6px]" : "rounded-bl-[6px]") : "";

    if (m.tipo === "sticker") {
      return (
        <Sticker
          codigo={m.contenido}
          mio={mio}
          pie={<Pie m={m} hora={hora(m.fecha_envio)} clase={`mt-1 ${mio ? "text-white/70" : "text-ink-mute"}`} />}
        />
      );
    }

    if (m.tipo === "foto") {
      const url = enlaces[m.contenido];
      return (
        <button
          type="button"
          onClick={() => setFotoAbierta(m)}
          disabled={m.enviando || !url}
          aria-label={mio ? t("chat.conv.yourPhoto") : t("chat.conv.photoFrom", { nombre: chat.otra_persona })}
          className={`relative block overflow-hidden rounded-[20px] p-1 transition-transform duration-150 active:scale-[0.98] ${
            mio ? "bg-rail" : "bg-surface shadow-sm"
          } ${cola}`}
        >
          {url ? (
            <img
              src={url}
              alt=""
              onLoad={() => pegadoAbajo.current && bajar()}
              className="block max-h-[340px] min-h-[120px] w-[228px] rounded-[16px] bg-sunken object-cover sm:w-[260px]"
            />
          ) : (
            <span className="grid h-[220px] w-[228px] place-items-center rounded-[16px] bg-sunken text-ink-mute sm:w-[260px]">
              <Loader size={20} className="animate-spin" />
            </span>
          )}
          {m.enviando && (
            <span className="absolute inset-1 grid place-items-center rounded-[16px] bg-black/30 text-white">
              <Loader size={22} className="animate-spin" />
            </span>
          )}
          <span className="absolute right-2.5 bottom-2.5 rounded-full bg-black/45 px-2 py-1 backdrop-blur-[2px]">
            <Pie m={m} hora={hora(m.fecha_envio)} clase="text-white" />
          </span>
        </button>
      );
    }

    if (soloEmojis(m.contenido)) {
      return (
        <div className={`flex flex-col ${mio ? "items-end" : "items-start"} ${m.enviando ? "opacity-60" : ""}`}>
          <p className="text-[40px] leading-tight">{m.contenido}</p>
          <Pie m={m} hora={hora(m.fecha_envio)} clase="px-1 text-ink-mute" />
        </div>
      );
    }

    /* La hora va dentro del globo, abajo a la derecha. Para que el
       texto no se le meta debajo, el final del texto lleva una copia
       invisible del mismo pie: ocupa justo su ancho. */
    const pie = (clase: string) => <Pie m={m} hora={hora(m.fecha_envio)} clase={clase} />;
    return (
      <div
        className={`relative max-w-[84%] rounded-[20px] px-3.5 py-2 text-[14.5px] leading-snug sm:max-w-[70%] ${
          mio ? "bg-rail text-white" : "bg-surface text-ink shadow-sm"
        } ${cola}`}
      >
        <span className="break-words whitespace-pre-wrap">{m.contenido}</span>
        <span aria-hidden className="invisible ml-2 inline-block">{pie("")}</span>
        <span className="absolute right-3 bottom-1.5">{pie(mio ? "text-white/65" : "text-ink-mute")}</span>
      </div>
    );
  };

  const cuerpo = (
    <div className={`flex h-full min-h-0 flex-col bg-canvas ${pantallaCompleta ? "" : "overflow-hidden rounded-[22px]"}`}>
      {/* ── Encabezado ── */}
      <header
        className="flex shrink-0 items-center gap-3 bg-surface px-3 py-2.5"
        style={pantallaCompleta ? { paddingTop: "max(10px, env(safe-area-inset-top))" } : undefined}
      >
        {pantallaCompleta && (
          <button
            type="button"
            onClick={onCerrar}
            aria-label={t("chat.conv.back")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-rail transition-transform duration-150 hover:bg-sunken active:scale-[0.94]"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <span className="relative">
          <Avatar nombre={chat.otra_persona} size={40} />
          {enLinea && <span aria-hidden className="absolute right-0 bottom-0 h-3 w-3 rounded-full bg-ok ring-2 ring-surface" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{chat.otra_persona}</p>
          <p className="truncate text-[12px]" aria-live="polite">
            <span className="text-ink-soft">{chat.mascota}</span>
            {estadoPersona && (
              <>
                <span className="text-ink-mute"> · </span>
                <span className={estadoPersona.clase}>{estadoPersona.texto}</span>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPreguntarBorrar(true)}
          aria-label={t("chat.conv.delete")}
          title={t("chat.conv.delete")}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition-[background-color,color,transform] duration-150 hover:bg-danger-wash hover:text-danger active:scale-[0.94]"
        >
          <Trash2 size={18} />
        </button>
      </header>

      {/* ── En qué está el paseo ── */}
      {abierto ? (
        <div role="status" className="flex shrink-0 items-center gap-2 bg-accent-wash py-1.5 pr-2 pl-4 text-[12.5px] text-accent-deep">
          <span aria-hidden className="relative grid h-2.5 w-2.5 shrink-0 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="font-semibold">{t("chat.conv.statusLive")}</span>
          <span className="nums truncate text-accent-dark">· {t("chat.conv.statusSince", { hora: hora(desde) })}</span>
          <button
            type="button"
            onClick={irAlPaseo}
            className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1.5 font-semibold transition-colors duration-150 hover:bg-white/60"
          >
            {t(chat.soy === "paseador" ? "chat.conv.goToWalk" : "chat.conv.viewMap")}
            <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        <div role="status" className="flex shrink-0 items-center gap-2 border-y border-sunken bg-surface px-4 py-2 text-[12.5px] text-ink-soft">
          <Lock size={13} className="shrink-0 text-ink-mute" />
          <span className="font-semibold text-ink">{t("chat.conv.statusDone")}</span>
          <span className="truncate">· {t("chat.conv.readOnly")}</span>
        </div>
      )}

      {/* ── Los mensajes ── */}
      <div ref={caja} onScroll={alDesplazar} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5">
        {cargando ? (
          <div className="grid h-full place-items-center text-ink-mute">
            <Loader size={20} className="animate-spin" />
          </div>
        ) : mensajes.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-wash text-accent-dark">
                <PawPrint size={24} />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-ink">{t("chat.conv.emptyTitle", { nombre: chat.otra_persona })}</p>
              <p className="mt-1 text-[12.5px] text-ink-soft">{abierto ? t("chat.conv.emptyHint") : t("chat.conv.emptyClosed")}</p>
            </div>
          </div>
        ) : (
          <ol className="flex flex-col">
            {mensajes.map((m, i) => {
              const anterior = mensajes[i - 1];
              const siguiente = mensajes[i + 1];
              const nuevoDia = !anterior || new Date(anterior.fecha_envio).toDateString() !== new Date(m.fecha_envio).toDateString();
              const mismoGrupo = (a?: MensajeVista) =>
                a && a.es_mio === m.es_mio && Math.abs(new Date(a.fecha_envio).getTime() - new Date(m.fecha_envio).getTime()) < 180_000;
              const cierraGrupo =
                !mismoGrupo(siguiente) ||
                (siguiente && new Date(siguiente.fecha_envio).toDateString() !== new Date(m.fecha_envio).toDateString());

              return (
                <li key={m.id_mensaje} className={`flex flex-col ${m.es_mio ? "items-end" : "items-start"} ${mismoGrupo(anterior) && !nuevoDia ? "mt-1" : "mt-3"}`}>
                  {nuevoDia && (
                    <span className="mx-auto my-3 rounded-full bg-sunken px-3 py-1 text-[11px] font-semibold text-ink-soft first-letter:uppercase">
                      {dia(m.fecha_envio)}
                    </span>
                  )}
                  {globo(m, Boolean(cierraGrupo))}
                </li>
              );
            })}
            {escribiendo && (
              <li className="mt-3 flex items-start" aria-hidden>
                <span className="inline-flex items-center gap-1 rounded-[20px] rounded-bl-[6px] bg-surface px-4 py-3 shadow-sm">
                  {[0, 1, 2].map((p) => (
                    <span
                      key={p}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-mute motion-reduce:animate-none"
                      style={{ animationDelay: `${p * 120}ms` }}
                    />
                  ))}
                </span>
              </li>
            )}
          </ol>
        )}
      </div>

      {/* ── Escribir, o el aviso de que ya no se puede ── */}
      {abierto ? (
        <div
          className="shrink-0 border-t border-sunken bg-surface px-2.5 pt-2 sm:px-3"
          style={{ paddingBottom: pantallaCompleta ? "max(10px, env(safe-area-inset-bottom))" : "10px" }}
        >
          {selector !== "cerrado" && (
            <div className="mb-2 rounded-[18px] bg-sunken p-2">
              <div role="tablist" className="mb-2 flex gap-1">
                {(["stickers", "emojis"] as const).map((pestana) => (
                  <button
                    key={pestana}
                    type="button"
                    role="tab"
                    aria-selected={selector === pestana}
                    onClick={() => setSelector(pestana)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 ${
                      selector === pestana ? "bg-rail text-white" : "text-ink-soft hover:bg-white/70"
                    }`}
                  >
                    {t(pestana === "stickers" ? "chat.conv.tabStickers" : "chat.conv.tabEmojis")}
                  </button>
                ))}
              </div>
              {selector === "stickers" ? (
                <div className="grid max-h-[232px] grid-cols-4 gap-1 overflow-y-auto">
                  {CODIGOS_STICKER.map((codigo) => (
                    <button
                      key={codigo}
                      type="button"
                      onClick={() => {
                        setSelector("cerrado");
                        void mandar(codigo, "sticker");
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-[16px] px-1 py-2 transition-[background-color,transform] duration-150 hover:bg-white/70 active:scale-[0.95]"
                    >
                      <ArteSticker codigo={codigo} tamano={48} />
                      <span className="line-clamp-2 text-center text-[11px] leading-tight font-semibold text-ink-soft">
                        {t(`chat.stickers.${codigo}`)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid max-h-[200px] grid-cols-8 gap-0.5 overflow-y-auto">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setTexto((actual) => actual + emoji);
                        campo.current?.focus();
                      }}
                      className="grid h-10 place-items-center rounded-[12px] text-[22px] transition-transform duration-150 hover:bg-white/70 active:scale-[0.9]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <form
            className="flex items-end gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              void mandar(texto, "texto");
            }}
          >
            <input
              ref={entradaFoto}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                e.target.value = "";
                if (archivo) void mandarFoto(archivo);
              }}
            />
            <button
              type="button"
              onClick={() => entradaFoto.current?.click()}
              aria-label={t("chat.conv.attachPhoto")}
              title={t("chat.conv.attachPhoto")}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft transition-[background-color,transform] duration-150 hover:bg-sunken active:scale-[0.94]"
            >
              <Camera size={21} />
            </button>
            <div className="relative min-w-0 flex-1">
              <textarea
                ref={campo}
                rows={1}
                value={texto}
                maxLength={1000}
                onChange={(e) => alEscribirTexto(e.target.value)}
                onFocus={() => setSelector("cerrado")}
                onKeyDown={(e) => {
                  // En la computadora, Enter manda y Mayús+Enter baja de renglón.
                  if (!tactil && e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void mandar(texto, "texto");
                  }
                }}
                placeholder={t("chat.conv.placeholder")}
                aria-label={t("chat.conv.placeholder")}
                /* 16 px en el teléfono: con menos, el iPhone agranda la
                   pantalla cada vez que se toca el campo. */
                className="block max-h-32 min-h-11 w-full resize-none rounded-[22px] bg-sunken py-2.5 pr-12 pl-4 text-[16px] leading-snug text-ink placeholder:text-ink-mute focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-accent sm:text-[14.5px]"
              />
              <button
                type="button"
                onClick={() => setSelector((s) => (s === "cerrado" ? "stickers" : "cerrado"))}
                aria-label={t("chat.conv.openPicker")}
                aria-expanded={selector !== "cerrado"}
                className={`absolute right-1 bottom-1 grid h-9 w-9 place-items-center rounded-full transition-colors duration-150 ${
                  selector !== "cerrado" ? "bg-accent-wash text-accent-dark" : "text-ink-soft hover:bg-white"
                }`}
              >
                <PawPrint size={19} />
              </button>
            </div>
            <button
              type="submit"
              disabled={!texto.trim()}
              aria-label={t("chat.conv.send")}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-white transition-[transform,opacity] duration-150 active:scale-[0.94] disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <div
          className="flex shrink-0 items-center justify-center gap-2 border-t border-sunken bg-surface px-4 py-3 text-center text-[12.5px] text-ink-soft"
          style={{ paddingBottom: pantallaCompleta ? "max(12px, env(safe-area-inset-bottom))" : "12px" }}
        >
          <Lock size={14} className="shrink-0 text-ink-mute" />
          <p>{t("chat.conv.lockedHint", { cuando: vence(chat.vence_en) })}</p>
        </div>
      )}
    </div>
  );

  const extras = (
    <>
      {preguntarBorrar && (
        <Confirmar
          capa={CAPA_SOBRE_CHAT}
          titulo={t("chat.conv.deleteTitle")}
          cuerpo={t("chat.conv.deleteBody", { nombre: chat.otra_persona })}
          confirmar={t("chat.conv.deleteConfirm")}
          tono="peligro"
          ocupado={borrando}
          onConfirmar={() => void borrar()}
          onCancelar={() => setPreguntarBorrar(false)}
        />
      )}
      {fotoAbierta &&
        enlaces[fotoAbierta.contenido] &&
        createPortal(
          <div
            className="anim-fade fixed inset-0 z-[120] flex flex-col bg-[#0b161d]"
            role="dialog"
            aria-modal="true"
            aria-label={fotoAbierta.es_mio ? t("chat.conv.yourPhoto") : t("chat.conv.photoFrom", { nombre: chat.otra_persona })}
          >
            <div
              className="flex shrink-0 items-center gap-3 px-4 py-3 text-white"
              style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">
                  {fotoAbierta.es_mio ? t("chat.conv.yourPhoto") : t("chat.conv.photoFrom", { nombre: chat.otra_persona })}
                </p>
                <p className="nums text-[12px] text-white/60 first-letter:uppercase">
                  {dia(fotoAbierta.fecha_envio)} · {hora(fotoAbierta.fecha_envio)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFotoAbierta(null)}
                aria-label={t("chat.conv.closePhoto")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors duration-150 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFotoAbierta(null)}
              aria-label={t("chat.conv.closePhoto")}
              className="flex min-h-0 flex-1 items-center justify-center p-3"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <img src={enlaces[fotoAbierta.contenido]} alt="" className="max-h-full max-w-full rounded-[12px] object-contain" />
            </button>
          </div>,
          document.body,
        )}
    </>
  );

  if (!pantallaCompleta) {
    return (
      <>
        {cuerpo}
        {extras}
      </>
    );
  }

  /* En el teléfono, encima de todo: la barra del armazón, el menú y la
     franja de verificación no tienen nada que hacer mientras se chatea. */
  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[95] flex flex-col bg-canvas" role="dialog" aria-modal="true" aria-label={chat.otra_persona}>
          {cuerpo}
        </div>,
        document.body,
      )}
      {extras}
    </>
  );
};

/** «en 6 días», «mañana», «en 3 horas». */
const useVence = () => {
  const { localeTag } = useTranslation();
  return (fecha: string) => {
    const faltan = new Date(fecha).getTime() - Date.now();
    const relativo = new Intl.RelativeTimeFormat(localeTag, { numeric: "auto" });
    if (faltan < 36 * 3_600_000) return relativo.format(Math.max(1, Math.round(faltan / 3_600_000)), "hour");
    return relativo.format(Math.round(faltan / 86_400_000), "day");
  };
};

/* ── La pantalla ─────────────────────────────────────────────── */

const Mensajes = ({ rol }: { rol: "dueno" | "paseador" }) => {
  const { t, localeTag } = useTranslation();
  const { user } = useAuth();
  const miId = user?.id ?? "";
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const esAncha = useMedia("(min-width: 768px)");
  const [chats, setChats] = useState<ChatResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const vence = useVence();

  const chatId = typeof (search as Record<string, unknown>).chat === "string" ? String((search as Record<string, unknown>).chat) : null;

  const cargar = useCallback(async () => {
    try {
      const todos = await listarMisChats();
      // Cada lado ve sus chats: los del dueño en Mensajes, los del paseador en su Mensajes.
      setChats(todos.filter((c) => c.soy === rol));
      setError("");
    } catch (causa) {
      setError(motivo(causa, t("chat.loadFailed")));
    } finally {
      setCargando(false);
    }
  }, [rol, t]);

  useEffect(() => {
    void cargar();
    const alLlegar = () => void cargar();
    window.addEventListener("tuaniscan:mensaje", alLlegar);
    return () => window.removeEventListener("tuaniscan:mensaje", alLlegar);
  }, [cargar]);

  const elegido = useMemo(() => chats.find((c) => c.id_paseo === chatId) ?? null, [chats, chatId]);
  const abrir = (id: string) => void navigate({ href: `${pathname}?chat=${id}` });
  const cerrar = () => void navigate({ href: pathname });
  const alBorrar = (id: string) => {
    setChats((actuales) => actuales.filter((c) => c.id_paseo !== id));
    cerrar();
    void cargar();
  };

  const vistaPrevia = (c: ChatResumen): ReactNode => {
    if (!c.ultimo_contenido) return t("chat.list.noMessages");
    const quien = c.ultimo_es_mio ? t("chat.list.you") : "";
    if (c.ultimo_tipo === "foto") {
      return (
        <span className="inline-flex items-center gap-1">
          {quien}
          <Camera size={13} /> {t("chat.list.photo")}
        </span>
      );
    }
    if (c.ultimo_tipo === "sticker") return `${quien}${t(`chat.stickers.${c.ultimo_contenido}`)}`;
    return `${quien}${c.ultimo_contenido}`;
  };
  const cuandoCorto = (valor: string | null) => {
    if (!valor) return "";
    const fecha = new Date(valor);
    return fecha.toDateString() === new Date().toDateString()
      ? new Intl.DateTimeFormat(localeTag, { hour: "numeric", minute: "2-digit" }).format(fecha)
      : new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(fecha);
  };

  const lista = (
    <div className="flex min-h-0 flex-col">
      {cargando ? (
        <div className="flex items-center gap-2 px-4 py-10 text-[13px] text-ink-soft">
          <Loader size={16} className="animate-spin" /> {t("chat.loading")}
        </div>
      ) : error ? (
        <p role="alert" className="rounded-[14px] bg-danger-wash px-4 py-3 text-[13px] text-danger">{error}</p>
      ) : chats.length === 0 ? (
        <EmptyState title={t("chat.empty.title")} hint={t(rol === "paseador" ? "chat.empty.hintWalker" : "chat.empty.hintOwner")} />
      ) : (
        <ul className="flex flex-col gap-1">
          {chats.map((c) => (
            <li key={c.id_paseo}>
              <button
                type="button"
                onClick={() => abrir(c.id_paseo)}
                aria-current={c.id_paseo === chatId ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors duration-150 ${
                  c.id_paseo === chatId ? "bg-accent-wash/70" : "hover:bg-sunken"
                }`}
              >
                <span className="relative shrink-0">
                  <Avatar nombre={c.otra_persona} size={46} />
                  {!c.abierto && (
                    <span aria-hidden className="absolute -right-0.5 -bottom-0.5 grid h-5 w-5 place-items-center rounded-full bg-surface text-ink-mute shadow-sm">
                      <Lock size={10} />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-semibold text-ink">{c.otra_persona}</span>
                    <span className="nums shrink-0 text-[11px] text-ink-mute">{cuandoCorto(c.ultimo_en)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px]">
                    {c.abierto ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-wash px-2 py-0.5 font-semibold text-accent-deep">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {t("chat.list.open")}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 font-semibold text-ink-soft">{t("chat.list.done")}</span>
                    )}
                    <span className="truncate text-ink-mute">
                      {c.mascota}
                      {!c.abierto && ` · ${t("chat.list.deletes", { cuando: vence(c.vence_en) })}`}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className={`truncate text-[12.5px] ${c.sin_leer > 0 ? "font-semibold text-ink" : "text-ink-soft"}`}>
                      {vistaPrevia(c)}
                    </span>
                    {c.sin_leer > 0 && (
                      <span className="nums grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                        {c.sin_leer}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const conversacion = (pantallaCompleta: boolean) =>
    elegido && (
      <Conversacion
        key={elegido.id_paseo}
        chat={elegido}
        miId={miId}
        onCerrar={cerrar}
        onCambio={() => void cargar()}
        onBorrado={() => alBorrar(elegido.id_paseo)}
        pantallaCompleta={pantallaCompleta}
      />
    );

  return (
    <Page wide={esAncha}>
      <PageHeader title={t("chat.title")} subtitle={t("chat.subtitle")} />
      {esAncha ? (
        <div className="grid min-h-0 grid-cols-[minmax(280px,340px)_1fr] gap-3" style={{ height: "calc(100dvh - 210px)", minHeight: 460 }}>
          <div className="min-h-0 overflow-y-auto rounded-[22px] bg-surface p-2">{lista}</div>
          {conversacion(false) || (
            <div className="grid place-items-center rounded-[22px] bg-surface px-6 text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sunken text-ink-mute">
                  <MessageCircle size={24} />
                </span>
                <p className="mt-3 text-[13.5px] text-ink-soft">{t("chat.selectChat")}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-[22px] bg-surface p-2">{lista}</div>
          {conversacion(true)}
        </>
      )}
      <p className="px-1 text-[11.5px] text-ink-mute">{t("chat.footnote")}</p>
    </Page>
  );
};

export const MensajesDueno = () => <Mensajes rol="dueno" />;
export const MensajesPaseador = () => <Mensajes rol="paseador" />;
