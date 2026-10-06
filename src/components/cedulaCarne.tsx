/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { Camera } from "../lib/iconos";
import { useTranslation } from "../hooks/useTranslation";
import { MARCA } from "../lib/nav";
import type { UserProfile } from "../types/auth.types";
import type { Pet } from "../types/pet.types";
import type { I18nContextValue } from "../context/i18n-context";
import { FilterTabs } from "./ui";
import SelloVerificado from "./SelloVerificado";

type T = I18nContextValue["t"];

/** El QR sí es real y sí se puede escanear —no es decoración, como
    hubiera sido un código de barras dibujado a mano—. No apunta a
    ninguna pantalla porque el carné no tiene una vista pública: lleva
    el texto que alguien necesitaría si encuentra a la mascota, así
    que un lector cualquiera lo muestra sin depender de esta app. */
const textoQR = (pet: Pet, profile: UserProfile | null, id: string, t: T) =>
  [
    `${MARCA.completo} · Carné digital`,
    `Mascota: ${pet.nombre} (${pet.especie}, ${pet.raza})`,
    `Responsable: ${profile?.nombre || t("carnet.identification.notRegistered")}`,
    `Teléfono: ${profile?.telefono || t("carnet.identification.notRegistered")}`,
    ...(pet.padecimientos.length
      ? [`Condiciones: ${pet.padecimientos.map((p) => p.nombre).join(", ")}`]
      : []),
    `Carné: ${id}`,
  ].join("\n");

const QRCarnet = ({ valor, className }: { valor: string; className?: string }) => {
  const { t } = useTranslation();
  const matriz = useMemo(
    () => QRCode.create(valor, { errorCorrectionLevel: "M" }).modules,
    [valor]
  );

  return (
    <svg
      viewBox={`0 0 ${matriz.size} ${matriz.size}`}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label={t("carnet.qrAria")}
    >
      <rect x={0} y={0} width={matriz.size} height={matriz.size} fill="white" />
      {Array.from(matriz.data)
        .map((bit, i) =>
          bit ? (
            <rect
              key={i}
              x={i % matriz.size}
              y={Math.floor(i / matriz.size)}
              width={1}
              height={1}
              fill="#1a4257"
            />
          ) : null
        )
        .filter(Boolean)}
    </svg>
  );
};

export const cardId = (pet: Pet) => {
  const initials = pet.nombre.replace(/[^a-záéíóúñ]/gi, "").slice(0, 3).toUpperCase();
  return `TSC-${pet.id_mascota.slice(0, 8).toUpperCase()}-${initials}`;
};

/* ─────────────────────────────────────────────────────────────
   LA CÉDULA, rehecha como documento

   La anterior era una franja navy estirada a todo el ancho de la
   pantalla, con el símbolo turquesa metido en un disco dorado y
   esquinas de oro alrededor de la foto: se leía como una tarjeta de
   aplicación, no como un documento, y el oro sobre el turquesa se
   peleaban. Esta toma el vocabulario de las cédulas y los pasaportes
   de verdad, que es lo que hace que algo se lea como "identificación"
   sin tener que decirlo:

     · Papel de seguridad CLARO con grabado fino. Los documentos no
       son oscuros: son claros, con un fondo de líneas que no deja
       fotocopiarlos limpio. Además imprime bien, que el navy macizo
       no hacía.
     · Microtexto bajo la cabecera: una línea que de lejos parece un
       filete y de cerca dice TUANISCAN · CR una y otra vez.
     · El sello de verificado PISA la esquina de la foto, como el
       holograma que se lamina encima en una cédula.
     · Una cara de atrás. Lo que no cabe adelante —a quién llamar,
       la salud, el QR— va donde lo pone cualquier documento: atrás.
     · La zona de lectura mecánica: las tres líneas de `<<<` del pie
       de los pasaportes (formato TD1, el de las tarjetas), con los
       dígitos de control calculados de verdad.

   Todo se mide en `cqw`, el ancho del propio carné. Es un objeto:
   crece y se achica entero, como una foto de una tarjeta, en vez de
   reacomodarse como una página. Los textos tienen un piso en px para
   seguir legibles cuando el carné es angosto.
   ───────────────────────────────────────────────────────────── */

