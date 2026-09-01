import { X } from "../../lib/iconos";
import BotonAccion from "../componentes/BotonAccion";
import { MARCA } from "../../lib/nav";
import { ENLACES } from "../datos";
import { AZUL, CANVAS, NAVY, TURQUESA } from "../tokens";
import type { ConAcceso } from "../tipos";

/* Menú a pantalla completa, sobre el mismo azul suave del hero.
   Los enlaces van a escala de titular: con dos entradas, el tamaño
   es la jerarquía. El bloqueo del scroll y la tecla Escape los
   maneja `useMenuMovil`. */

interface MenuMovilProps extends ConAcceso {
  onCerrar: () => void;
  irA: (href: string) => void;
}

const MenuMovil = ({ onEntrar, onCerrar, irA }: MenuMovilProps) => (
  <div
    className="fixed inset-0 z-50 overflow-y-auto md:hidden"
    style={{ background: AZUL }}
  >
    <div className="flex min-h-full flex-col px-6 pt-5 pb-8">
      <div className="flex items-center justify-between">
        <img
          src={MARCA.logoSimbolo}
          alt=""
          aria-hidden
          className="h-11 w-11 object-contain"
        />
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar menú"
          className="grid h-12 w-12 place-items-center rounded-full transition-transform duration-150 ease-out active:scale-[0.94]"
          style={{ background: CANVAS, color: NAVY }}
        >
          <X size={21} strokeWidth={2.3} />
        </button>
      </div>

      <nav className="mt-16 grid gap-3">
        {ENLACES.map((e) => (
          <button
            key={e.href}
            type="button"
            onClick={() => irA(e.href)}
            className="display text-left text-[38px] leading-none transition-transform duration-150 ease-out active:translate-x-1"
            style={{ color: NAVY }}
          >
            {e.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto grid gap-2.5 pt-14">
        <BotonAccion
          tamano="lg"
          bloque
          onClick={() => {
            onCerrar();
            onEntrar("registro");
          }}
        >
          Crear cuenta gratis
        </BotonAccion>
        <BotonAccion
          variante="contorno"
          tamano="lg"
          bloque
          onClick={() => {
            onCerrar();
            onEntrar("login");
          }}
        >
          Ya tengo cuenta
        </BotonAccion>
      </div>

      <span
        aria-hidden
        className="mt-10 h-1.5 w-16 rounded-full"
        style={{ background: TURQUESA }}
      />
    </div>
  </div>
);

export default MenuMovil;
