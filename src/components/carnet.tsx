import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Download, PawPrint, Share2, Syringe } from "../lib/iconos";
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
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";

/* ─────────────────────────────────────────────────────────────
   EL CARNÉ

   Es un documento, no una pantalla: la misma pieza se mira en el
   navegador y se imprime, así que vive en un componente propio y se
   monta dos veces —una en la página y otra en una hoja aparte que
   solo existe en el papel—. Un solo diseño para los dos destinos; si
   se tocara solo el de pantalla, el impreso se quedaría atrás.
   ───────────────────────────────────────────────────────────── */

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

  return (
    /* `overflow-hidden` no es un detalle: sin él la cabecera navy saca
       sus esquinas cuadradas por fuera del radio de la tarjeta. */
    <article className="carnet-pieza anim-rise overflow-hidden rounded-[18px] bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-rail px-6 py-4">
        <div className="flex items-center gap-3">
          <img
            src={MARCA.logoSimbolo}
            alt=""
            aria-hidden
            className="h-8 w-8 object-contain"
          />
          <div>
            <p className="text-[13px] font-semibold text-white">
              {MARCA.nombre}
              <span className="text-accent">{MARCA.acento}</span>
            </p>
            <p className="rotulo text-rail-mute">
              Carné de identificación y salud
            </p>
          </div>
        </div>

        <p className="nums rounded-full bg-rail-hover px-3 py-1.5 text-[11.5px] font-medium text-rail-text">
          {cardId(pet)}
        </p>
      </header>

      <div className="flex flex-col gap-5 p-6 sm:flex-row">
        <div className="flex flex-shrink-0 flex-col gap-3 sm:w-[196px]">
          {pet.fotoUrl ? (
            <img
              src={pet.fotoUrl}
              alt={`Fotografía de ${pet.nombre}`}
              className="aspect-[3/4] w-full rounded-[14px] bg-sunken object-cover"
            />
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center rounded-[14px] bg-sunken text-ink-mute">
              <Camera size={42} strokeWidth={1.3} />
              <span className="sr-only">Sin fotografía</span>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-[14px] bg-accent-wash px-4 py-3">
            <PawPrint
              size={30}
              strokeWidth={1.5}
              className="flex-shrink-0 text-accent-dark"
            />
            <p className="text-[11px] leading-snug text-accent-dark">
              Carné emitido por TuanisCan para la cuenta del responsable.
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="titular text-[26px] text-ink">{pet.nombre}</h3>
            <Badge tono={alerta ? "warn" : pet.vacunas.length ? "ok" : "neutral"}>
              {alerta
                ? "Requiere atención"
                : pet.vacunas.length
                  ? "Al día"
                  : "Sin vacunas"}
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-ink-soft">
            {pet.especie} · {pet.raza}
          </p>

          {/* Los doce datos estaban en dos rejillas seguidas, de tres
              columnas y de dos, sin nada que dijera por qué se partían
              ahí. Son dos cosas distintas —quién es el animal, y a
              quién se llama si aparece— y ahora cada grupo lo dice. */}
          <div className="mt-5">
            <Grupo titulo="Identificación">
              <Dato
                etiqueta="Sexo"
                valor={pet.sexo === "macho" ? "Macho" : "Hembra"}
              />
              <Dato
                etiqueta="Nacimiento"
                valor={formatDate(pet.fecha_nacimiento)}
              />
              <Dato etiqueta="Edad" valor={petAge(pet.fecha_nacimiento)} />
              <Dato etiqueta="Peso" valor={`${pet.peso} kg`} />
              <Dato etiqueta="Color" valor={pet.color} />
              <Dato
                etiqueta="Esterilizado"
                valor={pet.esterilizado ? "Sí" : "No"}
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
                etiqueta="Microchip"
                valor={pet.microchip || "No registrado"}
              />
              <Dato
                etiqueta="Veterinaria"
                valor={pet.veterinaria || "No registrada"}
              />
              <Dato
                etiqueta="Alergias o condiciones"
                valor={pet.alergias || "Ninguna registrada"}
              />
            </Grupo>
          </div>

          {pet.notas && (
            <p className="mt-4 rounded-[14px] bg-accent-wash px-4 py-3 text-[12.5px] leading-snug whitespace-pre-wrap text-accent-dark">
              {pet.notas}
            </p>
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        <h4 className="rotulo flex items-center gap-2 pb-3 text-ink-mute">
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
