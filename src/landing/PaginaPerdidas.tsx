import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "../lib/iconos";
import { MARCA } from "../lib/nav";
import { usePortadaAnimacion } from "./animacion";
import { AZUL, CANVAS, NAVY, TINTA } from "./tokens";

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

const PaginaPerdidas = () => {
  const raiz = useRef<HTMLDivElement>(null);
  usePortadaAnimacion(raiz);

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
            Inicio
          </Link>

          <Link
            to="/"
            aria-label={`${MARCA.completo}, volver al inicio`}
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
            Comunidad
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
          Las que se perdieron cerca de vos. Si viste alguna, podés avisarle a su dueño desde su ficha.
          </p>
        </div>
      </section>

      <main className="px-5 py-12 sm:px-8">
        <h1>Aquí van a estar las mascotas perdidas</h1>
      </main>
    </div>
  );
};

export default PaginaPerdidas;
