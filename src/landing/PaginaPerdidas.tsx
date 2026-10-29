import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, Eye, MapPin, User } from "../lib/iconos";
import { MARCA } from "../lib/nav";
import { usePortadaAnimacion } from "./animacion";
import { AZUL, CANVAS, NAVY, TINTA } from "./tokens";
import { useTranslation } from "../hooks/useTranslation";
import { useAuth } from "../hooks/useAuth";
import { listPublicLostPets } from "../services/lost-pets.service";
import type { PublicLostPet } from "../types/lost-pet.types";
import { distritoDe, normalizar } from "../lib/zonas";
import { Badge, EmptyState, btnPrimary, btnSecondary } from "../components/ui";

/* ─────────────────────────────────────────────────────────────
   Mascotas perdidas, del lado público.

   Se llega desde el tercer público del hero —«Ver mascotas
   perdidas»— y no pide cuenta: mirar el tablero no debería costar
   un registro. Por eso vive en la portada y no en la aplicación, y
   por eso `RootLayout` la deja pasar sin el guardia de sesión.

   Arriba lleva la banda de la portada —mismo azul, mismo símbolo
   centrado, misma letra del wordmark— para que el clic se sienta
   como seguir en el mismo lugar y no como salir a otra app. Abajo,
   el lugar donde va a ir el tablero.

   No es `/mascotas-perdidas`: esa ruta ya existe y es la pantalla
   interna, con sesión, donde se reporta y se administra. Esta es
   la vitrina.

   La entrada es la misma línea de tiempo del hero de la portada:
   `usePortadaAnimacion` busca las marcas —`data-anim="marca"` con
   sus `.letra`, `data-entra="barra"` y `data-entra="entrada"`— y
   les da el mismo orden y la misma curva. Cada renglón del título es
   su propia máscara, así las letras de «PERDIDAS» suben desde
   detrás de su propio borde y no desde el de «MASCOTAS».
   ───────────────────────────────────────────────────────────── */

const RENGLONES = ["MASCOTAS", "PERDIDAS"];

/* La misma fórmula que ya usa la pantalla interna
   (`mascotasPerdidas.tsx`), copiada acá sin pasar por import: esa
   función vive dentro de la app autenticada, y esta vitrina es la
   única pantalla que se sirve sin sesión, con su propio paquete. */
const zonaLabel = (zona: PublicLostPet["zona"], t: ReturnType<typeof useTranslation>["t"]) => {
  if (!zona) return t("landingPerdidas.card.noZone");
  const partes = [distritoDe(zona), zona.canton, zona.provincia]
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => Boolean(parte));
  return partes
    .filter((parte, i) => i === 0 || normalizar(parte) !== normalizar(partes[i - 1]))
    .join(", ");
};

const fechaCorta = (valor: string, localeTag: string) =>
  new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(new Date(valor));

