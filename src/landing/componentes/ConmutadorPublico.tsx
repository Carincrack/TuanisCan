import { PUBLICOS, type ClavePublico } from "../datos";
import { CANVAS, NAVY, TURQUESA } from "../tokens";

/* Conmutador de público, abajo a la derecha. Ocupa el lugar del
   selector perro/gato de la referencia, pero cambia algo de verdad:
   el texto de entrada y la acción del hero.

   El activo se marca con el turquesa de la marca sobre la píldora
   clara. El inactivo no se distingue solo por opacidad — también
   por el `aria-pressed`, que es lo que oye un lector de pantalla. */

interface ConmutadorPublicoProps {
  valor: ClavePublico;
  onCambio: (clave: ClavePublico) => void;
}

const ConmutadorPublico = ({ valor, onCambio }: ConmutadorPublicoProps) => (
  <div
    role="group"
    aria-label="¿Quién sos?"
    className="flex items-center gap-1 rounded-full p-1.5"
    style={{ background: CANVAS }}
  >
    {PUBLICOS.map(({ clave, Icon, label }) => {
      const activo = clave === valor;
      return (
        <button
          key={clave}
          type="button"
          onClick={() => onCambio(clave)}
          aria-pressed={activo}
          title={label}
          className="grid h-11 w-11 place-items-center rounded-full transition-[background-color,opacity,transform] duration-150 ease-out active:scale-[0.94]"
          style={{
            background: activo ? TURQUESA : "transparent",
            color: NAVY,
            opacity: activo ? 1 : 0.5,
          }}
        >
          <Icon size={21} strokeWidth={2.1} aria-hidden />
          <span className="sr-only">{label}</span>
        </button>
      );
    })}
  </div>
);

export default ConmutadorPublico;
