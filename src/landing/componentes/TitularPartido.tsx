import { Fragment, type ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
   Titular partido en palabras.

   Cada línea se declara aparte —no se deja que el navegador
   decida dónde cortar— porque cada una es una ventana con
   `overflow: hidden` y las palabras suben desde debajo de su
   borde. Si el corte lo pusiera el navegador, la ventana taparía
   a media línea en cuanto cambiara el ancho.

   Es un `h2` por defecto y no un `div` con clases: el subrayado y
   el movimiento son adorno, la jerarquía del documento no.

   El espacio entre palabras va como nodo de texto suelto entre
   dos `span`. Metido dentro del `span` se colapsaría, porque cada
   palabra es `inline-block`.

   El subrayado se lleva una línea entera para él. Va con
   `nowrap` —el trazo tiene que medir lo mismo que las palabras que
   subraya— y una línea es una ventana con `overflow: hidden`: si
   compartiera renglón con otro texto y no cupiera, no se
   envolvería, se cortaría, y sin ningún aviso.
   ───────────────────────────────────────────────────────────── */

interface TitularPartidoProps {
  /** Una entrada por línea. El corte es decisión de diseño. */
  lineas: string[];
  /** Cierra la última línea con el subrayado dibujado a mano. */
  subrayado?: ReactNode;
  como?: "h1" | "h2";
  className?: string;
  color?: string;
}

const TitularPartido = ({
  lineas,
  subrayado,
  como: Etiqueta = "h2",
  className,
  color,
}: TitularPartidoProps) => (
  <Etiqueta data-anim="titular" className={className} style={color ? { color } : undefined}>
    {lineas.map((linea, indiceLinea) => {
      const palabras = linea.split(" ");
      const ultima = indiceLinea === lineas.length - 1;

      return (
        <Fragment key={`${linea}-${indiceLinea}`}>
          <span data-anim="linea" className="linea">
            {palabras.map((palabra, indice) => (
              <Fragment key={`${palabra}-${indice}`}>
                <span className="palabra">{palabra}</span>
                {indice < palabras.length - 1 ? " " : null}
              </Fragment>
            ))}
          </span>

          {ultima && subrayado ? (
            <span data-anim="linea" className="linea">
              <span className="palabra">{subrayado}</span>
            </span>
          ) : null}
        </Fragment>
      );
    })}
  </Etiqueta>
);

export default TitularPartido;
