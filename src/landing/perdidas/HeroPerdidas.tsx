import { Link } from "@tanstack/react-router";
import { ArrowLeft, PawPrint } from "../../lib/iconos";
import { MARCA } from "../../lib/nav";
import BotonAccion from "../componentes/BotonAccion";
import ConmutadorIdioma from "../componentes/ConmutadorIdioma";
import { AZUL, CANVAS, NAVY, TINTA, TURQUESA } from "../tokens";
import type { ConAcceso } from "../tipos";
import { useTranslation } from "../../hooks/useTranslation";

/* ─────────────────────────────────────────────────────────────
   La banda de arriba de /perdidas.

   Es la de siempre: azul de la portada, "Inicio" a la izquierda, el
   símbolo centrado y el título en dos renglones con la letra del
   wordmark. Así el clic desde la portada se siente como seguir en el
   mismo lugar y no como salir a otra app.

   Pulida en tres cosas: a la derecha va la cuenta —la barra quedaba
   coja, con todo el peso a la izquierda—, el título es un `h1` de
   verdad (antes era un párrafo escondido a los lectores de pantalla
   y la página no tenía título), y debajo de la frase va cuántos
   reportes hay.

   Cada renglón del título es su propia máscara: `usePortadaAnimacion`
   hace subir las letras de "PERDIDAS" desde detrás de su propio
   borde, no desde el de "MASCOTAS".
   ───────────────────────────────────────────────────────────── */

interface HeroPerdidasProps extends ConAcceso {
  conSesion: boolean;
  onMiCuenta: () => void;
  /** Cuántos reportes hay. `null` mientras cargan o si fallaron. */
  total: number | null;
}

/* ── Los adornos de los lados ──
   Los mismos recortes sin fondo de la portada, repartidos en el azul
   que el título deja libre a cada lado.

   Los animales asoman desde abajo: el golden a la izquierda, el gato
   a la derecha. Sus fotos terminan en un corte recto a la altura del
   pecho, así que bajan un poco más allá de la banda y la `tapa` de la
   onda del tablero (que se pinta por encima) se los come por la curva.
   Bajan el 90% del alto de esa onda: la curva, aun cuando el scroll la
   hunde del todo (`RECORRIDO`, el 85%), siempre queda por encima del
   corte, y el corte siempre queda dentro de la tapa. Entran con la foto
   del hero de la portada (`data-entra="perro"`): suben y aparecen.

   Arriba, los dos juguetes y, más cerca del título, dos croquetas, con
   el mismo parallax de las bandas de la portada. El giro de reposo va
   en el `<img>` y el parallax en la caja de afuera (por qué, en
   `secciones/Servicios.tsx`).

   En el teléfono todo se achica a lo que cabe en las orillas: los
   animales, en las esquinas de abajo, a los lados de la píldora de la
   cuenta (no la tocan: la píldora llega hasta 80 px del borde); los
   juguetes, arriba, a los lados de "Comunidad" y por encima del
   título. Desde `lg` cada cosa toma su tamaño. Las croquetas, recién
   desde `xl`, que es cuando sobra aire entre el título y los juguetes. */
const BAJADA = "calc(-0.9 * clamp(44px, 6vw, 88px))";

const Adornos = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
    <img
      data-entra="perro"
      src="/img/golden.webp"
      alt=""
      decoding="async"
      className="absolute left-[1%] w-[clamp(78px,16vw,290px)] lg:left-[3%]"
      style={{ bottom: BAJADA }}
    />
    <img
      data-entra="perro"
      src="/img/gato-angora.webp"
      alt=""
      decoding="async"
      className="absolute right-[1%] w-[clamp(74px,15vw,275px)] lg:right-[3%]"
      style={{ bottom: BAJADA }}
    />

    <div
      data-par="-36"
      data-par-rot="-4"
      className="absolute top-[82px] left-[4%] w-[58px] sm:top-[92px] sm:w-[84px] lg:top-[19%] lg:w-[clamp(140px,13vw,220px)]"
    >
      <img src="/img/juguete-cuerda.webp" alt="" decoding="async" className="w-full -rotate-12" />
    </div>
    <div
      data-par="40"
      data-par-rot="3"
      className="absolute top-[78px] right-[3%] w-[58px] sm:top-[88px] sm:w-[84px] lg:top-[16%] lg:w-[clamp(140px,13vw,220px)]"
    >
      <img src="/img/juguete-plumas.webp" alt="" decoding="async" className="w-full rotate-6" />
    </div>

    <div
      data-par="-22"
      data-par-rot="6"
      className="absolute top-[46%] left-[15%] hidden w-[clamp(56px,5vw,84px)] xl:block"
    >
      <img src="/img/croqueta.webp" alt="" decoding="async" className="w-full rotate-[24deg]" />
    </div>
    <div
      data-par="26"
      data-par-rot="-5"
      className="absolute top-[50%] right-[14%] hidden w-[clamp(56px,5vw,84px)] xl:block"
    >
      <img src="/img/croqueta-mordida.webp" alt="" decoding="async" className="w-full -rotate-12" />
    </div>
  </div>
);