/** El grabado del papel: dos rosetones y una trama, en turquesa casi
    transparente. Es el mismo dibujo que el de las tarjetas de pago
    —la casa tiene UN guilloché— pasado a tinta sobre papel claro. */
const GUILLOCHE_PAPEL = [
  "repeating-radial-gradient(circle at 88% 18%, rgba(20,163,184,0.065) 0 1px, transparent 1px 7px)",
  "repeating-radial-gradient(circle at 8% 92%, rgba(26,66,87,0.06) 0 1px, transparent 1px 9px)",
  "repeating-linear-gradient(58deg, rgba(20,163,184,0.05) 0 1px, transparent 1px 6px)",
].join(", ");

const MICROTEXTO = "TUANISCAN · CR · ".repeat(24);

/** Rótulo de campo de documento: versalita chica de Archivo. */
const ROTULO_DOC =
  "font-['Archivo'] text-[max(7.5px,1.45cqw)] font-bold tracking-[0.14em] text-ink-mute uppercase";

const VALOR_CAPITAL = "text-[max(12px,2.55cqw)] font-semibold text-ink capitalize";

const Campo = ({
  etiqueta,
  valor,
  className = "",
  valorClass = "text-[max(12px,2.55cqw)] font-semibold text-ink",
}: {
  etiqueta: string;
  valor: string;
  className?: string;
  valorClass?: string;
}) => (
  <div className={`min-w-0 ${className}`}>
    <dt className={ROTULO_DOC}>{etiqueta}</dt>
    <dd className={`mt-[0.4cqw] truncate leading-tight ${valorClass}`} title={valor}>
      {valor}
    </dd>
  </div>
);

/* ── La zona de lectura mecánica (ICAO 9303, TD1) ──

   Tres líneas de treinta caracteres. No es adorno inventado: es el
   formato real de las tarjetas de identidad, con sus dígitos de
   control calculados con los pesos 7-3-1 de la norma. Un lector de
   documentos no la va a aceptar —no hay estado emisor—, pero se lee
   como lo que es, y todo lo que dice es cierto. */
const sinMarcas = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "<")
    .replace(/^<+|<+$/g, "");

const aLo = (texto: string, largo: number) => (texto + "<".repeat(largo)).slice(0, largo);

const digitoControl = (texto: string) => {
  const pesos = [7, 3, 1];
  let suma = 0;
  [...texto].forEach((c, i) => {
    const valor = c === "<" ? 0 : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55;
    suma += valor * pesos[i % 3];
  });
  return String(suma % 10);
};

const zonaLectura = (pet: Pet) => {
  const numero = aLo(pet.id_mascota.replace(/-/g, "").toUpperCase(), 9);
  const linea1 = aLo(`MCCRI${numero}${digitoControl(numero)}`, 30);

  const [ano = "", mes = "", dia = ""] = (pet.fecha_nacimiento ?? "").split("-");
  const nacimiento = ano && mes && dia ? `${ano.slice(2)}${mes}${dia}` : "<<<<<<";
  const sexo = pet.sexo === "hembra" ? "F" : "M";
  const cuerpo2 = `${nacimiento}${digitoControl(nacimiento)}${sexo}<<<<<<<CRI${aLo(sinMarcas(pet.especie), 11)}`;
  const linea2 = `${cuerpo2}${digitoControl(linea1.slice(5, 30) + cuerpo2.slice(0, 7))}`;

  const linea3 = aLo(`${sinMarcas(pet.nombre)}<<${sinMarcas(pet.raza)}`, 30);
  return [linea1, linea2.slice(0, 30), linea3];
};

/** Fecha como la escribe un documento: 15 JUL 2026. */
const fechaDocumento = (fecha: string, localeTag: string) => {
  const dia = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(dia.getTime())) return fecha;
  return new Intl.DateTimeFormat(localeTag, { day: "2-digit", month: "short", year: "numeric" })
    .format(dia)
    .replace(/\./g, "")
    .replace(/ de /g, " ")
    .toUpperCase();
};

/** La cáscara común de las dos caras: el papel, el grabado y el
    filo. `ID-1` (ISO/IEC 7810) es 85,60 × 53,98 mm: 1,586.

    La proporción va como ALTO MÍNIMO (`63.05cqw` = ancho / 1,586) y
    no como `aspect-ratio` fijo. Con `overflow-hidden` —que hace
    falta para que las bandas respeten las esquinas— un aspecto fijo
    corta lo que no entra: en un teléfono, a 314 px, se perdían la
    banda de vacunas y la zona de lectura. Así, donde entra, es una
    tarjeta exacta; donde no, crece hacia abajo antes que cortar. */
