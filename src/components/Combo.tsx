import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ElementType } from "react";
import { Check, ChevronDown } from "../lib/iconos";

/* ─────────────────────────────────────────────────────────────
   EL COMBO BOX

   Un `<select>` nativo se puede maquillar por fuera —fondo, radio,
   flecha propia— pero la lista que se abre la dibuja el sistema
   operativo, no la página. Ni una regla de CSS la toca: ni el fondo,
   ni el radio, ni la letra, ni el resalte del elemento activo. En
   Windows sale gris y cuadrada; en macOS, otra cosa. Al lado de
   píldoras y esquinas blandas es lo único que sigue pareciendo de
   1998, y no hay forma de arreglarlo sin dejar de usar un `<select>`.

   Esto lo reemplaza: un botón y una lista, ambos nuestros.

   Lo que hay que devolver a mano al dejar el control nativo —y es
   exactamente por esto que la gente termina con combos rotos—:

     · Teclado completo. Abrir con Enter, Espacio, ↓ o ↑; moverse con
       las flechas, Inicio y Fin; elegir con Enter; cerrar con Escape
       devolviendo el foco al botón. Un `<div>` con un `onClick` no
       hace nada de esto y deja el formulario inutilizable sin ratón.
     · Los papeles de ARIA. El botón es `combobox`, la lista es
       `listbox` y cada fila es `option`. `aria-activedescendant`
       dice cuál está resaltada sin mover el foco real, que es como
       se implementa este patrón: el foco se queda en el botón.
     · Buscar tecleando. La lista de zonas trae 84 filas; sin esto,
       llegar a "Tilarán" son veinte flechazos.

   Lo que NO se hace y por qué: esconder un `<select required>` de
   verdad detrás para conservar la validación del navegador. Es el
   truco de siempre y muerde — Chrome se niega a enviar un formulario
   con un control obligatorio que no puede enfocar, y como el control
   está escondido no lo enfoca: el botón de enviar deja de responder,
   sin mensaje, con un error solo en la consola. Acá `required` viaja
   como `aria-required` para quien usa lector de pantalla, y la
   pantalla comprueba el campo con las mismas líneas con las que ya
   comprueba las demás.

   La lista se abre desde arriba (`transform-origin` en el borde
   superior) porque de ahí sale: un menú que crece desde su centro se
   lee como algo que apareció, no como algo que se desplegó.
   ───────────────────────────────────────────────────────────── */

export interface Opcion {
  value: string;
  label: string;
}

interface ComboProps {
  value: string;
  onChange: (value: string) => void;
  options: Opcion[];
  /** Lo que se lee en el botón cuando no hay nada elegido. */
  placeholder?: string;
  /** Agrega arriba una fila que vale cadena vacía, rotulada con el
      `placeholder`. Es para los filtros que pueden no filtrar —"Todas
      las zonas", "Sin zona"—, donde "nada" es una respuesta y no la
      ausencia de una. Va aparte de `required` a propósito: hay listas
      opcionales que ya traen su propia fila de "todos" con un valor
      de verdad, y ahí una segunda fila vacía sobra. */
  vacio?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** Lo que se lee mientras el campo está apagado. Es para los filtros
      encadenados: un cantón apagado que sigue diciendo "Todos los
      cantones" parece roto; diciendo "Elegí una provincia" explica en
      el sitio por qué no se abre y qué hacer para abrirlo. */
  textoInactivo?: string;
  /** Se pega al botón, no al envoltorio. */
  className?: string;
  /** Icono a la izquierda, dentro del botón. Va como propiedad y no
      superpuesto por fuera con `absolute`: encima, hay que empujar el
      relleno del texto a mano y el icono queda montado sobre la letra
      en cuanto alguien cambia ese relleno. */
  Icon?: ElementType;
  /** Dos pieles, porque el login no vive en el mundo del sistema:
      conserva su diseño propio —píldoras, gris pizarra, cuerpo de
      16 px para que iOS no haga zoom al enfocar— y un combo con los
      tokens de la aplicación ahí adentro se ve pegado con cinta.
      El comportamiento es el mismo en las dos; solo cambian clases. */
  tono?: "sistema" | "login";
  "aria-label"?: string;
}