const HeroPerdidas = ({ onEntrar, conSesion, onMiCuenta, total }: HeroPerdidasProps) => {
  const { t } = useTranslation();
  const renglones = [t("landingPerdidas.titulo.linea1"), t("landingPerdidas.titulo.linea2")];

  return (
    /* `z-10` y sin `overflow` vertical: los animales bajan por fuera de
       la banda hasta la onda del tablero, cuya tapa va en `z-20`.
       `overflow-x-clip` corta solo a los lados, por si un recorte se
       pasa del borde de la pantalla. */
    <section className="relative z-10 overflow-x-clip" style={{ background: AZUL }}>
      <Adornos />

      <header
        data-entra="barra"
        className="relative flex h-20 items-center justify-between px-5 sm:h-24 sm:px-8"
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
          <img src={MARCA.logoSimbolo} alt="" className="h-11 w-11 object-contain sm:h-12 sm:w-12" />
        </Link>

        <div className="flex items-center gap-2.5">
          {conSesion ? (
            <BotonAccion tamano="sm" onClick={onMiCuenta}>
              {t("landingPerdidas.miCuenta")}
            </BotonAccion>
          ) : (
            <>
              <BotonAccion
                variante="texto"
                tamano="sm"
                onClick={() => onEntrar("login")}
                className="max-md:hidden"
              >
                {t("landing.barra.login")}
              </BotonAccion>
              <BotonAccion tamano="sm" onClick={() => onEntrar("registro")}>
                {t("landing.barra.signup")}
              </BotonAccion>
            </>
          )}
          <ConmutadorIdioma className="ml-1 hidden lg:flex" />
        </div>
      </header>

      <div className="relative px-5 pt-6 pb-16 text-center sm:px-8 sm:pt-10 sm:pb-24">
        <p data-entra="entrada" className="rotulo" style={{ color: TINTA }}>
          {t("landingPerdidas.antetitulo")}
        </p>
        <h1
          className="mt-3 flex flex-col items-center leading-[0.9] tracking-[-0.035em]"
          style={{
            color: NAVY,
            fontFamily: 'Archivo, "Instrument Sans", sans-serif',
            fontVariationSettings: '"wdth" 112, "wght" 900',
            fontSize: "clamp(40px, 9vw, 128px)",
          }}
        >
          {renglones.map((renglon) => (
            <span key={renglon} data-anim="marca" className="marca-mascara" aria-hidden>
              {renglon
                .toUpperCase()
                .split("")
                .map((letra, indice) => (
                  <span key={indice} className="letra">
                    {letra}
                  </span>
                ))}
            </span>
          ))}
          <span className="sr-only">{renglones.join(" ")}</span>
        </h1>
        <p
          data-entra="entrada"
          className="mx-auto mt-6 max-w-md text-[15.5px] leading-relaxed font-medium"
          style={{ color: TINTA }}
        >
          {t("landingPerdidas.subtitle")}
        </p>

        {/* La cuenta llega cuando terminan de cargar los reportes, con
            su propio fundido: la entrada del título ya corrió. El alto
            queda reservado mientras tanto para que la banda no crezca
            de golpe. */}
        <div className="mt-7 flex h-12 justify-center">
          {total !== null && total > 0 && (
            <div
              className="anim-fade rotulo inline-flex items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5"
              style={{ background: CANVAS, color: NAVY }}
            >
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                style={{ background: TURQUESA }}
              >
                <PawPrint size={15} strokeWidth={2.2} style={{ color: NAVY }} />
              </span>
              {t("landingPerdidas.resultsCount", { n: total })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroPerdidas;