const PaginaPerdidas = () => {
  const { t, localeTag } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const raiz = useRef<HTMLDivElement>(null);
  usePortadaAnimacion(raiz);

  const [mascotas, setMascotas] = useState<PublicLostPet[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    listPublicLostPets()
      .then((data) => {
        if (vigente) setMascotas(data);
      })
      .catch(() => {
        if (vigente) setError(t("landingPerdidas.loadError"));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [t]);

  /* Quien no tiene sesión no puede reportar un avistamiento ni ver
     el contacto del dueño: eso vive en /mascotas-perdidas, detrás del
     guardia de `RootLayout`. Acá solo se manda a loguearse — no hay
     forma de abrir el formulario de login desde esta pantalla, que
     vive fuera de ese armazón a propósito (ver la nota de arriba).
     El hash `#iniciar-sesion` es lo que `RootLayout` lee para abrir
     el formulario directamente, en vez de dejar a quien hizo clic
     otra vez frente al botón "Entrar" de la portada. */
  const gestionar = () =>
    user
      ? navigate({ to: "/mascotas-perdidas" })
      : navigate({ to: "/", hash: "iniciar-sesion" });

  return (
    <div
      ref={raiz}
      className="portada min-h-dvh"
      style={{ background: CANVAS }}
    >
      <section className="relative" style={{ background: AZUL }}>
        <header
          data-entra="barra"
          className="relative flex h-20 items-center px-5 sm:h-24 sm:px-8"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full py-2.5 pr-5 pl-3.5 text-[14px] font-bold transition-transform duration-150 ease-out active:scale-[0.97]"
            style={{ background: CANVAS, color: NAVY }}
          >
            <ArrowLeft size={17} strokeWidth={2.4} aria-hidden />
            {t("landingPerdidas.backHome")}
          </Link>

          <Link
            to="/"
            aria-label={t("landingPerdidas.backToHomeAria", { marca: MARCA.completo })}
            className="absolute left-1/2 -translate-x-1/2"
          >
            <img
              src={MARCA.logoSimbolo}
              alt=""
              className="h-11 w-11 object-contain sm:h-12 sm:w-12"
            />
          </Link>
        </header>

        <div className="px-5 pt-6 pb-14 text-center sm:px-8 sm:pt-10 sm:pb-20">
          <p data-entra="entrada" className="rotulo" style={{ color: TINTA }}>
            {t("landingPerdidas.antetitulo")}
          </p>
          <p
            aria-hidden
            className="mt-3 flex flex-col items-center leading-[0.9] tracking-[-0.035em]"
            style={{
              color: NAVY,
              fontFamily: 'Archivo, "Instrument Sans", sans-serif',
              fontVariationSettings: '"wdth" 112, "wght" 900',
              fontSize: "clamp(40px, 9vw, 128px)",
            }}
          >
            {RENGLONES.map((renglon) => (
              <span key={renglon} data-anim="marca" className="marca-mascara">
                {renglon.split("").map((letra, indice) => (
                  <span key={indice} className="letra">
                    {letra}
                  </span>
                ))}
              </span>
            ))}
          </p>
          <p
            data-entra="entrada"
            className="mx-auto mt-6 max-w-md text-[15.5px] leading-relaxed font-medium"
            style={{ color: TINTA }}
          >
          {t("landingPerdidas.subtitle")}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        {cargando ? (
          <p className="text-center text-[14px] font-medium text-ink-soft">
            {t("landingPerdidas.loading")}
          </p>
        ) : error ? (
          <p className="text-center text-[14px] font-semibold text-danger">{error}</p>
        ) : mascotas.length === 0 ? (
          <EmptyState
            title={t("landingPerdidas.empty.title")}
            hint={t("landingPerdidas.empty.hint")}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mascotas.map((mascota, i) => (
              <article
                key={mascota.id_mascota_perdida}
                style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
                className="anim-rise flex flex-col overflow-hidden rounded-[18px] bg-surface outline outline-black/[0.05]"
              >
                <div className="relative">
                  <img
                    src={mascota.fotoUrl ?? "/mock/dog-nube.jpg"}
                    alt={t("landingPerdidas.card.photoAlt", { nombre: mascota.nombre })}
                    loading="lazy"
                    className="aspect-[16/10] w-full bg-sunken object-cover"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[rgb(20_36_46/88%)] via-[rgb(20_36_46/38%)] to-transparent"
                  />
                  <span className="absolute top-3 left-3">
                    <Badge tono="danger">{t("landingPerdidas.card.lost")}</Badge>
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="truncate text-[16px] font-semibold text-white">{mascota.nombre}</h3>
                    <p className="mt-0.5 truncate text-[12.5px] text-white/85">
                      {mascota.especie}
                      {mascota.raza ? ` · ${mascota.raza}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-1.5 px-4 py-3.5 text-[12.5px] text-ink-soft">
                  <p className="flex items-center gap-1.5">
                    <MapPin size={13} strokeWidth={1.8} aria-hidden className="shrink-0 text-ink-mute" />
                    <span className="truncate">{zonaLabel(mascota.zona, t)}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock size={13} strokeWidth={1.8} aria-hidden className="shrink-0 text-ink-mute" />
                    {t("landingPerdidas.card.lostOn", { fecha: fechaCorta(mascota.fecha_reporte, localeTag) })}
                  </p>

                  <button
                    type="button"
                    onClick={gestionar}
                    className={`${user ? btnPrimary : btnSecondary} mt-3 w-full justify-center`}
                  >
                    {user ? <Eye size={14} /> : <User size={14} />}
                    {user
                      ? t("landingPerdidas.card.report")
                      : t("landingPerdidas.card.loginToReport")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PaginaPerdidas;
