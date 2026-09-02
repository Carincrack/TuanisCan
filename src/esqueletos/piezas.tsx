/* Mismo caso que `ui.tsx`: este archivo exporta componentes y
   también los textos de relleno que comparten. La regla de recarga en
   caliente pide una cosa o la otra; separar seis constantes en su
   propio archivo por eso no vale la pena. */
/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
   PIEZAS DE MAQUETA PARA LOS ESQUELETOS

   Boneyard no dibuja el esqueleto: lo FOTOGRAFÍA. Su CLI abre la
   página con un Chromium sin ventana, recorre lo que hay dentro de
   cada `<Skeleton>` y guarda un rectángulo por cada caja que
   encuentra. De ahí que el resultado calce con el diseño real sin
   que nadie mida nada a mano.

   La consecuencia es que la fidelidad del esqueleto es exactamente la
   fidelidad de lo que se le ponga delante a la cámara. Por eso estas
   piezas repiten las MISMAS clases que los componentes de verdad
   —`bg-surface`, los 18 px de radio, `px-5 py-5`, la rejilla de tres
   columnas— y no una aproximación.

   Y por eso también todo esto lleva texto de relleno con largos
   plausibles: un nombre corto y otro largo, una descripción de dos
   líneas. Lo que se mide es la caja que ocupa el texto, así que un
   relleno de una sola palabra daría huesos raquíticos.

   Nada de esto llega al paquete final. Vive solo en la ruta
   `/esqueletos`, que el CLI visita para tomar las fotos.
   ───────────────────────────────────────────────────────────── */

/** Repite una pieza. El pedido era explícito: que el esqueleto se vea
    lleno aunque los datos reales traigan un solo elemento. Una
    rejilla que carga con seis huecos y termina con una tarjeta se
    lee como "todavía viene más"; una que carga con uno y termina con
    uno se lee como una pantalla vacía dos veces. */
export const Varios = ({
  cuantos,
  children,
}: {
  cuantos: number;
  children: (indice: number) => ReactNode;
}) => <>{Array.from({ length: cuantos }, (_, i) => children(i))}</>;

/* Textos de relleno con largos variados. El ancho del hueso sale del
   ancho que ocupa el texto, así que alternarlos evita la escalerita
   de huesos idénticos que delata una maqueta. */
export const NOMBRES = ["Oso", "María Fernández", "Luna", "Diego Solís", "Kira", "Ana Corrales"];
export const FRASES = [
  "Se perdió cerca del parque central, lleva collar rojo y responde a su nombre.",
  "Paseador con experiencia en razas grandes y disponibilidad de lunes a sábado.",
  "Atiende urgencias las veinticuatro horas y cuenta con laboratorio propio.",
];
export const ZONAS = ["Nicoya, Guanacaste", "Curridabat, San José", "Escazú, San José"];

export const nombre = (i: number) => NOMBRES[i % NOMBRES.length];
export const frase = (i: number) => FRASES[i % FRASES.length];
export const zona = (i: number) => ZONAS[i % ZONAS.length];

/** Bloque blanco, el mismo `bg-surface` de `ui.tsx`. */
export const Bloque = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => <div className={`bg-surface ${className}`}>{children}</div>;

/** La cabecera de página: título, bajada y una acción a la derecha.
    Copia la forma de `PageHeader`. */
export const CabeceraMaqueta = ({ conAccion = true }: { conAccion?: boolean }) => (
  <header className="flex flex-wrap items-end justify-between gap-4 bg-surface px-6 py-5">
    <div>
      <h2 className="titular text-[21px] text-ink">Título de la pantalla</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Una línea que explica qué se ve en esta pantalla y para qué sirve.
      </p>
    </div>
    {conAccion && (
      <span className="inline-flex items-center gap-2 rounded-full bg-rail px-5 py-2.5 text-[13px] font-semibold text-white">
        Acción principal
      </span>
    )}
  </header>
);

/** Tira de métricas, como la de los paneles. */
export const MetricasMaqueta = ({ cuantas = 3 }: { cuantas?: number }) => (
  <div className="grid gap-2.5 sm:grid-cols-3">
    <Varios cuantos={cuantas}>
      {(i) => (
        <div key={i} className="bg-surface px-6 py-5">
          <p className="rotulo text-ink-mute">Métrica</p>
          <p className="nums mt-2 text-[27px] leading-none font-semibold tracking-[-0.02em] text-ink">
            1.240
          </p>
          <p className="mt-1.5 text-[12px] text-ink-soft">Nota de contexto</p>
        </div>
      )}
    </Varios>
  </div>
);

/** Barra de filtros: búsqueda y controles. */
export const FiltrosMaqueta = ({ combos = 3 }: { combos?: number }) => (
  <div className="bg-surface p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[13px] font-semibold text-ink">12 resultados</p>
        <p className="mt-0.5 text-[12px] text-ink-mute">
          Filtrá por estado, provincia, cantón o texto.
        </p>
      </div>
      <div className="inline-flex flex-wrap gap-1 rounded-full bg-sunken p-1">
        <Varios cuantos={4}>
          {(i) => (
            <span
              key={i}
              className={`rounded-full px-4 py-2 text-[13px] font-medium ${
                i === 0 ? "bg-rail text-white" : "text-ink-soft"
              }`}
            >
              Filtro
            </span>
          )}
        </Varios>
      </div>
    </div>

    <div className="mt-4 w-full rounded-[14px] bg-sunken px-4 py-2.5 text-[13.5px] text-ink-mute">
      Buscar por nombre o zona
    </div>

    {/* Sin interpolar: Tailwind lee las clases del código fuente
        como texto, y `sm:grid-cols-${n}` no existe para él, así que
        nunca generaría la regla. */}
    <div className={`mt-3 grid gap-3 ${combos === 2 ? "sm:grid-cols-2" : combos === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
      <Varios cuantos={combos}>
        {(i) => (
          <div key={i}>
            <p className="rotulo text-ink-mute">Etiqueta</p>
            <div className="mt-2 w-full rounded-[14px] bg-sunken px-4 py-2.5 text-[13.5px] text-ink-mute">
              Todas las opciones
            </div>
          </div>
        )}
      </Varios>
    </div>
  </div>
);

/** Tabla administrativa: cabecera hundida y filas cebra. */
export const TablaMaqueta = ({
  columnas = 5,
  filas = 8,
}: {
  columnas?: number;
  filas?: number;
}) => (
  <div className="bg-surface">
    <div className="overflow-hidden rounded-[14px]">
      <table className="w-full text-left">
        <thead className="bg-sunken">
          <tr>
            <Varios cuantos={columnas}>
              {(i) => (
                <th key={i} className="rotulo px-6 py-3.5 text-ink-mute">
                  Columna
                </th>
              )}
            </Varios>
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(even)]:bg-sunken/60">
          <Varios cuantos={filas}>
            {(f) => (
              <tr key={f}>
                <Varios cuantos={columnas}>
                  {(c) => (
                    <td key={c} className="px-6 py-3 text-[13px] text-ink">
                      {c === 0 ? nombre(f) : "Dato"}
                    </td>
                  )}
                </Varios>
              </tr>
            )}
          </Varios>
        </tbody>
      </table>
    </div>
  </div>
);
