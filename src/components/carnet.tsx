import { useState } from "react";
import { Download, QrCode, Share2, Syringe } from "lucide-react";
import {
  Badge,
  FilterTabs,
  Page,
  PageHeader,
  Table,
  btnPrimary,
  btnSecondary,
} from "./ui";
import { MARCA } from "../lib/nav";

/* Carnet digital: la ficha que el dueño muestra en la veterinaria o al
   entregar la mascota al paseador. Un solo bloque, alto contraste,
   legible desde el teléfono de otra persona. */

interface Vacuna {
  nombre: string;
  aplicada: string;
  vence: string;
  estado: "Vigente" | "Por vencer" | "Vencida";
}

interface Carnet {
  id: string;
  nombre: string;
  foto: string;
  especie: string;
  raza: string;
  sexo: string;
  nacimiento: string;
  edad: string;
  peso: string;
  color: string;
  microchip: string;
  esterilizado: string;
  zona: string;
  dueno: string;
  telefono: string;
  veterinaria: string;
  alergias: string;
  notas: string;
  vacunas: Vacuna[];
}

const carnets: Carnet[] = [
  {
    id: "TSC-0001-RCK",
    nombre: "Rocky",
    foto: "/mock/dog-rocky.jpg",
    especie: "Perro",
    raza: "Labrador Retriever",
    sexo: "Macho",
    nacimiento: "12/04/2023",
    edad: "3 años",
    peso: "28 kg",
    color: "Dorado",
    microchip: "506 0012 4478 901",
    esterilizado: "Sí",
    zona: "Curridabat, San José",
    dueno: "Ana Corrales",
    telefono: "8712-4490",
    veterinaria: "Veterinaria San Rafael",
    alergias: "Ninguna registrada",
    notas: "Tira un poco de la correa al inicio. Muy sociable con otros perros.",
    vacunas: [
      { nombre: "Antirrábica", aplicada: "02/03/2026", vence: "02/03/2027", estado: "Vigente" },
      { nombre: "Parvovirus", aplicada: "15/01/2026", vence: "15/01/2027", estado: "Vigente" },
      { nombre: "Moquillo", aplicada: "15/01/2026", vence: "15/01/2027", estado: "Vigente" },
      { nombre: "Desparasitación", aplicada: "01/07/2026", vence: "01/10/2026", estado: "Vigente" },
    ],
  },
  {
    id: "TSC-0002-MCH",
    nombre: "Michi",
    foto: "/mock/cat-1.jpg",
    especie: "Gato",
    raza: "Doméstico pelo corto",
    sexo: "Macho",
    nacimiento: "20/06/2024",
    edad: "2 años",
    peso: "4.2 kg",
    color: "Atigrado café",
    microchip: "506 0012 5590 233",
    esterilizado: "Sí",
    zona: "Curridabat, San José",
    dueno: "Ana Corrales",
    telefono: "8712-4490",
    veterinaria: "Veterinaria San Rafael",
    alergias: "Pollo",
    notas: "Se esconde con ruidos fuertes. No sacar sin transportadora.",
    vacunas: [
      { nombre: "Antirrábica", aplicada: "28/08/2025", vence: "28/08/2026", estado: "Por vencer" },
      { nombre: "Triple felina", aplicada: "10/02/2026", vence: "10/02/2027", estado: "Vigente" },
      { nombre: "Leucemia felina", aplicada: "10/02/2026", vence: "10/02/2027", estado: "Vigente" },
      { nombre: "Desparasitación", aplicada: "05/05/2026", vence: "05/08/2026", estado: "Vencida" },
    ],
  },
  {
    id: "TSC-0003-LNA",
    nombre: "Luna",
    foto: "/mock/dog-luna.jpg",
    especie: "Perro",
    raza: "Border Collie",
    sexo: "Hembra",
    nacimiento: "03/09/2021",
    edad: "5 años",
    peso: "19 kg",
    color: "Blanco y negro",
    microchip: "506 0011 8834 117",
    esterilizado: "Sí",
    zona: "Escazú, San José",
    dueno: "Ana Corrales",
    telefono: "8712-4490",
    veterinaria: "Spa Canino Escazú",
    alergias: "Ninguna registrada",
    notas: "Necesita mucha actividad; ideal paseos de 60 min.",
    vacunas: [
      { nombre: "Antirrábica", aplicada: "18/05/2026", vence: "18/05/2027", estado: "Vigente" },
      { nombre: "Parvovirus", aplicada: "18/05/2026", vence: "18/05/2027", estado: "Vigente" },
      { nombre: "Moquillo", aplicada: "18/05/2026", vence: "18/05/2027", estado: "Vigente" },
      { nombre: "Desparasitación", aplicada: "20/06/2026", vence: "20/09/2026", estado: "Vigente" },
    ],
  },
];

const tonoVacuna = (e: Vacuna["estado"]) =>
  e === "Vigente" ? "ok" : e === "Por vencer" ? "warn" : "danger";

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div className="bg-sunken px-4 py-3">
    <dt className="text-[10px] font-semibold tracking-[0.1em] text-ink-mute uppercase">
      {etiqueta}
    </dt>
    <dd className="nums mt-1 text-[13px] text-ink">{valor}</dd>
  </div>
);

