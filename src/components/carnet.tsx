import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Download, Share2, Stethoscope, Syringe } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
import { formatDate } from "../lib/pets";
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
import { CarnePapel, EscenarioCarne, cardId } from "./cedulaCarne";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";
import type { I18nContextValue } from "../context/i18n-context";

type T = I18nContextValue["t"];

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

const messageFrom = (error: unknown, t: T) =>
  error instanceof Error ? error.message : t("carnet.loadError");

const CarneMascota = ({
  pet,
  profile,
  zona,
  papel = false,
}: {
  pet: Pet;
  profile: UserProfile | null;
  zona: string;
  /** La versión de la hoja impresa: las dos caras a tamaño real. */
  papel?: boolean;
}) => {
  const { t, localeTag } = useTranslation();
  const alerta = pet.vacunas.some((vacuna) => vacuna.estado !== "vigente");

  return (
    <article className="carnet-pieza anim-rise flex flex-col gap-3">
      {papel ? (
        <CarnePapel pet={pet} profile={profile} zona={zona} alerta={alerta} />
      ) : (
        <EscenarioCarne pet={pet} profile={profile} zona={zona} alerta={alerta} />
      )}

      {/* ── EL REGISTRO ── lo que una cédula de verdad no puede llevar
          encima por espacio: quién responde, y el historial completo. */}
      <div className="carnet-panel rounded-[18px] bg-surface p-6">
        {/* Los doce datos estaban en dos rejillas seguidas, de tres
            columnas y de dos, sin nada que dijera por qué se partían
            ahí. Son dos cosas distintas —quién es el animal, y a
            quién se llama si aparece— y ahora cada grupo lo dice. */}
        <Grupo titulo={t("carnet.identification.title")}>
          <Dato
            etiqueta={t("carnet.identification.birth")}
            valor={formatDate(pet.fecha_nacimiento, localeTag)}
          />
          <Dato etiqueta={t("carnet.identification.weight")} valor={`${pet.peso} kg`} />
          <Dato etiqueta={t("carnet.identification.color")} valor={pet.color} />
          <Dato
            etiqueta={t("carnet.identification.sterilized")}
            valor={pet.esterilizado ? t("carnet.identification.yes") : t("carnet.identification.no")}
          />
          <Dato
            etiqueta={t("carnet.identification.microchip")}
            valor={pet.microchip || t("carnet.identification.notRegistered")}
          />
          <Dato
            etiqueta={t("carnet.identification.vet")}
            valor={pet.veterinaria || t("carnet.identification.notRegisteredF")}
          />
        </Grupo>

        <Grupo titulo={t("carnet.contact.title")}>
          <Dato
            etiqueta={t("carnet.contact.owner")}
            valor={profile?.nombre || t("carnet.identification.notRegistered")}
          />
          <Dato
            etiqueta={t("carnet.contact.phone")}
            valor={profile?.telefono || t("carnet.identification.notRegistered")}
          />
          <Dato etiqueta={t("carnet.contact.zone")} valor={zona} />
          <Dato
            etiqueta={t("carnet.contact.allergies")}
            valor={pet.alergias || t("carnet.contact.noneRegistered")}
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
          <Stethoscope size={13} /> {t("carnet.conditions.title")}
        </h4>
        {pet.padecimientos.length ? (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {pet.padecimientos.map((condicion) => (
              <li key={condicion.id_padecimiento} className="rounded-[14px] bg-warn-wash/60 px-4 py-3">
                <p className="text-[13.5px] font-semibold break-words text-ink">{condicion.nombre}</p>
                {condicion.fecha_diagnostico && (
                  <p className="nums mt-0.5 text-[11.5px] text-ink-mute">
                    {t("carnet.conditions.diagnosedOn", { fecha: formatDate(condicion.fecha_diagnostico, localeTag) })}
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
            {t("carnet.conditions.empty")}
          </p>
        )}
      </div>

      <div className="carnet-panel rounded-[18px] bg-surface p-6">
        <h4 className="rotulo mb-3 flex items-center gap-2 text-ink-mute">
          <Syringe size={13} /> {t("carnet.vaccines.title")}
        </h4>
        {pet.vacunas.length ? (
          <Table
            caption={t("carnet.vaccines.caption", { nombre: pet.nombre })}
            columnas={[
              { label: t("carnet.vaccines.columns.vaccine") },
              { label: t("carnet.vaccines.columns.applied") },
              { label: t("carnet.vaccines.columns.expires") },
              { label: t("carnet.vaccines.columns.status") },
            ]}
          >
            {pet.vacunas.map((vacuna) => (
              <tr key={vacuna.id_vacuna}>
                <td className="px-6 py-3 text-[13px] font-medium text-ink">
                  {vacuna.nombre_vacuna}
                </td>
                <td className="nums px-6 py-3 text-[12.5px] text-ink-soft">
                  {formatDate(vacuna.fecha_aplicacion, localeTag)}
                </td>
                <td className="nums px-6 py-3 text-[12.5px] text-ink-soft">
                  {formatDate(vacuna.fecha_vencimiento, localeTag)}
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
                    {vacuna.estado === "pendiente" ? t("carnet.vaccines.statusUpcoming") : vacuna.estado}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            title={t("carnet.vaccines.empty.title")}
            hint={t("carnet.vaccines.empty.hint")}
          />
        )}
      </div>
    </article>
  );
};

const CarnetDigital = () => {
  const { getProfile } = useAuth();
  const { t } = useTranslation();
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
        setError(messageFrom(cause, t));
        aviso.error(cause, { respaldo: t("carnet.loadErrorToast") });
      })
      .finally(() => setLoading(false));
  }, [getProfile, t]);

  const pet = pets.find((item) => item.id_mascota === selectedId) ?? null;
  const zone = profile?.zona
    ? `${profile.zona.nombre}, ${profile.zona.provincia}`
    : t("carnet.card.notRegisteredZone");

  const share = async () => {
    if (!pet) return;
    const text = t("carnet.share_.text", { nombre: pet.nombre, especie: pet.especie, raza: pet.raza, id: cardId(pet) });
    try {
      if (navigator.share) {
        await navigator.share({ title: t("carnet.share_.title", { nombre: pet.nombre }), text, url: window.location.href });
        aviso.ok(t("carnet.share_.shared"));
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        aviso.ok(t("carnet.share_.linkCopied"), {
          detalle: t("carnet.share_.linkCopiedDetail"),
        });
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        aviso.error(cause, {
          respaldo: t("carnet.share_.shareUnsupported"),
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
    aviso.dato(t("carnet.print.preparing", { nombre: pet.nombre }), {
      detalle: t("carnet.print.hint"),
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
        title={t("carnet.title")}
        subtitle={t("carnet.subtitle")}
        action={
          pet && (
            <div className="flex flex-wrap gap-1">
              <button type="button" className={btnSecondary} onClick={() => void share()}>
                <Share2 size={14} /> {t("carnet.share")}
              </button>
              <button type="button" className={btnPrimary} onClick={print}>
                <Download size={14} /> {t("carnet.savePdf")}
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
            title={t("carnet.empty.title")}
            hint={t("carnet.empty.hint")}
          />
          <div className="mt-4 text-center">
            <button type="button" className={btnPrimary} onClick={() => void navigate({ to: "/mascotas" })}>
              {t("carnet.empty.registerPet")}
            </button>
          </div>
        </section>
      )}

      {pet && (
        <>
          <div className="flex flex-wrap items-center gap-3 bg-surface px-5 py-4">
            <label htmlFor="card-pet" className="rotulo text-ink-mute">
              {t("carnet.petSelector.label")}
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
                {t("carnet.petSelector.printHint")}
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
              <CarneMascota pet={pet} profile={profile} zona={zone} papel />
            </div>,
            document.body,
          )}
        </>
      )}
    </Page>
  );
};

export default CarnetDigital;
