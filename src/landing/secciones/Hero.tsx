import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MARCA } from "../../lib/nav";
import Barra from "./Barra";
import ConmutadorPublico from "../componentes/ConmutadorPublico";
import PildoraCTA from "../componentes/PildoraCTA";
import { Correa, Rayas } from "../componentes/Garabatos";
import { PUBLICOS, type ClavePublico } from "../datos";
import { AZUL, CIELO, NAVY, TINTA } from "../tokens";
import type { ConAcceso } from "../tipos";

const LETRAS = [
  ...MARCA.nombre.toUpperCase().split("").map((letra) => ({ letra, color: NAVY })),
  ...MARCA.acento.toUpperCase().split("").map((letra) => ({ letra, color: CIELO })),
];

interface HeroProps extends ConAcceso {
  onAbrirMenu: () => void;
}

/** Cuánto se queda cada público antes de pasar al siguiente. Seis
    segundos alcanzan para leer la frase de entrada sin apuro. */
const PASO_MS = 6000;

const Hero = ({ onEntrar, onAbrirMenu }: HeroProps) => {
  const [publico, setPublico] = useState<ClavePublico>("dueno");
  const [quieto, setQuieto] = useState(false);
  /* Cambia cada vez que alguien elige a mano: reinicia la cuenta, así
     lo que eligió no se va a los dos segundos. */
  const [vuelta, setVuelta] = useState(0);
  const actual = PUBLICOS.find((p) => p.clave === publico) ?? PUBLICOS[0];
  const navegar = useNavigate();

  /* Carrusel: pasa solo por los tres públicos, en orden, y vuelve al
     primero. Se frena mientras el cursor o el foco están sobre los
     botones de abajo —nadie quiere que el botón cambie justo cuando
     lo va a tocar—, no sobre todo el hero: ocupa la pantalla entera
     y con el cursor encima no giraría nunca. Tampoco arranca si el
     sistema pide menos movimiento. */
  useEffect(() => {
    if (quieto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setPublico((clave) => {
        const i = PUBLICOS.findIndex((p) => p.clave === clave);
        return PUBLICOS[(i + 1) % PUBLICOS.length].clave;
      });
    }, PASO_MS);

    return () => window.clearInterval(id);
  }, [quieto, vuelta]);

  const elegir = (clave: ClavePublico) => {
    setPublico(clave);
    setVuelta((n) => n + 1);
  };

  return (
    <section
      className="banda-hero relative z-10 flex min-h-dvh flex-col overflow-x-clip"
      style={{ background: AZUL }}
    >
      <Barra onEntrar={onEntrar} onAbrirMenu={onAbrirMenu} />

      {/* ── Marca y entrada ──
          El texto sube acá, encima del perro, y no queda flotando
          sobre su pecho donde no se leería. */}
      <div className="relative z-20 shrink-0">
        {/* `aria-hidden` porque la marca ya la anuncia el símbolo de la
            barra: repetirla haría que un lector de pantalla la lea dos
            veces seguidas. */}
        <h1 className="flex justify-center px-4">
          <span data-anim="marca" className="wordmark marca-mascara" aria-hidden>
            {LETRAS.map(({ letra, color }, indice) => (
              <span key={`${letra}-${indice}`} className="letra" style={{ color }}>
                {letra}
              </span>
            
            ))}
          </span>
          <span className="sr-only">
            {MARCA.completo} — paseos, veterinarias y mascotas perdidas en Costa Rica
          </span>
        </h1>

        <div data-entra="entrada" className="mx-auto max-w-xl px-6 pt-4 text-center">
          <p
            className="min-h-[4.5rem] text-[15.5px] leading-relaxed font-medium sm:min-h-[3.5rem]"
            style={{ color: TINTA }}
          >
            {actual.entrada}
          </p>
        </div>
      </div>

      {/* ── Escenario del perro ── */}
      <div className="relative min-h-0 flex-1">
        {/* Un recorte por público, apilados, y el conmutador funde de uno
            al otro. Con un solo `<img>` cambiando de `src` el navegador
            vacía el cuadro mientras descarga y el hero parpadearía en el
            primer cambio; montados los dos, el segundo ya está listo
            cuando se pulsa el botón.

            La entrada de GSAP va en la caja de afuera y el fundido en los
            `<img>` de adentro. No es cosmético: ese tween anima `opacity`
            y la deja escrita en el estilo en línea, que le gana a
            cualquier clase — sobre los propios recortes dejaría al
            escondido visible para siempre.

            El activo es el elemento más grande de la primera pantalla y
            por lo tanto el que decide el LCP: se pide con prioridad alta.
            El otro va con prioridad baja para que no le compita por el
            ancho de banda mientras carga la portada. */}
        <div data-entra="perro" className="absolute inset-0 z-10">
          {PUBLICOS.map(({ clave, foto, fotoAlt }) => {
            const visible = clave === publico;
            return (
              <img
                key={clave}
                src={foto}
                alt={visible ? fotoAlt : ""}
                aria-hidden={!visible || undefined}
                fetchPriority={clave === "dueno" ? "high" : "low"}
                decoding="async"
                data-visible={visible || undefined}
                className="perro-hero absolute inset-0 h-full w-full object-contain object-bottom lg:h-[calc(100%+clamp(30px,4vw,62px))]"
              />
            );
          })}
        </div>

        <Rayas className="absolute bottom-[34%] left-[6%] z-20 w-[6cqw] max-w-[130px] min-w-[48px] sm:left-[14%] lg:left-[20%]" />
        <Correa className="absolute bottom-[6%] left-[70%] z-20 w-[26cqw] max-w-[420px] min-w-[170px] -translate-x-2/7"/>
      </div>

      {/* ── Píldoras ──
          Desde `lg` se despegan y flotan en las esquinas de la banda,
          con el perro pasando por detrás. En móvil van en flujo y
          apiladas: superpuestas sobre una pantalla angosta taparían
          al perro entero. */}
      <div
        data-entra="pildoras"
        onPointerEnter={() => setQuieto(true)}
        onPointerLeave={() => setQuieto(false)}
        onFocus={() => setQuieto(true)}
        onBlur={(evento) => {
          if (!evento.currentTarget.contains(evento.relatedTarget)) setQuieto(false);
        }}
        className="relative z-30 flex flex-col items-center gap-3 px-5 pt-4 pb-6 sm:px-8 sm:pb-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:flex-row lg:items-end lg:justify-between lg:pt-0"
      >
        <PildoraCTA
          onClick={() =>
            actual.ruta ? void navegar({ to: actual.ruta }) : onEntrar("registro")
          }
        >
          {actual.cta}
        </PildoraCTA>
        <ConmutadorPublico valor={publico} onCambio={elegir} />
      </div>
    </section>
  );
};

export default Hero;