const CarnetDigital = () => {
  const [nombre, setNombre] = useState(carnets[0].nombre);
  const c = carnets.find((x) => x.nombre === nombre) ?? carnets[0];

  const alerta = c.vacunas.find((v) => v.estado !== "Vigente");

  return (
    <Page>
      <PageHeader
        title="Carnet digital"
        subtitle="La ficha oficial de tu mascota. Muéstrala en la veterinaria o al entregarla al paseador."
        action={
          <div className="flex gap-px">
            <button type="button" className={btnSecondary}>
              <Share2 size={14} strokeWidth={1.9} />
              Compartir
            </button>
            <button type="button" className={btnPrimary}>
              <Download size={14} strokeWidth={1.9} />
              Descargar PDF
            </button>
          </div>
        }
      />

      <div className="bg-surface">
        <FilterTabs
          label="Elegir mascota"
          options={carnets.map((x) => x.nombre)}
          value={nombre}
          onChange={setNombre}
        />
      </div>

      {/* ── El carnet ── */}
      <article key={c.id} className="anim-rise bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-4 bg-rail px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={MARCA.logoSimbolo}
              alt=""
              aria-hidden
              className="h-8 w-8 object-contain"
            />
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.01em] text-white">
                {MARCA.nombre}
                <span className="text-accent">{MARCA.acento}</span>
              </p>
              <p className="text-[10px] tracking-[0.14em] text-rail-mute uppercase">
                Carnet de identificación
              </p>
            </div>
          </div>
          <p className="nums text-[12px] text-rail-text">{c.id}</p>
        </header>

        <div className="flex flex-col gap-5 p-6 sm:flex-row">
          <div className="flex flex-shrink-0 flex-col gap-3 sm:w-[196px]">
            <img
              src={c.foto}
              alt={`Fotografía de ${c.nombre}`}
              className="aspect-[3/4] w-full bg-sunken object-cover"
            />
            {/* Marcador de QR: la generación real llega con el backend. */}
            <div className="flex items-center gap-3 bg-sunken px-4 py-3">
              <QrCode
                size={38}
                strokeWidth={1.3}
                aria-hidden
                className="flex-shrink-0 text-ink"
              />
              <p className="text-[11px] leading-snug text-ink-soft">
                Escanea para verificar este carnet en línea.
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">
                {c.nombre}
              </h3>
              <Badge tono={alerta ? "warn" : "ok"}>
                {alerta ? "Requiere atención" : "Al día"}
              </Badge>
            </div>
            <p className="mt-1 text-[13px] text-ink-soft">
              {c.especie} · {c.raza}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-px bg-canvas sm:grid-cols-3">
              <Dato etiqueta="Sexo" valor={c.sexo} />
              <Dato etiqueta="Nacimiento" valor={c.nacimiento} />
              <Dato etiqueta="Edad" valor={c.edad} />
              <Dato etiqueta="Peso" valor={c.peso} />
              <Dato etiqueta="Color" valor={c.color} />
              <Dato etiqueta="Esterilizado" valor={c.esterilizado} />
            </dl>

            <dl className="mt-px grid grid-cols-1 gap-px bg-canvas sm:grid-cols-2">
              <Dato etiqueta="Microchip" valor={c.microchip} />
              <Dato etiqueta="Zona" valor={c.zona} />
              <Dato etiqueta="Dueño" valor={c.dueno} />
              <Dato etiqueta="Teléfono de contacto" valor={c.telefono} />
              <Dato etiqueta="Veterinaria" valor={c.veterinaria} />
              <Dato etiqueta="Alergias" valor={c.alergias} />
            </dl>

            <p className="mt-4 bg-accent-wash px-4 py-3 text-[12.5px] leading-snug text-accent-dark">
              {c.notas}
            </p>
          </div>
        </div>

        <div className="px-6 pb-6">
          <h4 className="flex items-center gap-2 pb-3 text-[11px] font-semibold tracking-[0.1em] text-ink-mute uppercase">
            <Syringe size={13} strokeWidth={1.9} aria-hidden />
            Historial de vacunación
          </h4>

          <Table
            caption={`Vacunas registradas de ${c.nombre}`}
            columnas={[
              { label: "Vacuna" },
              { label: "Aplicada" },
              { label: "Vence" },
              { label: "Estado" },
            ]}
          >
            {c.vacunas.map((v) => (
              <tr key={v.nombre}>
                <td className="px-6 py-3 text-[13px] font-medium text-ink">
                  {v.nombre}
                </td>
                <td className="nums px-6 py-3 text-[12.5px] text-ink-soft">
                  {v.aplicada}
                </td>
                <td className="nums px-6 py-3 text-[12.5px] text-ink-soft">
                  {v.vence}
                </td>
                <td className="px-6 py-3">
                  <Badge tono={tonoVacuna(v.estado)}>{v.estado}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </article>
    </Page>
  );
};

export default CarnetDigital;
