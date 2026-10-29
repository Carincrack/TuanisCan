import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, Eye, Maximize2, MapPin, PawPrint, Search, User } from "../lib/iconos";
import { MARCA } from "../lib/nav";
import { usePortadaAnimacion } from "./animacion";
import { AZUL, CANVAS, NAVY, TINTA } from "./tokens";
import Onda from "./componentes/Onda";
import Boronas from "./componentes/Boronas";
import { useTranslation } from "../hooks/useTranslation";
import { useAuth } from "../hooks/useAuth";
import { getZonas } from "../services/auth.service";
import { listPublicLostPets } from "../services/lost-pets.service";
import type { PublicLostPet } from "../types/lost-pet.types";
import type { Zona } from "../types/auth.types";
import { distritoDe, normalizar } from "../lib/zonas";
import { useZonasEncadenadas } from "../hooks/useZonasEncadenadas";
import { Badge, EmptyState, btnPrimary, btnSecondary, fieldLabel, input } from "../components/ui";
import { Combo } from "../components/Combo";
import Visor from "../components/Visor";

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

/* La misma cuenta que ya usa `mascotasPerdidas.tsx` para sus
   coincidencias: "hace 3 horas" en vez de una fecha pelada es lo que
   hace que una ficha se lea como un reporte reciente y no como un
   registro de catálogo. */
const haceTiempo = (valor: string, localeTag: string) => {
  const minutos = Math.round((Date.now() - new Date(valor).getTime()) / 60_000);
  const relativo = new Intl.RelativeTimeFormat(localeTag, { numeric: "auto" });
  if (minutos < 60) return relativo.format(-Math.max(1, minutos), "minute");
  if (minutos < 48 * 60) return relativo.format(-Math.round(minutos / 60), "hour");
  return relativo.format(-Math.round(minutos / 1440), "day");
};

/** `id_mascota` nulo es un reporte de "encontré esta mascota, no sé
    de quién es": `nombre` ahí no es un nombre real, es el valor por
    defecto de `reportar_mascota_perdida`. Mostrarlo tal cual sonaba a
    que la mascota se llamaba "Mascota encontrada". */
const tituloMascota = (mascota: PublicLostPet, t: ReturnType<typeof useTranslation>["t"]) =>
  mascota.id_mascota ? mascota.nombre : t("landingPerdidas.card.someoneFound");

/** Una ficha, usada tanto en el carrusel de "recién reportadas" como
    en la rejilla completa de abajo. Misma tarjeta, dos contenedores:
    el carrusel la fuerza a un ancho fijo con `className`, la rejilla
    la deja ocupar su celda. */
const TarjetaMascota = ({
  mascota,
  t,
  localeTag,
  user,
  onVerFoto,
  onGestionar,
  className = "",
  style,
}: {
  mascota: PublicLostPet;
  t: ReturnType<typeof useTranslation>["t"];
  localeTag: string;
  user: unknown;
  onVerFoto: () => void;
  onGestionar: () => void;
  className?: string;
  style?: CSSProperties;
}) => (
  <article
    style={style}
    className={`anim-rise flex flex-col overflow-hidden rounded-[18px] bg-surface outline outline-black/[0.05] ${className}`}
  >
    {/* La cabecera de "publicación": lo que distingue esta ficha de
        una tarjeta de catálogo es que alguien la reportó hace poco,
        no que exista un registro. */}
    <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-wash text-accent-deep">
        <PawPrint size={13} strokeWidth={2} aria-hidden />
      </span>
      <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink">
        {t("landingPerdidas.card.postLabel")}
      </p>
      <span className="shrink-0 text-[11px] text-ink-mute">
        {haceTiempo(mascota.fecha_reporte, localeTag)}
      </span>
    </div>

    <button
      type="button"
      onClick={onVerFoto}
      aria-label={t("landingPerdidas.card.viewPhotoAria", { nombre: tituloMascota(mascota, t) })}
      className="group relative block w-full cursor-zoom-in overflow-hidden text-left focus:outline-2 focus:-outline-offset-2 focus:outline-accent"
    >
      <img
        src={mascota.fotoUrl ?? "/mock/dog-nube.jpg"}
        alt={t("landingPerdidas.card.photoAlt", { nombre: tituloMascota(mascota, t) })}
        loading="lazy"
        className="aspect-[16/10] w-full bg-sunken object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[rgb(20_36_46/88%)] via-[rgb(20_36_46/38%)] to-transparent"
      />
      <span className="absolute top-3 left-3">
        <Badge tono="danger">{t("landingPerdidas.card.lost")}</Badge>
      </span>
      <span
        aria-hidden
        className="absolute right-3 bottom-3 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white opacity-70 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100"
      >
        <Maximize2 size={14} strokeWidth={2.2} />
      </span>
      <span className="absolute inset-x-0 bottom-0 right-12 p-4">
        <h3 className="truncate text-[16px] font-semibold text-white">{tituloMascota(mascota, t)}</h3>
        <p className="mt-0.5 truncate text-[12.5px] text-white/85">
          {mascota.especie}
          {mascota.raza ? ` · ${mascota.raza}` : ""}
        </p>
      </span>
    </button>

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
        onClick={onGestionar}
        className={`${user ? btnPrimary : btnSecondary} mt-3 w-full justify-center`}
      >
        {user ? <Eye size={14} /> : <User size={14} />}
        {user ? t("landingPerdidas.card.report") : t("landingPerdidas.card.loginToReport")}
      </button>
    </div>
  </article>
);