const Cara = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`carnet-cedula relative flex h-full min-h-[63.05cqw] w-full flex-col overflow-hidden rounded-[3.6cqw] bg-[#f8fbfc] text-ink shadow-[0_1px_2px_rgba(20,36,46,0.08),0_14px_32px_-14px_rgba(20,36,46,0.35)] ring-1 ring-rail/10 ${className}`}
  >
    <span aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: GUILLOCHE_PAPEL }} />
    {children}
  </div>
);

export const Anverso = ({
  pet,
  alerta,
  zona,
}: {
  pet: Pet;
  alerta: boolean;
  zona: string;
}) => {
  const { t, localeTag } = useTranslation();

  return (
    <Cara>
      {/* Marca de agua: el símbolo grande, casi invisible, asomando
          por la esquina. Otra seña de papel de seguridad. */}
      <img
        src={MARCA.logoSimbolo}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-[7cqw] -bottom-[10cqw] w-[44cqw] opacity-[0.05] grayscale"
      />

      <div className="relative flex items-center justify-between gap-[2cqw] px-[4.2cqw] pt-[3.4cqw]">
        <div className="flex min-w-0 items-center gap-[1.4cqw]">
          <img src={MARCA.logoSimbolo} alt="" aria-hidden className="h-[max(20px,6cqw)] w-auto shrink-0 object-contain" />
          <p className="titular truncate text-[max(13px,3.2cqw)] leading-none text-rail">
            {MARCA.nombre}
            <span className="text-accent">{MARCA.acento}</span>
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className={`${ROTULO_DOC} text-rail`}>{t("carnet.card.idLabel")}</p>
          <p className="mt-[0.3cqw] truncate text-[max(9px,1.75cqw)] text-ink-soft">{t("carnet.card.companionAnimal")}</p>
        </div>
      </div>

      <p
        aria-hidden
        className="relative mx-[4.2cqw] mt-[2cqw] overflow-hidden border-t border-accent/30 pt-[0.6cqw] text-[max(4px,0.9cqw)] leading-none tracking-[0.25em] whitespace-nowrap text-accent/70"
      >
        {MICROTEXTO}
      </p>

      <div className="relative flex flex-1 gap-[3.6cqw] px-[4.2cqw] pt-[2.8cqw] pb-[3cqw]">
        <div className="relative w-[23cqw] shrink-0 self-start">
          <div className="aspect-[3/4] overflow-hidden rounded-[1.6cqw] bg-sunken ring-1 ring-rail/15">
            {pet.fotoUrl ? (
              <img src={pet.fotoUrl} alt={t("common.photoOf", { nombre: pet.nombre })} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-mute">
                <Camera size={26} strokeWidth={1.3} />
                <span className="sr-only">{t("carnet.card.noPhoto")}</span>
              </div>
            )}
          </div>
          {/* El holograma. Pisa la esquina de la foto, como el sello
              laminado encima de la fotografía en una cédula. */}
          <span className="absolute -right-[2.6cqw] -bottom-[2.6cqw] w-[max(24px,7.6cqw)]">
            <SelloVerificado size={40} aro className="h-auto w-full" title={t("carnet.card.verifiedBy", { marca: MARCA.completo })} />
          </span>
        </div>

        <dl className="grid min-w-0 flex-1 grid-cols-2 content-start gap-x-[3cqw] gap-y-[2cqw]">
          <Campo
            className="col-span-2"
            etiqueta={t("carnet.card.name")}
            valor={pet.nombre}
            valorClass="titular capitalize text-[max(22px,5.4cqw)] text-rail"
          />
          <Campo etiqueta={t("carnet.card.species")} valor={pet.especie} valorClass={VALOR_CAPITAL} />
          <Campo etiqueta={t("carnet.card.sex")} valor={pet.sexo === "macho" ? t("carnet.card.male") : t("carnet.card.female")} />
          <Campo etiqueta={t("carnet.card.breed")} valor={pet.raza} valorClass={VALOR_CAPITAL} />
          <Campo etiqueta={t("carnet.card.birth")} valor={fechaDocumento(pet.fecha_nacimiento, localeTag)} />
          <Campo
            className="col-span-2"
            etiqueta={t("carnet.card.cardNumber")}
            valor={cardId(pet)}
            valorClass="nums text-[max(11px,2.3cqw)] font-semibold tracking-[0.08em] text-ink"
          />
        </dl>
      </div>

      <div className="relative flex items-center justify-between gap-[2cqw] bg-rail px-[4.2cqw] py-[1.8cqw] text-[max(8px,1.5cqw)] font-semibold tracking-[0.14em] text-rail-text uppercase">
        <span className="flex min-w-0 items-center gap-[1.2cqw]">
          <span aria-hidden className={`h-[max(5px,1.1cqw)] w-[max(5px,1.1cqw)] shrink-0 rounded-full ${alerta ? "bg-warn" : pet.vacunas.length ? "bg-ok" : "bg-rail-mute"}`} />
          <span className="truncate">
            {alerta ? t("carnet.card.vaccinesCheck") : pet.vacunas.length ? t("carnet.card.vaccinesOk") : t("carnet.card.vaccinesNone")}
          </span>
        </span>
        <span className="truncate">{zona}</span>
      </div>
    </Cara>
  );
};

