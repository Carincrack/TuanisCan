import { TURQUESA } from "../tokens";

/* Subrayado dibujado a mano bajo la última palabra del titular.

   Es turquesa: una forma, no una letra, así que no le aplica el
   mínimo de 4.5:1 que sí le aplica al texto.

   Va a `-0.16em` de la línea base para despejar los descendentes;
   a ras cortaba la "g" de "lugares". El `overflow-visible` deja
   que el remate redondo del trazo salga de la caja del `viewBox`.

   Envuelve a la palabra en vez de ir suelto para que el trazo mida
   exactamente lo que mide ella, en cualquier cuerpo de letra. */

interface SubrayadoProps {
  children: string;
}

const Subrayado = ({ children }: SubrayadoProps) => (
  <span className="relative inline-block whitespace-nowrap">
    {children}
    <svg
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      aria-hidden
      className="absolute bottom-[-0.16em] left-0 h-[0.13em] w-full overflow-visible"
    >
      <path
        data-anim="trazo"
        d="M4,10 C46,3 108,2 196,7"
        fill="none"
        stroke={TURQUESA}
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  </span>
);

export default Subrayado;