const PaginaPerdidas = () => {
  const { t, localeTag } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const raiz = useRef<HTMLDivElement>(null);
  usePortadaAnimacion(raiz);

  const [mascotas, setMascotas] = useState<PublicLostPet[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [fotoAbierta, setFotoAbierta] = useState<PublicLostPet | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    Promise.all([listPublicLostPets(), getZonas().catch(() => [])])
      .then(([pets, zonasData]) => {
        if (!vigente) return;
        setMascotas(pets);
        setZonas(zonasData);
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

  const territorio = useZonasEncadenadas(zonas);

  const visibles = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es");
    return mascotas.filter((mascota) => {
      const texto = [
        mascota.nombre,
        mascota.especie,
        mascota.raza,
        mascota.zona?.nombre,
        mascota.zona?.canton,
        mascota.zona?.provincia,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es");
      return territorio.cubre(mascota.zona) && (!consulta || texto.includes(consulta));
    });
    // `territorio` se rehace en cada render; sus escalones son la dependencia real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, mascotas, territorio.provincia, territorio.canton, territorio.distrito]);

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

      <main className="relative overflow-hidden">
        <Onda color={AZUL} />
        {/* Las mismas piezas sueltas de perro que flotan en los márgenes
            de la portada — acá con otro recorte (`desde`) para que no
            se vea la copia exacta de "Pasos" o "Cierre" si quien llega
            venía bajando por esas bandas. */}
        <Boronas desde={4} />

        <div className="relative z-10 mx-auto max-w-5xl px-5 py-12 sm:px-8">
        {!cargando && !error && mascotas.length > 0 && (
          <p className="rotulo mb-4 flex items-center gap-1.5" style={{ color: NAVY }}>
            <PawPrint size={13} strokeWidth={2} aria-hidden />
            {t("landingPerdidas.resultsCount", { n: mascotas.length })}
          </p>
        )}

        {!cargando && !error && mascotas.length > 0 && (
          <div className="mb-5 grid gap-3 rounded-[18px] bg-surface p-4 sm:p-5">
            <label className={fieldLabel}>
              {t("landingPerdidas.filters.search")}
              <span className="relative mt-2 block">
                <input
                  type="search"
                  className={`${input} pl-10`}
                  placeholder={t("landingPerdidas.filters.searchPlaceholder")}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <Search
                  size={15}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-mute"
                />
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className={fieldLabel}>
                {t("landingPerdidas.filters.province")}
                <Combo
                  className="mt-2"
                  value={territorio.provincia}
                  onChange={territorio.elegirProvincia}
                  options={territorio.provincias.map((item) => ({
                    value: item,
                    label: item === "Todas" ? t("landingPerdidas.filters.allProvinces") : item,
                  }))}
                />
              </label>
              <label className={fieldLabel}>
                {t("landingPerdidas.filters.canton")}
                <Combo
                  className="mt-2"
                  value={territorio.canton}
                  onChange={territorio.elegirCanton}
                  disabled={!territorio.filtrando}
                  options={territorio.cantones.map((item) => ({
                    value: item,
                    label: item === "Todos" ? t("landingPerdidas.filters.allCantons") : item,
                  }))}
                />
              </label>
              <label className={fieldLabel}>
                {t("landingPerdidas.filters.district")}
                <Combo
                  className="mt-2"
                  value={territorio.distrito}
                  onChange={territorio.elegirDistrito}
                  disabled={territorio.canton === "Todos"}
                  options={territorio.distritos.map((item) => ({
                    value: item,
                    label: item === "Todos" ? t("landingPerdidas.filters.allDistricts") : item,
                  }))}
                />
              </label>
            </div>
          </div>
        )}

        {cargando ? (
          <p className="text-center text-[14px] font-medium text-ink-soft">
            {t("landingPerdidas.loading")}
          </p>
        ) : error ? (
          <p className="text-center text-[14px] font-semibold text-danger">{error}</p>
        ) : visibles.length === 0 ? (
          <EmptyState
            title={
              mascotas.length === 0
                ? t("landingPerdidas.empty.title")
                : t("landingPerdidas.empty.filteredTitle")
            }
            hint={
              mascotas.length === 0
                ? t("landingPerdidas.empty.hint")
                : t("landingPerdidas.empty.filteredHint")
            }
            action={
              mascotas.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    territorio.limpiar();
                  }}
                  className={btnSecondary}
                >
                  {t("landingPerdidas.filters.clear")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((mascota, i) => (
              <TarjetaMascota
                key={mascota.id_mascota_perdida}
                mascota={mascota}
                t={t}
                localeTag={localeTag}
                user={user}
                onVerFoto={() => setFotoAbierta(mascota)}
                onGestionar={gestionar}
                style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
              />
            ))}
          </div>
        )}
        </div>
      </main>

      <Visor
        abierto={fotoAbierta !== null}
        src={fotoAbierta?.fotoUrl ?? "/mock/dog-nube.jpg"}
        alt={fotoAbierta ? t("landingPerdidas.card.photoAlt", { nombre: tituloMascota(fotoAbierta, t) }) : ""}
        cerrar={() => setFotoAbierta(null)}
      />
    </div>
  );
};

export default PaginaPerdidas;