export const Reverso = ({
  pet,
  profile,
  zona,
}: {
  pet: Pet;
  profile: UserProfile | null;
  zona: string;
}) => {
  const { t } = useTranslation();
  const salud = [
    pet.alergias ? `${t("carnet.card.allergies")}: ${pet.alergias}` : "",
    ...pet.padecimientos.map((p) => p.nombre),
  ].filter(Boolean);

  return (
    <Cara>
      <div className="relative flex items-center justify-between gap-[2cqw] bg-rail px-[4.2cqw] py-[2.2cqw]">
        <p className="titular truncate text-[max(12px,2.6cqw)] text-white">{t("carnet.card.ifFound")}</p>
        <p className="nums shrink-0 text-[max(8.5px,1.6cqw)] tracking-[0.08em] text-rail-text">{cardId(pet)}</p>
      </div>

      <div className="relative flex flex-1 gap-[3.6cqw] px-[4.2cqw] pt-[2.8cqw] pb-[2.4cqw]">
        <dl className="grid min-w-0 flex-1 content-start gap-y-[1.9cqw]">
          <Campo
            etiqueta={t("carnet.card.owner")}
            valor={profile?.nombre || t("carnet.identification.notRegistered")}
            valorClass="titular text-[max(15px,3.4cqw)] text-rail"
          />
          <Campo
            etiqueta={t("carnet.card.phone")}
            valor={profile?.telefono || t("carnet.identification.notRegistered")}
            valorClass="nums text-[max(14px,3cqw)] font-semibold tracking-[0.02em] text-ink"
          />
          <Campo etiqueta={t("carnet.card.zone")} valor={zona} />
          <div className="min-w-0">
            <dt className={ROTULO_DOC}>{t("carnet.card.health")}</dt>
            <dd
              className={`mt-[0.4cqw] line-clamp-2 text-[max(10.5px,2cqw)] leading-snug ${salud.length ? "font-semibold text-warn" : "text-ink-soft"}`}
            >
              {salud.length ? salud.join(" · ") : t("carnet.card.healthNone")}
            </dd>
          </div>
        </dl>

        <div className="flex shrink-0 flex-col items-center gap-[1cqw] self-start">
          {/* El blanco es el margen de silencio que necesita el lector. */}
          <div className="rounded-[1.4cqw] bg-white p-[1.2cqw] ring-1 ring-rail/10">
            <QRCarnet valor={textoQR(pet, profile, cardId(pet), t)} className="h-[21cqw] w-[21cqw]" />
          </div>
          <p className={ROTULO_DOC}>{t("carnet.card.contactData")}</p>
        </div>
      </div>

      <div
        aria-hidden
        className="relative bg-white/75 px-[4.2cqw] py-[1.8cqw] font-mono text-[2.7cqw] leading-[1.32] tracking-[0.1em] text-ink"
      >
        {zonaLectura(pet).map((linea, i) => (
          <p key={i} className="whitespace-pre">
            {linea}
          </p>
        ))}
      </div>
    </Cara>
  );
};

