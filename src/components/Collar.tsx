/* ─────────────────────────────────────────────────────────────
   EL COLLAR

   La etiqueta de estado de las tarjetas de mascotas: una banda navy,
   del color del menú, que abraza el borde de la tarjeta y lleva su
   chapa en la punta. La chapa toma el color del caso.

   Vive en su propio archivo porque la usan dos mundos que no se
   bajan juntos: la pantalla interna y la vitrina pública de /perdidas.
   Importarla desde `mascotasPerdidas.tsx` metería la app autenticada
   en el paquete de la portada.

   La forma está en `.collar-estado` (index.css). Quien la use tiene
   que ser `position: relative` y no recortar sus bordes, porque el
   collar se sale 7 px por la izquierda.
   ───────────────────────────────────────────────────────────── */

export type TonoEtiqueta = "perdida" | "encontrada" | "coincidencia";

/* Una huella rellena, para la chapa. El icono de la app es de puro
   trazo y a este tamaño no se reconoce. */
const HuellaLlena = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden>
    <path d="M12 11.2c-3 0-6 2.9-6 5.9 0 1.9 1.4 3 3.1 3 1.2 0 1.9-.6 2.9-.6s1.7.6 2.9.6c1.7 0 3.1-1.1 3.1-3 0-3-3-5.9-6-5.9z" />
    <ellipse cx="5.4" cy="10.8" rx="2" ry="2.6" transform="rotate(-20 5.4 10.8)" />
    <ellipse cx="9.4" cy="6" rx="2.1" ry="2.8" transform="rotate(-8 9.4 6)" />
    <ellipse cx="14.6" cy="6" rx="2.1" ry="2.8" transform="rotate(8 14.6 6)" />
    <ellipse cx="18.6" cy="10.8" rx="2" ry="2.6" transform="rotate(20 18.6 10.8)" />
  </svg>
);

const Collar = ({ texto, tono, className = "" }: { texto: string; tono: TonoEtiqueta; className?: string }) => (
  <span className={`collar-estado collar-estado--${tono} ${className}`}>
    <span className="collar-estado__banda">{texto}</span>
    <span className="collar-estado__chapa">
      <HuellaLlena />
    </span>
  </span>
);

export default Collar;