const PIELES = {
  sistema: {
    boton:
      "rounded-[14px] bg-sunken px-4 py-2.5 text-[13.5px] focus:outline-2 focus:-outline-offset-2 focus:outline-accent",
    botonAbierto: "bg-white",
    botonCerrado: "hover:brightness-[0.985]",
    conValor: "text-ink",
    sinValor: "text-ink-mute",
    icono: "text-ink-mute",
    flecha: "text-ink-mute",
    lista: "rounded-[16px] bg-surface p-1.5",
    fila: "px-3 py-2 text-[13.5px] rounded-[10px]",
    filaElegida: "bg-accent-wash font-semibold text-accent-deep",
    filaActiva: "bg-sunken text-ink",
    filaQuieta: "text-ink-soft",
  },
  login: {
    boton:
      "rounded-full border border-transparent bg-slate-100 px-5 py-4 text-[16px] sm:text-sm focus:border-[#14A3B8]/40 focus:ring-2 focus:ring-[#14A3B8]/25 focus:outline-none",
    botonAbierto: "border-[#14A3B8]/40 bg-slate-50",
    botonCerrado: "hover:bg-slate-50",
    conValor: "text-[#1E2A33]",
    sinValor: "text-slate-400",
    icono: "text-[#14A3B8]",
    flecha: "text-slate-400",
    lista: "rounded-2xl border border-slate-200 bg-white p-2",
    fila: "px-4 py-2.5 text-sm rounded-xl",
    filaElegida: "bg-[#14A3B8]/10 font-semibold text-[#1E2A33]",
    filaActiva: "bg-slate-50 text-[#1E2A33]",
    filaQuieta: "text-slate-600",
  },
} as const;

/* Las filas de la lista NO se recortan: se parten en dos renglones.

   Una fila con puntos suspensivos es una fila que no se puede leer, y
   una lista donde no se lee lo que hay no sirve para elegir — que es
   lo único que hace una lista. "Vázquez de Coronado" o "Todas las
   provincias" no caben en una columna de 180 px, y recortarlas deja
   al usuario adivinando. El botón cerrado sí recorta, porque tiene
   que caber en la retícula; ahí el texto completo va en el `title` y
   la lista abierta lo muestra entero. */
const FILA = "flex w-full cursor-pointer items-start gap-2 text-left leading-snug";

