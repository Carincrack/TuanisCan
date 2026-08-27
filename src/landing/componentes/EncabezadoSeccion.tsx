import Subrayado from "./Subrayado";
import TitularPartido from "./TitularPartido";
import { TINTA, TINTA_SUAVE } from "../tokens";

/* Antetítulo + titular partido en líneas.

   El titular ya no llega como una sola cadena: llega cortado, una
   entrada por línea, porque cada línea es una ventana por la que
   suben las palabras. Dónde corta es decisión de diseño, y por eso
   lo decide la sección y no el navegador.

   Los `data-anim` son las manijas del movimiento. Quién los mueve y
   con qué ritmo vive en `animacion.ts`, no acá. */

interface EncabezadoSeccionProps {
  antetitulo: string;
  /** Una entrada por línea del titular. */
  lineas: string[];
  /** Última palabra, la que lleva el subrayado turquesa debajo. */
  subrayada: string;
  color?: string;
  colorAnte?: string;
}

const EncabezadoSeccion = ({
  antetitulo,
  lineas,
  subrayada,
  color = TINTA,
  colorAnte = TINTA_SUAVE,
}: EncabezadoSeccionProps) => (
  <div className="max-w-2xl">
    <span data-anim="ante" className="rotulo block" style={{ color: colorAnte }}>
      {antetitulo}
    </span>

    <TitularPartido
      lineas={lineas}
      subrayado={<Subrayado>{subrayada}</Subrayado>}
      color={color}
      className="display mt-4 text-[clamp(1.9rem,3.8vw,2.75rem)] leading-[1.03]"
    />
  </div>
);

export default EncabezadoSeccion;
