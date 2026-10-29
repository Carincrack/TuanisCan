import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, PawPrint } from "../../lib/iconos";
import Onda from "../componentes/Onda";
import Boronas from "../componentes/Boronas";
import EncabezadoSeccion from "../componentes/EncabezadoSeccion";
import { CIELO, HUESO, NAVY, TINTA_SUAVE, TURQUESA } from "../tokens";
import { useTranslation } from "../../hooks/useTranslation";
import { listPublicLostPets } from "../../services/lost-pets.service";
import type { PublicLostPet } from "../../types/lost-pet.types";
import { distritoDe, normalizar } from "../../lib/zonas";

/* ─────────────────────────────────────────────────────────────
   Las mascotas perdidas, de paso por la portada. Banda blanca
   entre "Cómo funciona" y "Empezá hoy": las dos hablan de lo que
   la plataforma promete, y esta banda muestra que ya hay gente
   usándola para algo real — no es un cuarto paso, es la prueba de
   que los tres anteriores funcionan.

   Las fichas NO son las tarjetas de la aplicación. En la vitrina
   pública (`/perdidas`) una ficha es una herramienta —se abre, se
   compara, se filtra—; acá es una fotografía que alguien dejó
   pegada en la banda, como un volante real en un poste. Por eso
   llevan borde blanco grueso y un giro propio cada una: una polaroid
   tirada sobre la mesa, no una fila de tarjetas de catálogo.

   Se mueven solas — el mismo truco CSS de /perdidas, la fila
   duplicada deslizándose hasta la mitad de su propio ancho — y no
   llevan ninguna acción propia: tocar una no hace nada, porque no
   son controles. El único lugar al que lleva esta banda es al
   final, con un solo botón: "Ver mascotas perdidas".
   ───────────────────────────────────────────────────────────── */

const GIROS = [-3, 2.5, -2, 3, -2.5, 2, -3.5, 2.5];

const zonaLabel = (zona: PublicLostPet["zona"], t: ReturnType<typeof useTranslation>["t"]) => {
  if (!zona) return t("landing.mascotasPerdidas.noZone");
  const partes = [distritoDe(zona), zona.canton, zona.provincia]
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => Boolean(parte));
  return partes
    .filter((parte, i) => i === 0 || normalizar(parte) !== normalizar(partes[i - 1]))
    .join(", ");
};

const MascotasRecientes = () => {
  const { t } = useTranslation();
  const [mascotas, setMascotas] = useState<PublicLostPet[]>([]);

  useEffect(() => {
    let vigente = true;
    listPublicLostPets()
      .then((data) => {
        if (vigente) setMascotas(data.slice(0, 8));
      })
      .catch(() => {
        /* Es una vitrina de paso, no la pantalla de mascotas perdidas:
           si falla, la banda se achica sola (ver el `if` de abajo) en
           vez de mostrar un error en medio de la portada. */
      });
    return () => {
      vigente = false;
    };
  }, []);

  /* Con menos de dos no hay nada que hacer rodar: una sola ficha
     quieta no es un carrusel, es una ficha suelta. */
  if (mascotas.length < 2) return null;

  const fila = [...mascotas, ...mascotas];

  return (
    <section
      className="relative overflow-hidden px-6 pt-32 pb-28 sm:px-10 lg:px-14 lg:pt-40 lg:pb-32"
      style={{ background: HUESO }}
    >
      <Onda color={CIELO} />

      {/* Sin esto la banda quedaba demasiado blanca al lado de "Pasos"
          (celeste) y "Cierre" (con su correa y sus croquetas): las
          mismas migas borrosas que ya rellenan esos márgenes en toda
          la portada, con otro recorte para no repetir el patrón. */}
      <Boronas desde={5} />

      <div className="relative z-10 mx-auto max-w-[1100px] text-center">
        <EncabezadoSeccion
          antetitulo={t("landing.mascotasPerdidas.antetitulo")}
          lineas={[t("landing.mascotasPerdidas.linea1"), t("landing.mascotasPerdidas.linea2")]}
          subrayada={t("landing.mascotasPerdidas.subrayada")}
        />
      </div>

      {/* `overflow-x-hidden` sin tocar el eje vertical: con
          `overflow-hidden` a secas, la caja se ajustaba al alto de la
          fila y le cortaba la sombra a cualquier ficha que, girada,
          asomara un par de píxeles de más por arriba o por abajo —se
          veía una sombra con un borde recto y el resto difuminado,
          literalmente partida. Dejando el alto libre, la sombra sale
          entera sin que haga falta adivinar cuánto espacio de más
          darle arriba y abajo. */}
      <div className="carrusel-desvanece relative z-10 mt-14 overflow-x-hidden sm:mt-16">
        <div className="anim-carrusel flex w-max gap-9 py-6">
          {fila.map((mascota, i) => (
            <figure
              key={`${mascota.id_mascota_perdida}-${i}`}
              aria-hidden={i >= mascotas.length}
              className="w-[210px] shrink-0 sm:w-[250px]"
              style={{ rotate: `${GIROS[i % GIROS.length]}deg` }}
            >
              <div className="rounded-[10px] bg-white p-3 shadow-[0_16px_28px_-10px_rgba(20,36,46,0.25)]">
                <div className="relative overflow-hidden rounded-[6px]">
                  <img
                    src={mascota.fotoUrl ?? "/mock/dog-nube.jpg"}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full bg-[#eef2f4] object-cover"
                  />
                  <span
                    aria-hidden
                    className="absolute -top-3 -right-3 grid h-9 w-9 place-items-center rounded-full shadow-[0_4px_10px_rgba(20,36,46,0.3)]"
                    style={{ background: TURQUESA, rotate: `${-GIROS[i % GIROS.length]}deg` }}
                  >
                    <PawPrint size={15} strokeWidth={2.2} style={{ color: NAVY }} />
                  </span>
                </div>

                <p className="display mt-3 truncate text-[15px]" style={{ color: NAVY }}>
                  {mascota.nombre}
                </p>
                <p
                  className="mt-0.5 flex items-center gap-1 truncate text-[11.5px]"
                  style={{ color: TINTA_SUAVE }}
                >
                  <MapPin size={11} strokeWidth={2} aria-hidden className="shrink-0" />
                  {zonaLabel(mascota.zona, t)}
                </p>
              </div>
            </figure>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-12 flex justify-center sm:mt-14">
        <Link
          to="/perdidas"
          className="group inline-flex items-center gap-4 rounded-full py-2 pr-2 pl-6 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-18px_rgba(26,66,87,0.55)] active:scale-[0.97]"
          style={{ background: NAVY, color: HUESO }}
        >
          <span className="text-[15px] font-bold">{t("landing.mascotasPerdidas.cta")}</span>
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            style={{ background: TURQUESA }}
          >
            <ArrowRight size={19} strokeWidth={2.6} style={{ color: NAVY }} />
          </span>
        </Link>
      </div>
    </section>
  );
};

export default MascotasRecientes;
