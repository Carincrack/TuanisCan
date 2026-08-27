import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, Download, PawPrint, Share2, Syringe } from "lucide-react";
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
  input,
} from "./ui";

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div className="bg-sunken px-4 py-3">
    <dt className="text-[10px] font-semibold tracking-[0.1em] text-ink-mute uppercase">{etiqueta}</dt>
    <dd className="nums mt-1 text-[13px] text-ink">{valor}</dd>
  </div>
);

const cardId = (pet: Pet) => {
  const initials = pet.nombre.replace(/[^a-záéíóúñ]/gi, "").slice(0, 3).toUpperCase();
  return `TSC-${pet.id_mascota.slice(0, 8).toUpperCase()}-${initials}`;
};

const messageFrom = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo cargar el carné digital.";

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
      .catch((cause) => setError(messageFrom(cause)))
      .finally(() => setLoading(false));
  }, [getProfile]);

  const pet = pets.find((item) => item.id_mascota === selectedId) ?? null;
  const alert = pet?.vacunas.some((vaccine) => vaccine.estado !== "vigente");
  const zone = profile?.zona
    ? `${profile.zona.nombre}, ${profile.zona.provincia}`
    : "No registrada";

  const share = async () => {
    if (!pet) return;
    const text = `Carné digital de ${pet.nombre} · ${pet.especie}, ${pet.raza} · ID ${cardId(pet)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Carné de ${pet.nombre}`, text, url: window.location.href });
        setNotice("Carné compartido.");
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        setNotice("Enlace copiado al portapapeles.");
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setNotice("No fue posible compartir el carné en este dispositivo.");
      }
    }
  };

  const print = () => {
    document.body.classList.add("printing-carnet");
    const cleanup = () => document.body.classList.remove("printing-carnet");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  };

  return (
    <Page>
      <PageHeader
        title="Carné digital"
        subtitle="Identificación, cuidados e historial de salud de tu mascota en un solo lugar."
        action={pet && <div className="flex flex-wrap gap-1"><button type="button" className={btnSecondary} onClick={() => void share()}><Share2 size={14} /> Compartir</button><button type="button" className={btnPrimary} onClick={print}><Download size={14} /> Guardar PDF</button></div>}
      />

      {error && <p role="alert" className="bg-danger-wash px-5 py-4 text-[13px] text-danger">{error}</p>}
      {loading && <div className="bg-surface px-6 py-10 text-center text-[13px] text-ink-soft">Cargando carnés…</div>}

      {!loading && !pets.length && (
        <section className="bg-surface p-5">
          <EmptyState title="No hay carnés disponibles" hint="Registra una mascota y su carné se creará automáticamente." />
          <div className="mt-4 text-center"><button type="button" className={btnPrimary} onClick={() => void navigate({ to: "/mascotas" })}>Registrar mascota</button></div>
        </section>
      )}

      {pet && (
        <>
          <div className="flex flex-wrap items-center gap-3 bg-surface px-5 py-4">
            <label htmlFor="card-pet" className="text-[12px] font-semibold text-ink-soft">Elegir mascota</label>
            <select id="card-pet" className={`${input} max-w-[260px]`} value={selectedId} onChange={(event) => { setSelectedId(event.target.value); sessionStorage.setItem("tuaniscan.carnetPetId", event.target.value); setNotice(""); }}>
              {pets.map((item) => <option key={item.id_mascota} value={item.id_mascota}>{item.nombre}</option>)}
            </select>
            {notice && <p role="status" className="ml-auto text-[12px] text-ok">{notice}</p>}
          </div>

          <article key={pet.id_mascota} className="carnet-print anim-rise bg-surface">
            <header className="flex flex-wrap items-center justify-between gap-4 bg-rail px-6 py-4">
              <div className="flex items-center gap-3">
                <img src={MARCA.logoSimbolo} alt="" aria-hidden className="h-8 w-8 object-contain" />
                <div><p className="text-[13px] font-semibold text-white">{MARCA.nombre}<span className="text-accent">{MARCA.acento}</span></p><p className="text-[10px] tracking-[0.14em] text-rail-mute uppercase">Carné de identificación y salud</p></div>
              </div>
              <p className="nums text-[12px] text-rail-text">{cardId(pet)}</p>
            </header>

            <div className="flex flex-col gap-5 p-6 sm:flex-row">
              <div className="flex flex-shrink-0 flex-col gap-3 sm:w-[196px]">
                {pet.fotoUrl ? <img src={pet.fotoUrl} alt={`Fotografía de ${pet.nombre}`} className="aspect-[3/4] w-full bg-sunken object-cover" /> : <div className="flex aspect-[3/4] w-full items-center justify-center bg-sunken text-ink-mute"><Camera size={42} strokeWidth={1.3} /><span className="sr-only">Sin fotografía</span></div>}
                <div className="flex items-center gap-3 bg-accent-wash px-4 py-3"><PawPrint size={32} strokeWidth={1.5} className="flex-shrink-0 text-accent-dark" /><p className="text-[11px] leading-snug text-accent-dark">Carné emitido por TuanisCan para la cuenta del responsable.</p></div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3"><h3 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">{pet.nombre}</h3><Badge tono={alert ? "warn" : pet.vacunas.length ? "ok" : "neutral"}>{alert ? "Requiere atención" : pet.vacunas.length ? "Al día" : "Sin vacunas"}</Badge></div>
                <p className="mt-1 text-[13px] text-ink-soft">{pet.especie} · {pet.raza}</p>
                <dl className="mt-5 grid grid-cols-2 gap-px bg-canvas sm:grid-cols-3">
                  <Dato etiqueta="Sexo" valor={pet.sexo === "macho" ? "Macho" : "Hembra"} />
                  <Dato etiqueta="Nacimiento" valor={formatDate(pet.fecha_nacimiento)} />
                  <Dato etiqueta="Edad" valor={petAge(pet.fecha_nacimiento)} />
                  <Dato etiqueta="Peso" valor={`${pet.peso} kg`} />
                  <Dato etiqueta="Color" valor={pet.color} />
                  <Dato etiqueta="Esterilizado" valor={pet.esterilizado ? "Sí" : "No"} />
                </dl>
                <dl className="mt-px grid grid-cols-1 gap-px bg-canvas sm:grid-cols-2">
                  <Dato etiqueta="Microchip" valor={pet.microchip || "No registrado"} />
                  <Dato etiqueta="Zona" valor={zone} />
                  <Dato etiqueta="Responsable" valor={profile?.nombre || "No registrado"} />
                  <Dato etiqueta="Teléfono" valor={profile?.telefono || "No registrado"} />
                  <Dato etiqueta="Veterinaria" valor={pet.veterinaria || "No registrada"} />
                  <Dato etiqueta="Alergias / condiciones" valor={pet.alergias || "Ninguna registrada"} />
                </dl>
                {pet.notas && <p className="mt-4 whitespace-pre-wrap bg-accent-wash px-4 py-3 text-[12.5px] leading-snug text-accent-dark">{pet.notas}</p>}
              </div>
            </div>

            <div className="px-6 pb-6">
              <h4 className="flex items-center gap-2 pb-3 text-[11px] font-semibold tracking-[0.1em] text-ink-mute uppercase"><Syringe size={13} /> Historial de vacunación</h4>
              {pet.vacunas.length ? (
                <Table caption={`Vacunas registradas de ${pet.nombre}`} columnas={[{ label: "Vacuna" }, { label: "Aplicada" }, { label: "Vence" }, { label: "Estado" }]}>
                  {pet.vacunas.map((vaccine) => <tr key={vaccine.id_vacuna}><td className="px-6 py-3 text-[13px] font-medium text-ink">{vaccine.nombre_vacuna}</td><td className="nums px-6 py-3 text-[12.5px] text-ink-soft">{formatDate(vaccine.fecha_aplicacion)}</td><td className="nums px-6 py-3 text-[12.5px] text-ink-soft">{formatDate(vaccine.fecha_vencimiento)}</td><td className="px-6 py-3"><Badge tono={vaccine.estado === "vigente" ? "ok" : vaccine.estado === "pendiente" ? "warn" : "danger"}>{vaccine.estado === "pendiente" ? "Por vencer" : vaccine.estado}</Badge></td></tr>)}
                </Table>
              ) : <EmptyState title="Sin vacunas registradas" hint="Agrega los registros desde Mis mascotas." />}
            </div>
          </article>
        </>
      )}
    </Page>
  );
};

export default CarnetDigital;