export const Combo = ({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  vacio = false,
  id,
  name,
  required = false,
  disabled = false,
  textoInactivo,
  className = "",
  Icon,
  tono = "sistema",
  "aria-label": ariaLabel,
}: ComboProps) => {
  const piel = PIELES[tono];
  const generado = useId();
  const idBoton = id ?? `combo-${generado}`;
  const idLista = `${idBoton}-lista`;

  const filas: Opcion[] = vacio
    ? [{ value: "", label: placeholder }, ...options]
    : options;

  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);

  const envoltorio = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const tecleo = useRef({ texto: "", cuando: 0 });

  const elegida = options.find((o) => o.value === value) ?? null;
  const inactivo = disabled && !!textoInactivo;
  const indiceDe = (v: string) => Math.max(0, filas.findIndex((f) => f.value === v));

  const cerrar = useCallback((devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }, []);

  const abrir = useCallback(() => {
    setActivo(indiceDe(value));
    setAbierto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, filas.length]);

  const elegir = (indice: number) => {
    const fila = filas[indice];
    if (!fila) return;
    onChange(fila.value);
    cerrar();
  };

  /* Un clic afuera cierra. Va en `pointerdown` y no en `click`: si
     esperara al clic, pulsar otro control cerraría la lista recién
     después de que ese control ya recibió el evento, y en pantallas
     angostas eso significa abrir un menú y cerrar otro en el mismo
     gesto. */
  useEffect(() => {
    if (!abierto) return;

    const afuera = (evento: PointerEvent) => {
      if (!envoltorio.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };

    document.addEventListener("pointerdown", afuera);
    return () => document.removeEventListener("pointerdown", afuera);
  }, [abierto]);

  /* La fila resaltada tiene que estar a la vista aunque se llegue a
     ella con el teclado: la lista se desplaza y el foco real nunca se
     mueve, así que el navegador no la trae solo. */
  useEffect(() => {
    if (!abierto) return;
    lista.current
      ?.querySelector(`[data-indice="${activo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [abierto, activo]);

  const buscarTecleando = (letra: string) => {
    const ahora = Date.now();
    // Un segundo de pausa arranca una búsqueda nueva.
    const texto =
      ahora - tecleo.current.cuando > 1000
        ? letra
        : tecleo.current.texto + letra;
    tecleo.current = { texto, cuando: ahora };

    const encontrado = filas.findIndex((f) =>
      f.label.toLowerCase().startsWith(texto.toLowerCase()),
    );
    if (encontrado >= 0) {
      setActivo(encontrado);
      if (!abierto) onChange(filas[encontrado].value);
    }
  };

  const alTeclear = (evento: React.KeyboardEvent) => {
    const { key } = evento;

    if (!abierto) {
      if (key === "Enter" || key === " " || key === "ArrowDown" || key === "ArrowUp") {
        evento.preventDefault();
        abrir();
        return;
      }
      if (key.length === 1) buscarTecleando(key);
      return;
    }

    switch (key) {
      case "Escape":
        evento.preventDefault();
        cerrar();
        break;
      case "Tab":
        // Tab sale del control: se cierra sin robarle el foco al que sigue.
        setAbierto(false);
        break;
      case "Enter":
      case " ":
        evento.preventDefault();
        elegir(activo);
        break;
      case "ArrowDown":
        evento.preventDefault();
        setActivo((i) => Math.min(i + 1, filas.length - 1));
        break;
      case "ArrowUp":
        evento.preventDefault();
        setActivo((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        evento.preventDefault();
        setActivo(0);
        break;
      case "End":
        evento.preventDefault();
        setActivo(filas.length - 1);
        break;
      default:
        if (key.length === 1) buscarTecleando(key);
    }
  };

  return (
    <div ref={envoltorio} className="relative">
      {/* El botón va primero y es lo único enfocable. Importa cuando
          la etiqueta lo envuelve, que es como se usan los campos en
          este sistema: un `<label>` nombra a su PRIMER descendiente
          etiquetable, así que cualquier control colado antes que este
          se quedaría con el nombre y el botón se anunciaría mudo. */}
      <button
        ref={boton}
        type="button"
        id={idBoton}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-activedescendant={abierto ? `${idLista}-${activo}` : undefined}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        data-name={name}
        disabled={disabled}
        /* Lo elegido puede no caber en la columna. El botón lo recorta
           —tiene que caber— y el texto entero queda a un roce de
           distancia en vez de perdido. */
        title={elegida?.label}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={alTeclear}
        className={`flex w-full items-center gap-2 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${piel.boton} ${
          abierto ? piel.botonAbierto : piel.botonCerrado
        } ${elegida && !inactivo ? piel.conValor : piel.sinValor} ${className}`}
      >
        {Icon && (
          <Icon size={17} strokeWidth={1.9} aria-hidden className={`shrink-0 ${piel.icono}`} />
        )}
        <span className="min-w-0 flex-1 truncate">
          {inactivo ? textoInactivo : (elegida?.label ?? placeholder)}
        </span>
        <ChevronDown
          size={15}
          strokeWidth={2.4}
          aria-hidden
          className={`shrink-0 transition-transform duration-200 ease-out ${piel.flecha} ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>

      {abierto && (
        <ul
          ref={lista}
          id={idLista}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          className={`desplegable absolute top-[calc(100%+6px)] right-0 left-0 z-30 max-h-64 overflow-y-auto ${piel.lista}`}
        >
          {filas.map((fila, i) => {
            const seleccionada = fila.value === value;
            return (
              <li
                key={fila.value || "__vacia"}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={seleccionada}
                data-indice={i}
                /* `pointerdown` y no `click`: el clic llega después de
                   que el cierre por clic-afuera ya desmontó la fila. */
                onPointerDown={(evento) => {
                  evento.preventDefault();
                  elegir(i);
                }}
                onPointerEnter={() => setActivo(i)}
                className={`${FILA} ${piel.fila} ${
                  seleccionada
                    ? piel.filaElegida
                    : i === activo
                      ? piel.filaActiva
                      : piel.filaQuieta
                }`}
              >
                <span className="min-w-0 flex-1">{fila.label}</span>
                {seleccionada && (
                  <Check
                    size={14}
                    strokeWidth={2.6}
                    aria-hidden
                    className="mt-0.5 shrink-0"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Combo;
