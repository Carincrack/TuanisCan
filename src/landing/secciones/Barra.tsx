import { Menu } from "../../lib/iconos";
import BotonAccion from "../componentes/BotonAccion";
import { MARCA } from "../../lib/nav";
import { ENLACES } from "../datos";
import { CANVAS, NAVY, TINTA } from "../tokens";
import type { ConAcceso } from "../tipos";

/* Barra de la tarjeta del hero. Como en la referencia: enlaces a la
   izquierda en versalitas, el símbolo de la marca centrado, y las
   acciones a la derecha con un botón circular de menú al final.

   Los enlaces van en tinta y no en blanco: blanco sobre el azul
   suave da 2.7:1 y no pasa AA. La tinta da 6.0:1. */

interface BarraProps extends ConAcceso {
  onAbrirMenu: () => void;
}

const Barra = ({ onEntrar, onAbrirMenu }: BarraProps) => (
  <header
    data-entra="barra"
    className="relative flex h-20 shrink-0 items-center justify-between px-5 sm:h-24 sm:px-8"
  >
    <nav className="hidden items-center gap-7 md:flex">
      {ENLACES.map((e) => (
        <a
          key={e.href}
          href={e.href}
          className="rotulo transition-opacity duration-150 hover:opacity-60"
          style={{ color: TINTA }}
        >
          {e.label}
        </a>
      ))}
    </nav>

    {/* El símbolo, centrado sobre la tarjeta. */}
    <img
      src={MARCA.logoSimbolo}
      alt=""
      aria-hidden
      className="absolute left-1/2 h-11 w-11 -translate-x-1/2 object-contain sm:h-12 sm:w-12"
    />

    <div className="flex items-center gap-2.5">
      <BotonAccion
        variante="texto"
        tamano="sm"
        onClick={() => onEntrar("login")}
        className="hidden sm:inline-flex"
      >
        Iniciar sesión
      </BotonAccion>
      <BotonAccion tamano="sm" onClick={() => onEntrar("registro")}>
        Crear cuenta
      </BotonAccion>
      <button
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir menú"
        className="grid h-11 w-11 place-items-center rounded-full transition-transform duration-150 ease-out active:scale-[0.94] md:hidden"
        style={{ background: CANVAS, color: NAVY }}
      >
        <Menu size={19} strokeWidth={2.3} />
      </button>
    </div>
  </header>
);

export default Barra;
