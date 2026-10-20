import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import { aviso, motivo } from "../lib/aviso";
import { guardarResena, paseoPorResenar } from "../services/resenas.service";
import type { WalkWithRelations } from "../services/walks.service";
import { Avatar, Dialog, btnPrimary, btnSecondary } from "./ui";

/* ─────────────────────────────────────────────────────────────
   LA RESEÑA AL TERMINAR EL PASEO

   Cuando el paseador finaliza, al dueño le llegaban dos avisos
   seguidos —«el paseo terminó, deja tu reseña» y «se cobraron
   ₡…»— y había que ir a buscar la pantalla de Reseñas. Ahora, en vez
   de los dos avisos, aparece esta ventana: el cobro arriba, las
   estrellas y un comentario, y dos salidas claras: «Enviar reseña» o
   «Más tarde» (queda pendiente en Reseñas, como siempre).

   La abre `AppShell` cuando llega la notificación de fin de paseo. Si
   el paseo ya tenía reseña —se dejó desde otro teléfono, por
   ejemplo— no aparece, y `onCerrar(false)` le avisa al armazón para
   que muestre el cobro como aviso normal.

   Va en `z-[110]`: el dueño puede estar chateando a pantalla completa
   (`z-[95]`) justo cuando el paseo termina.
   ───────────────────────────────────────────────────────────── */

/* La estrella de Lucide, dibujada acá: la del módulo de íconos es de
   trazo animado y no se deja rellenar, y una estrella elegida tiene que
   verse llena. */
const Estrella = ({ llena }: { llena: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="30"
    height="30"
    aria-hidden
    fill={llena ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinejoin="round"
    className={`transition-colors duration-150 ${llena ? "text-warn" : "text-ink-mute/50"}`}
  >
    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
  </svg>
);

export const ResenaAlTerminar = ({
  idPaseo,
  cobro,
  onCerrar,
}: {
  idPaseo: string;
  /** El mensaje del cobro («Se cobraron ₡5 000 por el paseo de Toby.»), si llegó. */
  cobro: string | null;
  /** `seMostro` es false si la ventana no llegó a abrirse. */
  onCerrar: (seMostro: boolean) => void;
}) => {
  const { t, localeTag } = useTranslation();
  const { user } = useAuth();
  const [paseo, setPaseo] = useState<WalkWithRelations | null>(null);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  });

  useEffect(() => {
    if (!user) return;
    let vigente = true;
    paseoPorResenar(idPaseo, user.id)
      .then((encontrado) => {
        if (!vigente) return;
        if (encontrado?.id_paseador) setPaseo(encontrado);
        else cerrar.current(false);
      })
      .catch(() => vigente && cerrar.current(false));
    return () => {
      vigente = false;
    };
  }, [idPaseo, user]);

  if (!paseo) return null;

  const paseador = paseo.paseador?.nombre || t("resenas.defaultWalker");
  const mascota = paseo.mascota?.nombre ?? t("resenas.defaultPet");
  const termino = paseo.hora_fin
    ? new Intl.DateTimeFormat(localeTag, { hour: "numeric", minute: "2-digit" }).format(new Date(`${paseo.fecha}T${paseo.hora_fin}`))
    : null;
  const niveles = [1, 2, 3, 4, 5].map((n) => t(`resenas.alTerminar.levels.${n}`));

  const enviar = async () => {
    if (!user || !paseo.id_paseador || !estrellas) return;
    setGuardando(true);
    setError("");
    try {
      await guardarResena({
        id_paseo: paseo.id_paseo,
        id_autor: user.id,
        id_receptor: paseo.id_paseador,
        calificacion: estrellas,
        comentario,
      });
      aviso.ok(t("resenas.alTerminar.thanks"));
      cerrar.current(true);
    } catch (causa) {
      setError(motivo(causa, t("resenas.errors.saveFailed")));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog
      title={t("resenas.alTerminar.title")}
      ancho="max-w-[440px]"
      capa="z-[110]"
      onClose={() => {
        if (!guardando) cerrar.current(true);
      }}
    >
      <div className="px-5 py-5 sm:px-6">
        {/* El paseo */}
        <div className="flex items-center gap-3">
          <Avatar nombre={paseador} size={48} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">{paseador}</p>
            <p className="text-[12.5px] text-ink-soft">
              {t("resenas.walkOf", { mascota })}
              {termino && ` · ${t("resenas.alTerminar.endedAt", { hora: termino })}`}
            </p>
          </div>
        </div>

        {/* El cobro, que antes era otro aviso */}
        {cobro && (
          <p className="mt-4 flex items-start gap-2 rounded-[14px] bg-ok-wash px-3.5 py-2.5 text-[12.5px] text-ok">
            <CheckCircle2 size={16} className="mt-px shrink-0" />
            <span>{cobro}</span>
          </p>
        )}

        {/* Las estrellas */}
        <p className="mt-5 text-[13.5px] font-semibold text-ink">{t("resenas.alTerminar.question", { walker: paseador.split(" ")[0] })}</p>
        <div role="radiogroup" aria-label={t("resenas.dialog.aria")} className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={estrellas === n}
              aria-label={t("resenas.rateWithStarsAria", { n })}
              onClick={() => setEstrellas(n)}
              className="grid h-11 w-11 place-items-center rounded-full transition-transform duration-150 hover:bg-gold-wash active:scale-[0.9]"
            >
              <Estrella llena={n <= estrellas} />
            </button>
          ))}
          <span className="ml-2 text-[13px] font-semibold text-ink-soft" aria-live="polite">
            {estrellas ? niveles[estrellas - 1] : t("resenas.alTerminar.tapStar")}
          </span>
        </div>

        {/* El comentario */}
        <label className="mt-4 block">
          <span className="sr-only">{t("resenas.dialog.commentLabel")}</span>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder={t("resenas.alTerminar.commentPlaceholder")}
            className="block w-full resize-none rounded-[14px] bg-sunken px-3.5 py-2.5 text-[16px] leading-snug text-ink placeholder:text-ink-mute focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-accent sm:text-[13.5px]"
          />
        </label>

        {error && (
          <p role="alert" className="mt-3 rounded-[12px] bg-danger-wash px-3.5 py-2.5 text-[12.5px] text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={guardando} onClick={() => cerrar.current(true)} className={`${btnSecondary} w-full disabled:opacity-50 sm:w-auto`}>
            {t("resenas.alTerminar.later")}
          </button>
          <button
            type="button"
            disabled={guardando || !estrellas}
            onClick={() => void enviar()}
            className={`${btnPrimary} w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto`}
          >
            {guardando && <Loader size={14} className="animate-spin" />}
            {t(guardando ? "resenas.dialog.saving" : "resenas.alTerminar.send")}
          </button>
        </div>
        <p className="mt-3 text-center text-[11.5px] text-ink-mute sm:text-right">{t("resenas.alTerminar.laterHint")}</p>
      </div>
    </Dialog>
  );
};
