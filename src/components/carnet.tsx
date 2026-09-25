import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import QRCode from "qrcode";
import { Camera, Download, Share2, Stethoscope, Syringe } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { formatDate, petAge } from "../lib/pets";
import { MARCA } from "../lib/nav";
import { listPets } from "../services/pets.service";
import type { UserProfile } from "../types/auth.types";
import type { Pet } from "../types/pet.types";
import {
  Badge,
  EmptyState,
  Page,
  PageHeader,
  Table,
  btnPrimary,
  btnSecondary,
} from "./ui";
import { Combo } from "./Combo";
import SelloVerificado from "./SelloVerificado";
import { GRADIENTE_ORO, GUILLOCHE, RELIEVE_ORO, REPUJADO } from "./tarjetaVisual";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";

/* ─────────────────────────────────────────────────────────────
   EL CARNÉ

   Es un documento, no una pantalla: la misma pieza se mira en el
   navegador y se imprime, así que vive en un componente propio y se
   monta dos veces —una en la página y otra en una hoja aparte que
   solo existe en el papel—. Un solo diseño para los dos destinos; si
   se tocara solo el de pantalla, el impreso se quedaría atrás.

   La cédula de arriba toma prestadas las técnicas de `TarjetaVisual`
   —el guilloché, el repujado, el oro del chip— porque son la misma
   pregunta resuelta antes: qué hace que un rectángulo con esquinas
   redondas se lea como un objeto físico y no como una tarjeta de
   SaaS más. Acá el "chip" es el sello de la casa en vez de los seis
   contactos EMV, y la foto ocupa el sitio del número de tarjeta:
   es lo primero que se mira en una cédula de verdad. */

/** El QR sí es real y sí se puede escanear —no es decoración, como
    hubiera sido un código de barras dibujado a mano—. No apunta a
    ninguna pantalla porque el carné no tiene una vista pública: lleva
    el texto que alguien necesitaría si encuentra a la mascota, así
    que un lector cualquiera lo muestra sin depender de esta app. */
const textoQR = (pet: Pet, profile: UserProfile | null, id: string) =>
  [
    `${MARCA.completo} · Carné digital`,
    `Mascota: ${pet.nombre} (${pet.especie}, ${pet.raza})`,
    `Responsable: ${profile?.nombre || "No registrado"}`,
    `Teléfono: ${profile?.telefono || "No registrado"}`,
    ...(pet.padecimientos.length
      ? [`Condiciones: ${pet.padecimientos.map((p) => p.nombre).join(", ")}`]
      : []),
    `Carné: ${id}`,
  ].join("\n");

const QRCarnet = ({ valor, className }: { valor: string; className?: string }) => {
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
      aria-label="Código QR con los datos de contacto del carné"
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

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div className="rounded-[14px] bg-sunken px-4 py-3">
    <dt className="rotulo text-ink-mute">{etiqueta}</dt>
    <dd className="nums mt-1 text-[13px] break-words text-ink">{valor}</dd>
  </div>
);

