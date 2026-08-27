import Onda from "../componentes/Onda";
import { MARCA } from "../../lib/nav";
import { ENLACES } from "../datos";
import { CANVAS, HUESO } from "../tokens";

/* El pie va sobre el fondo de la página: es el único bloque que no
   trae su propia banda de color.

   Lo cierra la última onda: el blanco del bloque de arriba se
   derrama sobre el azul de la página. Es el mismo borde de todas
   las bandas, así que la portada termina como empezó.

   Lleva el aviso de derechos completo. "Costa Rica · 2026" no
   reserva nada; la línea de abajo sí dice de quién es la marca y
   qué se reserva. */

const Pie = () => (
  <footer className="relative overflow-hidden px-6 pt-32 pb-10 sm:px-10">
    <Onda color={HUESO} />

    <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-3">
        <img
          src={MARCA.logoSimbolo}
          alt=""
          aria-hidden
          className="h-9 w-9 object-contain"
        />
        <span className="display text-[16px]" style={{ color: CANVAS }}>
          {MARCA.completo}
        </span>
      </span>

      <nav className="flex flex-wrap items-center gap-6">
        {ENLACES.map((e) => (
          <a
            key={e.href}
            href={e.href}
            className="rotulo transition-opacity duration-150 hover:opacity-60"
            style={{ color: CANVAS }}
          >
            {e.label}
          </a>
        ))}
      </nav>
    </div>

    <div
      className="relative z-10 mt-10 border-t pt-7"
      style={{ borderColor: `${CANVAS}24` }}
    >
      <p className="text-[12.5px] leading-relaxed" style={{ color: `${CANVAS}A6` }}>
        © {new Date().getFullYear()} {MARCA.completo}. Todos los derechos
        reservados. La marca, el logotipo y el diseño de este sitio son
        propiedad de {MARCA.completo}.
        <br />
        Hecho en Costa Rica.
      </p>
    </div>
  </footer>
);

export default Pie;