/** El escenario de la pantalla: el carné apoyado sobre una mesa, con
    las dos caras en el mismo lugar y un giro para pasar de una a la
    otra. Se da vuelta con las píldoras de arriba o tocándolo.

    El giro es en 3D de verdad —las dos caras ocupan la misma celda y
    la de atrás vive rotada 180°—, porque eso es lo que se hace con
    un carné para ver el dorso; un fundido diría "otra pantalla". Con
    movimiento reducido el cambio es instantáneo. */
export const EscenarioCarne = ({
  pet,
  profile,
  zona,
  alerta,
}: {
  pet: Pet;
  profile: UserProfile | null;
  zona: string;
  alerta: boolean;
}) => {
  const { t } = useTranslation();
  const [dorso, setDorso] = useState(false);
  const caras = [
    { value: "anverso", label: t("carnet.card.front") },
    { value: "reverso", label: t("carnet.card.back") },
  ];

  return (
    <section className="carnet-escenario rounded-[18px] bg-sunken/70 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-ink-mute">{t("carnet.card.flipHint")}</p>
        <FilterTabs
          label={t("carnet.card.sideAria")}
          options={caras}
          value={dorso ? "reverso" : "anverso"}
          onChange={(v) => setDorso(v === "reverso")}
        />
      </div>

      <div className="pt-5 pb-2 sm:pt-6 sm:pb-3">
        <div className="mx-auto w-full max-w-[540px] [perspective:1800px]">
          {/* `grid-cols-1` no es opcional. Una grilla sin columnas
              declaradas las mide por su contenido, y la línea de
              microtexto es una tira de cientos de caracteres que no se
              corta: la columna se estiraba a 1661 px y arrastraba el
              carné entero, casi tres veces más ancho que su lugar.
              `grid-cols-1` es `minmax(0, 1fr)`: la columna mide lo que
              mide el contenedor, y lo que sobra se recorta adentro. */}
          <div
            onClick={() => setDorso((d) => !d)}
            className="@container grid grid-cols-1 cursor-pointer transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none"
            style={{
              transform: dorso ? "rotateY(180deg)" : "none",
              transitionTimingFunction: "cubic-bezier(0.77, 0, 0.175, 1)",
            }}
          >
            <div className="[grid-area:1/1] [backface-visibility:hidden]" aria-hidden={dorso} inert={dorso}>
              <Anverso pet={pet} alerta={alerta} zona={zona} />
            </div>
            <div
              className="[grid-area:1/1] [transform:rotateY(180deg)] [backface-visibility:hidden]"
              aria-hidden={!dorso}
              inert={!dorso}
            >
              <Reverso pet={pet} profile={profile} zona={zona} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/** En papel no hay giro: las dos caras salen lado a lado, a tamaño
    real de tarjeta, con la línea de corte alrededor. */
export const CarnePapel = ({
  pet,
  profile,
  zona,
  alerta,
}: {
  pet: Pet;
  profile: UserProfile | null;
  zona: string;
  alerta: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <section className="carnet-papel">
      {/* Cada cara se arma a 110 mm y se reduce entera a 85,6 mm con
          `zoom`. Armada directo a 85,6 mm, los pisos de legibilidad de
          los textos (pensados para pantalla) no entraban en 54 mm de
          alto y la tarjeta salía estirada a 62. Reducida, sale exacta:
          85,6 × 54 mm, la medida de una tarjeta de verdad. `zoom` y no
          `transform: scale` porque achica también el lugar que ocupa,
          y la línea de corte y el espacio entre caras salen bien. */}
      <div className="flex flex-wrap gap-[10mm]">
        {[
          <Anverso key="a" pet={pet} alerta={alerta} zona={zona} />,
          <Reverso key="r" pet={pet} profile={profile} zona={zona} />,
        ].map((cara) => (
          <div
            key={cara.key}
            className="@container w-[110mm] rounded-[4.6mm] outline-1 outline-offset-[2.6mm] outline-ink-mute/50 outline-dashed"
            style={{ zoom: 85.6 / 110 }}
          >
            {cara}
          </div>
        ))}
      </div>
      <p className="mt-[5mm] text-[9pt] text-ink-mute">{t("carnet.card.cutHint")}</p>
    </section>
  );
};