const Grupo = ({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) => (
  <section className="mt-5 first:mt-0">
    <h4 className="rotulo mb-2 text-ink-mute">{titulo}</h4>
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{children}</dl>
  </section>
);

/** Una esquina de la caja de la foto, como las que marcan dónde va la
    fotografía en una cédula real. Cuatro copias rotadas 90° cada una
    cubren las cuatro esquinas sin repetir el trazado a mano. */
const EsquinaFoto = ({ className }: { className: string }) => (
  <span
    aria-hidden
    className={`pointer-events-none absolute h-3.5 w-3.5 border-[#e4c780]/80 ${className}`}
  />
);

const cardId = (pet: Pet) => {
  const initials = pet.nombre.replace(/[^a-záéíóúñ]/gi, "").slice(0, 3).toUpperCase();
  return `TSC-${pet.id_mascota.slice(0, 8).toUpperCase()}-${initials}`;
};

const messageFrom = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo cargar el carné digital.";

const CarneMascota = ({
  pet,
  profile,
  zona,
}: {
  pet: Pet;
  profile: UserProfile | null;
  zona: string;
}) => {
  const alerta = pet.vacunas.some((vacuna) => vacuna.estado !== "vigente");
  const estado = alerta
    ? "Requiere atención"
    : pet.vacunas.length
      ? "Al día"
      : "Sin vacunas";

  return (
    <article className="carnet-pieza anim-rise flex flex-col gap-3">
      {/* ── LA CÉDULA ── proporción ID-1 (ISO/IEC 7810), la misma que
          usa TarjetaVisual: es la proporción que el ojo ya reconoce
          como "una tarjeta", sin necesidad de decirlo. */}
      <div className="carnet-cedula relative overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#0f2a3a_0%,#1a4257_48%,#2e6584_100%)] p-5 text-white shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_18px_40px_rgba(15,35,55,0.3)] ring-1 ring-accent/25 sm:p-7">
        {/* El filo del plástico */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25"
        />
        {/* El grabado */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
          style={{ backgroundImage: GUILLOCHE }}
        />
        {/* El marco dorado, apenas visible: el filete que llevan las
            cédulas alrededor del borde entero. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[6px] rounded-[15px] border border-[#e4c780]/25"
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full"
              style={{ backgroundImage: GRADIENTE_ORO, boxShadow: RELIEVE_ORO }}
            >
              <img src={MARCA.logoSimbolo} alt="" aria-hidden className="h-6 w-6 object-contain" />
            </span>
            <div className="min-w-0">
              <p className="text-[9.5px] font-bold tracking-[0.16em] text-white/55 uppercase">
                Carné de identificación
              </p>
              <p className="titular text-[15px] font-bold text-white">
                {MARCA.nombre}
                <span className="text-accent">{MARCA.acento}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            <SelloVerificado size={26} aro title="Carné verificado por TuanisCan" />
            <span className="text-[8.5px] font-semibold tracking-wide text-white/55 uppercase">
              Verificado
            </span>
          </div>
        </div>

        <div className="relative mt-5 flex gap-4 sm:gap-5">
          {/* La foto ocupa el sitio que en una tarjeta de pago tiene el
              número: es el primer dato que se lee en una cédula real. */}
          <div className="relative h-[112px] w-[86px] flex-shrink-0 sm:h-[136px] sm:w-[104px]">
            {pet.fotoUrl ? (
              <img
                src={pet.fotoUrl}
                alt={`Fotografía de ${pet.nombre}`}
                className="h-full w-full rounded-[10px] bg-white/10 object-cover ring-1 ring-white/15"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white/10 text-white/40 ring-1 ring-white/15">
                <Camera size={28} strokeWidth={1.3} />
                <span className="sr-only">Sin fotografía</span>
              </div>
            )}
            <EsquinaFoto className="-top-1 -left-1 border-t-2 border-l-2 rounded-tl-[4px]" />
            <EsquinaFoto className="-top-1 -right-1 border-t-2 border-r-2 rounded-tr-[4px]" />
            <EsquinaFoto className="-bottom-1 -left-1 border-b-2 border-l-2 rounded-bl-[4px]" />
            <EsquinaFoto className="-bottom-1 -right-1 border-b-2 border-r-2 rounded-br-[4px]" />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p
              className="titular truncate text-[24px] leading-tight text-white sm:text-[29px]"
              style={REPUJADO}
            >
              {pet.nombre}
            </p>
            <p className="mt-0.5 text-[12px] text-white/70">
              {pet.especie} · {pet.raza} · {pet.sexo === "macho" ? "Macho" : "Hembra"}
            </p>

            <dl className="nums mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11.5px]">
              <div>
                <dt className="text-[8.5px] font-bold tracking-[0.14em] text-white/50 uppercase">N.° de carné</dt>
                <dd className="mt-0.5 truncate text-white">{cardId(pet)}</dd>
              </div>
              <div>
                <dt className="text-[8.5px] font-bold tracking-[0.14em] text-white/50 uppercase">Edad</dt>
                <dd className="mt-0.5 text-white">{petAge(pet.fecha_nacimiento)}</dd>
              </div>
            </dl>
          </div>

          {/* El blanco de fondo es el margen de silencio que necesita
              cualquier lector: un QR pegado directo al navy no escanea. */}
          <div className="flex-shrink-0 self-center rounded-[10px] bg-white p-2">
            <QRCarnet valor={textoQR(pet, profile, cardId(pet))} className="h-[84px] w-[84px] sm:h-[100px] sm:w-[100px]" />
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[9.5px] font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${alerta ? "bg-warn" : "bg-ok"}`}
            />
            {estado}
          </span>
          {pet.padecimientos.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/25 px-2.5 py-1 text-[9.5px] font-semibold text-white ring-1 ring-[#e4c780]/40">
              <Stethoscope size={11} strokeWidth={2} aria-hidden />
              {pet.padecimientos.length === 1
                ? "1 condición médica"
                : `${pet.padecimientos.length} condiciones médicas`}
            </span>
          )}
          <p className="ml-auto truncate text-[10px] text-white/55">{zona}</p>
        </div>
      </div>

      {/* ── EL REGISTRO ── lo que una cédula de verdad no puede llevar
          encima por espacio: quién responde, y el historial completo. */}
      <div className="carnet-panel rounded-[18px] bg-surface p-6">
        {/* Los doce datos estaban en dos rejillas seguidas, de tres
            columnas y de dos, sin nada que dijera por qué se partían
            ahí. Son dos cosas distintas —quién es el animal, y a
            quién se llama si aparece— y ahora cada grupo lo dice. */}
        <Grupo titulo="Identificación">
          <Dato
            etiqueta="Nacimiento"
            valor={formatDate(pet.fecha_nacimiento)}
          />
          <Dato etiqueta="Peso" valor={`${pet.peso} kg`} />
          <Dato etiqueta="Color" valor={pet.color} />
          <Dato
            etiqueta="Esterilizado"
            valor={pet.esterilizado ? "Sí" : "No"}
          />
          <Dato
            etiqueta="Microchip"
            valor={pet.microchip || "No registrado"}
          />
          <Dato
            etiqueta="Veterinaria"
            valor={pet.veterinaria || "No registrada"}
          />
        </Grupo>

        <Grupo titulo="Responsable y contacto">
          <Dato
            etiqueta="Responsable"
            valor={profile?.nombre || "No registrado"}
          />
          <Dato
            etiqueta="Teléfono"
            valor={profile?.telefono || "No registrado"}
          />
          <Dato etiqueta="Zona" valor={zona} />
          <Dato
            etiqueta="Alergias"
            valor={pet.alergias || "Ninguna registrada"}
          />
        </Grupo>

        {pet.notas && (
          <p className="mt-4 rounded-[14px] bg-accent-wash px-4 py-3 text-[12.5px] leading-snug whitespace-pre-wrap text-accent-dark">
            {pet.notas}
          </p>
        )}
      </div>

      <div className="carnet-panel rounded-[18px] bg-surface p-6">
        <h4 className="rotulo mb-3 flex items-center gap-2 text-ink-mute">
          <Stethoscope size={13} /> Enfermedades y condiciones
        </h4>
        {pet.padecimientos.length ? (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {pet.padecimientos.map((condicion) => (
              <li key={condicion.id_padecimiento} className="rounded-[14px] bg-warn-wash/60 px-4 py-3">
                <p className="text-[13.5px] font-semibold break-words text-ink">{condicion.nombre}</p>
                {condicion.fecha_diagnostico && (
                  <p className="nums mt-0.5 text-[11.5px] text-ink-mute">
                    Diagnosticada el {formatDate(condicion.fecha_diagnostico)}
                  </p>
                )}
                {condicion.cuidados && (
                  <p className="mt-1.5 text-[12.5px] leading-snug whitespace-pre-wrap text-ink-soft">
                    {condicion.cuidados}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-soft">
            Sin enfermedades registradas. Se agregan desde Mis mascotas.
          </p>
        )}
      </div>

      <div className="carnet-panel rounded-[18px] bg-surface p-6">
        <h4 className="rotulo mb-3 flex items-center gap-2 text-ink-mute">
          <Syringe size={13} /> Historial de vacunación
        </h4>
        {pet.vacunas.length ? (
          <Table
            caption={`Vacunas registradas de ${pet.nombre}`}
            columnas={[
              { label: "Vacuna" },
              { label: "Aplicada" },
              { label: "Vence" },
              { label: "Estado" },
            ]}
          >
            {pet.vacunas.map((vacuna) => (
              <tr key={vacuna.id_vacuna}>
                <td className="px-6 py-3 text-[13px] font-medium text-ink">
                  {vacuna.nombre_vacuna}
                </td>
                <td className="nums px-6 py-3 text-[12.5px] text-ink-soft">
                  {formatDate(vacuna.fecha_aplicacion)}
                </td>
                <td className="nums px-6 py-3 text-[12.5px] text-ink-soft">
                  {formatDate(vacuna.fecha_vencimiento)}
                </td>
                <td className="px-6 py-3">
                  <Badge
                    tono={
                      vacuna.estado === "vigente"
                        ? "ok"
                        : vacuna.estado === "pendiente"
                          ? "warn"
                          : "danger"
                    }
                  >
                    {vacuna.estado === "pendiente" ? "Por vencer" : vacuna.estado}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            title="Sin vacunas registradas"
            hint="Agrega los registros desde Mis mascotas."
          />
        )}
      </div>
    </article>
  );
};

const CarnetDigital = () => {
  const { getProfile } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([listPets(), getProfile()])
      .then(([nextPets, nextProfile]) => {
        setPets(nextPets);
        setProfile(nextProfile);
        const preferred = sessionStorage.getItem("tuaniscan.carnetPetId");
        const initial = nextPets.find((pet) => pet.id_mascota === preferred) ?? nextPets[0];
        setSelectedId(initial?.id_mascota ?? "");
      })
      .catch((cause) => {
        setError(messageFrom(cause));
        aviso.error(cause, { respaldo: "No se pudieron cargar los carnés." });
      })
      .finally(() => setLoading(false));
  }, [getProfile]);

  const pet = pets.find((item) => item.id_mascota === selectedId) ?? null;
  const zone = profile?.zona
    ? `${profile.zona.nombre}, ${profile.zona.provincia}`
    : "No registrada";

  const share = async () => {
    if (!pet) return;
    const text = `Carné digital de ${pet.nombre} · ${pet.especie}, ${pet.raza} · ID ${cardId(pet)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Carné de ${pet.nombre}`, text, url: window.location.href });
        aviso.ok("Carné compartido");
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        aviso.ok("Enlace copiado", {
          detalle: "Pegalo donde quieras compartir el carné.",
        });
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        aviso.error(cause, {
          respaldo: "Este dispositivo no permite compartir el carné.",
        });
      }
    }
  };

  /* La marca en el `body` es la que activa las reglas de impresión.
     Sin ella, `Ctrl+P` en cualquier otra pantalla saldría en blanco:
     las reglas apagan todo lo que no sea la hoja del carné, y eso solo
     debe pasar cuando el carné es lo que se está imprimiendo. */
  const print = () => {
    if (!pet) return;

    /* El botón dice "Guardar PDF" y lo que se abre es el diálogo de
       impresión del sistema, que en algunos navegadores tarda un
       segundo largo en aparecer. Sin aviso, ese segundo se siente
       como que el botón no hizo nada y se toca otra vez.

       Dice además CUÁL carné sale, que es lo que se preguntaba: la
       hoja lleva solo la mascota seleccionada, no las cuatro. */
    aviso.dato(`Preparando el carné de ${pet.nombre}`, {
      detalle: "En el diálogo elegí \u00abGuardar como PDF\u00bb como destino.",
    });

    document.body.classList.add("imprimiendo-carnet");
    const limpiar = () => document.body.classList.remove("imprimiendo-carnet");
    window.addEventListener("afterprint", limpiar, { once: true });
    window.print();
    /* Safari en iOS no siempre dispara `afterprint`. */
    window.setTimeout(limpiar, 1000);
  };

  return (
    <Page>
      <PageHeader
        title="Carné digital"
        subtitle="Identificación, cuidados e historial de salud de tu mascota en un solo lugar."
        action={
          pet && (
            <div className="flex flex-wrap gap-1">
              <button type="button" className={btnSecondary} onClick={() => void share()}>
                <Share2 size={14} /> Compartir
              </button>
              <button type="button" className={btnPrimary} onClick={print}>
                <Download size={14} /> Guardar PDF
              </button>
            </div>
          )
        }
      />

      {error && (
        <p role="alert" className="rounded-[14px] bg-danger-wash px-5 py-4 text-[13px] text-danger">
          {error}
        </p>
      )}
      {loading && (
        <Skeleton name="carnet-tarjeta" loading>
          <div />
        </Skeleton>
      )}

      {!loading && !pets.length && (
        <section className="bg-surface p-5">
          <EmptyState
            title="No hay carnés disponibles"
            hint="Registra una mascota y su carné se creará automáticamente."
          />
          <div className="mt-4 text-center">
            <button type="button" className={btnPrimary} onClick={() => void navigate({ to: "/mascotas" })}>
              Registrar mascota
            </button>
          </div>
        </section>
      )}

      {pet && (
        <>
          <div className="flex flex-wrap items-center gap-3 bg-surface px-5 py-4">
            <label htmlFor="card-pet" className="rotulo text-ink-mute">
              Mascota
            </label>
            <span className="block w-full max-w-[260px]">
              <Combo
                id="card-pet"
                value={selectedId}
                onChange={(v) => {
                  setSelectedId(v);
                  sessionStorage.setItem("tuaniscan.carnetPetId", v);
                  setNotice("");
                }}
                options={pets.map((item) => ({ value: item.id_mascota, label: item.nombre }))}
              />
            </span>
            {pets.length > 1 && (
              <p className="text-[12px] text-ink-mute">
                Se imprime solo el carné que estás viendo.
              </p>
            )}
            {notice && (
              <p role="status" className="ml-auto text-[12px] text-ok">
                {notice}
              </p>
            )}
          </div>

          <CarneMascota key={pet.id_mascota} pet={pet} profile={profile} zona={zone} />

          {/* La hoja. Cuelga del `body`, fuera de `#root`, y por eso
              basta una regla para apagar la aplicación entera y dejar
              solo esto. Antes las clases `printing-carnet` y
              `carnet-print` existían en el JSX pero no había ni una
              regla `@media print` que las mirara: imprimir sacaba el
              riel, la barra superior y el carné recortado a la altura
              de la ventana. */}
          {createPortal(
            <div className="suave carnet-hoja">
              <CarneMascota pet={pet} profile={profile} zona={zone} />
            </div>,
            document.body,
          )}
        </>
      )}
    </Page>
  );
};

export default CarnetDigital;
