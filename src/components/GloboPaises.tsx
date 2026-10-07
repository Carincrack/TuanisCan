import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  geoContains,
  geoDistance,
  geoGraticule10,
  geoInterpolate,
  geoOrthographic,
  geoPath,
} from "d3-geo";
import type { GeoProjection } from "d3-geo";
import { CENTRO_SIN_MAPA } from "../lib/paisesMapa";
import { enCaja, mapaBasico, mapaDetalle, type Mapa } from "../lib/mapaMundo";
import { opcionesDePais } from "../lib/paises";
import { PAIS_PREDETERMINADO } from "../types/auth.types";
import { useTranslation } from "../hooks/useTranslation";
import { Check, Loader, LocateFixed, MapPin, Minus, Plus, Search, X } from "../lib/iconos";

/* ─────────────────────────────────────────────────────────────
   EL GLOBO DE PAÍSES

   La ventana del paso 2 del registro para elegir país. Un globo que
   se gira con el dedo o el mouse, se acerca con la rueda, el pellizco
   o los botones, y donde un toque sobre un país lo elige. El buscador
   hace lo mismo para quien ya sabe el nombre: elige el país y el globo
   viaja hasta él.

   Por ahora solo Costa Rica tiene zonas catalogadas, así que es el
   único que se puede USAR. Los demás se pueden mirar y elegir, pero la
   ventana dice que no están disponibles y no deja confirmarlos.

   ── Cómo se dibuja ──

   No es WebGL ni un modelo 3D: es un canvas 2D con la proyección
   ortográfica de d3, que es como se ve una esfera desde lejos. Eso
   corre igual en cualquier teléfono. El volumen lo ponen cuatro cosas
   pintadas encima: un brillo en el mar arriba a la izquierda, el canto
   que se agrisa hacia el borde, un halo turquesa muy tenue y la sombra
   que el globo deja debajo, como un objeto sobre la mesa.

   El país elegido se LEVANTA: se pinta varias veces corrido hacia
   arriba, las copias de abajo en turquesa —son las paredes— y la de
   arriba en celeste —es la tapa—, con una sombra debajo. Encima lleva
   el pinchito, en el navy del riel.

   ── Dos mapas ──

   Los trae lib/mapaMundo.ts. Se usa el fino con el globo quieto y el
   grueso mientras gira, que es cuando nadie mira la costa.
   ───────────────────────────────────────────────────────────── */

/* ── Las dos paletas ──
   La ventana sigue al login, que tiene dos caras. En el teléfono es
   blanca de punta a punta, y el globo va claro: mar gris azulado,
   tierra blanca. En escritorio el globo va en el panel azul de la
   tarjeta del login —el de la curva— y ahí la paleta se invierte: mar
   en los azules de la marca, más claro que el fondo para que se lea la
   esfera, tierra casi blanca y una atmósfera celeste alrededor.

   Lo que no cambia es el país elegido: paredes turquesa, tapa celeste
   y el pinchito navy con aro blanco, que se leen igual en las dos. */
interface Paleta {
  /** Atmósfera: pegada al borde, a un tercio y afuera del todo. */
  halo: [string, string, string];
  /** La sombra que el globo deja debajo. */
  suelo: [string, string];
  /** El mar: la luz, el medio y el borde. */
  mar: [string, string, string];
  reticula: string;
  tierra: string;
  tierraEncima: string;
  disponible: string;
  borde: string;
  /** El canto: lo que oscurece la esfera hacia el borde. */
  canto: [string, string];
  /** El filo de la esfera. */
  aro: string;
  /** Sombra del país levantado y de la base del pinchito. */
  sombra: string;
}

const PALETA_CLARA: Paleta = {
  halo: ["rgba(20, 163, 184, 0.16)", "rgba(20, 163, 184, 0.06)", "rgba(20, 163, 184, 0)"],
  suelo: ["rgba(26, 66, 87, 0.16)", "rgba(26, 66, 87, 0)"],
  mar: ["#f3f8fa", "#dbe8ee", "#c3d7e1"],
  reticula: "rgba(26, 66, 87, 0.07)",
  tierra: "#ffffff",
  tierraEncima: "#eef8fa",
  disponible: "#c8e9f0",
  borde: "#bccdd7",
  canto: ["rgba(26, 66, 87, 0)", "rgba(26, 66, 87, 0.16)"],
  aro: "rgba(26, 66, 87, 0.22)",
  sombra: "rgba(26, 66, 87, 0.38)",
};

const PALETA_AZUL: Paleta = {
  halo: ["rgba(150, 215, 240, 0.4)", "rgba(150, 215, 240, 0.12)", "rgba(150, 215, 240, 0)"],
  suelo: ["rgba(4, 20, 34, 0.4)", "rgba(4, 20, 34, 0)"],
  mar: ["#76b5de", "#3f82b6", "#265d8a"],
  reticula: "rgba(255, 255, 255, 0.09)",
  tierra: "#f3f8fb",
  tierraEncima: "#d9eff6",
  disponible: "#a6e4ef",
  borde: "#8fb3cb",
  canto: ["rgba(6, 26, 42, 0)", "rgba(6, 26, 42, 0.32)"],
  aro: "rgba(190, 230, 248, 0.6)",
  sombra: "rgba(4, 20, 34, 0.45)",
};

const RELIEVE = {
  pared: "#14a3b8",
  tapa: "#86e3f0",
  filo: "rgba(255, 255, 255, 0.95)",
  tinta: "#1a4257",
} as const;

/** Desde acá la ventana es la tarjeta partida del login. */
const ESCRITORIO = "(min-width: 768px)";

/** Cuánto sube el país elegido, en píxeles de pantalla. */
const ALTURA_RELIEVE = 9;
const ZOOM_MIN = 1;
const ZOOM_MAX = 10;

const sinAcentos = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const suavizar = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const acotar = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));

/** Cuánto acercarse para que el país ocupe un tercio del globo. */
const zoomPara = (radio: number) => 0.42 / Math.sin(Math.max(radio, 0.004));

/** Lo que el globo dice de cada país: si se puede usar o no. */
const disponible = (codigo: string | null) => codigo === PAIS_PREDETERMINADO;

export interface GloboPaisesProps {
  /** El país que ya estaba elegido en el formulario. */
  valor: string;
  onElegir: (codigo: string) => void;
  onCerrar: () => void;
}

const GloboPaises = ({ valor, onElegir, onCerrar }: GloboPaisesProps) => {
  const { t, localeTag } = useTranslation();
  const tituloId = useId();
  const listaId = useId();
  const pistaId = useId();

  const opciones = useMemo(() => opcionesDePais(localeTag), [localeTag]);
  const nombreDe = useCallback(
    (codigo: string | null) => (codigo ? opciones.find((o) => o.value === codigo)?.label ?? codigo : ""),
    [opciones],
  );

  const [elegido, setElegido] = useState<string | null>(valor || PAIS_PREDETERMINADO);
  const [busqueda, setBusqueda] = useState("");
  const [activo, setActivo] = useState(0);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [tocado, setTocado] = useState(false);

  /* ── Lo que vive fuera de React ──
     El dibujo se repite hasta sesenta veces por segundo mientras se
     arrastra; pasar cada cuadro por el estado de React sería volver a
     renderizar la ventana entera para mover un píxel. */
  const ventana = useRef<HTMLDivElement>(null);
  const escenario = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const buscador = useRef<HTMLInputElement>(null);
  const faro = useRef<HTMLSpanElement>(null);
  const etiqueta = useRef<HTMLSpanElement>(null);
  const rotulo = useRef<HTMLSpanElement>(null);

  const mapas = useRef<{ basico: Mapa | null; detalle: Mapa | null }>({ basico: null, detalle: null });
  const vista = useRef({ rotacion: [0, 0] as [number, number], zoom: 1, ancho: 0, alto: 0 });
  const elegidoRef = useRef<string | null>(elegido);
  const encima = useRef<string | null>(null);
  const relieve = useRef(1);
  const moviendo = useRef(false);
  const quieto = useRef<number | undefined>(undefined);
  const cuadro = useRef<number | undefined>(undefined);
  const animacion = useRef<number | undefined>(undefined);
  const reducido = useRef(false);
  const paleta = useRef<Paleta>(PALETA_CLARA);
  /* Quien abre la ventana suele pasar una flecha nueva en cada render;
     guardada acá, el efecto del teclado no se desarma y se vuelve a
     armar —devolviendo el foco— cada vez que el formulario cambia. */
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  });

  /* ── La proyección de este instante ── */
  const proyeccion = useCallback((): GeoProjection => {
    const { rotacion, zoom, ancho, alto } = vista.current;
    return geoOrthographic()
      .clipAngle(90)
      .clipExtent([
        [-2, -2],
        [ancho + 2, alto + 2],
      ])
      .precision(0.4)
      .translate([ancho / 2, alto / 2])
      .scale(Math.min(ancho, alto) * 0.42 * zoom)
      .rotate(rotacion);
  }, []);

  /* ── El dibujo ── */
  const dibujar = useCallback(() => {
    cuadro.current = undefined;
    const canvas = lienzo.current;
    const ctx = canvas?.getContext("2d");
    const { ancho, alto } = vista.current;
    if (!canvas || !ctx || !ancho || !alto) return;

    const C = paleta.current;
    const mapa = (moviendo.current ? mapas.current.basico : mapas.current.detalle) ?? mapas.current.basico ?? mapas.current.detalle;
    const p = proyeccion();
    const camino = geoPath(p, ctx);
    const [cx, cy] = p.translate();
    const r = p.scale();
    const centroVista: [number, number] = [-vista.current.rotacion[0], -vista.current.rotacion[1]];

    ctx.clearRect(0, 0, ancho, alto);

    // La atmósfera: un anillo que se apaga hacia afuera.
    const halo = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.28);
    halo.addColorStop(0, C.halo[0]);
    halo.addColorStop(0.35, C.halo[1]);
    halo.addColorStop(1, C.halo[2]);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // La sombra que deja debajo. Solo se ve con el globo entero.
    const suelo = ctx.createRadialGradient(cx, cy + r * 1.06, 0, cx, cy + r * 1.06, r * 0.75);
    suelo.addColorStop(0, C.suelo[0]);
    suelo.addColorStop(1, C.suelo[1]);
    ctx.fillStyle = suelo;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 1.06, r * 0.75, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    // El mar, con la luz arriba a la izquierda.
    const mar = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.05, cx, cy, r * 1.05);
    mar.addColorStop(0, C.mar[0]);
    mar.addColorStop(0.55, C.mar[1]);
    mar.addColorStop(1, C.mar[2]);
    ctx.fillStyle = mar;
    ctx.beginPath();
    camino({ type: "Sphere" });
    ctx.fill();

    ctx.strokeStyle = C.reticula;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    camino(geoGraticule10());
    ctx.stroke();

    const levantado = elegidoRef.current;
    const resaltado = encima.current;

    if (mapa) {
      // La tierra de todos, de una sola pasada.
      ctx.fillStyle = C.tierra;
      ctx.beginPath();
      for (const pais of mapa.paises.values()) {
        if (pais.codigo !== resaltado && pais.codigo !== PAIS_PREDETERMINADO) camino(pais.forma);
      }
      for (const forma of mapa.sinCodigo) camino(forma);
      ctx.fill();

      // Costa Rica se distingue siempre: es donde se puede llegar.
      const casa = mapa.paises.get(PAIS_PREDETERMINADO);
      if (casa) {
        ctx.fillStyle = C.disponible;
        ctx.beginPath();
        camino(casa.forma);
        ctx.fill();
      }

      const bajoPuntero = resaltado ? mapa.paises.get(resaltado) : undefined;
      if (bajoPuntero && resaltado !== PAIS_PREDETERMINADO) {
        ctx.fillStyle = C.tierraEncima;
        ctx.beginPath();
        camino(bajoPuntero.forma);
        ctx.fill();
      }

      ctx.strokeStyle = C.borde;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      for (const pais of mapa.paises.values()) camino(pais.forma);
      ctx.stroke();
    }

    // El canto: oscurece hacia el borde, que es lo que hace la esfera.
    const canto = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
    canto.addColorStop(0, C.canto[0]);
    canto.addColorStop(1, C.canto[1]);
    ctx.fillStyle = canto;
    ctx.beginPath();
    camino({ type: "Sphere" });
    ctx.fill();
    ctx.strokeStyle = C.aro;
    ctx.lineWidth = 1;
    ctx.stroke();

    // ── El elegido, levantado ──
    let punta: [number, number] | null = null;
    const datos = levantado ? mapa?.paises.get(levantado) : undefined;
    const centroElegido = datos?.centro ?? (levantado ? CENTRO_SIN_MAPA[levantado] : undefined);
    const altura = ALTURA_RELIEVE * relieve.current;

    if (datos) {
      const capas = 6;
      ctx.save();
      ctx.shadowColor = C.sombra;
      ctx.shadowBlur = 10 * relieve.current;
      ctx.shadowOffsetY = 4 * relieve.current;
      ctx.fillStyle = RELIEVE.pared;
      ctx.beginPath();
      camino(datos.forma);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = RELIEVE.pared;
      for (let i = 1; i < capas; i++) {
        ctx.save();
        ctx.translate(0, (-altura * i) / capas);
        ctx.beginPath();
        camino(datos.forma);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(0, -altura);
      ctx.fillStyle = RELIEVE.tapa;
      ctx.beginPath();
      camino(datos.forma);
      ctx.fill();
      ctx.strokeStyle = RELIEVE.filo;
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.restore();
    }

    // ── El pinchito ── Solo si el centro del país mira hacia acá.
    if (centroElegido && geoDistance(centroElegido, centroVista) < Math.PI / 2 - 0.03) {
      const base = p(centroElegido);
      if (base) {
        const [bx, by] = [base[0], base[1] - altura];
        const largo = 22 * relieve.current + 6;
        ctx.fillStyle = C.sombra;
        ctx.beginPath();
        ctx.ellipse(bx, by + 1, 4.5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // El palo, navy con un filo blanco debajo para despegarse de la
        // tapa celeste.
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by - largo);
        ctx.stroke();
        ctx.strokeStyle = RELIEVE.tinta;
        ctx.lineWidth = 2;
        ctx.stroke();
        // La cabeza: navy con aro blanco, se lee igual sobre el celeste
        // del país que sobre cualquiera de los dos mares.
        ctx.fillStyle = RELIEVE.tinta;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(bx, by - largo, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = RELIEVE.tapa;
        ctx.beginPath();
        ctx.arc(bx, by - largo, 3, 0, Math.PI * 2);
        ctx.fill();
        punta = [bx, by - largo - 10];
      }
    }

    // ── Lo que va en HTML encima del lienzo ──
    if (etiqueta.current) {
      etiqueta.current.style.opacity = punta ? "1" : "0";
      if (punta) etiqueta.current.style.transform = `translate(${punta[0]}px, ${punta[1]}px) translate(-50%, -100%)`;
    }

    const costaRica = mapa?.paises.get(PAIS_PREDETERMINADO);
    if (faro.current) {
      const visible =
        costaRica &&
        levantado !== PAIS_PREDETERMINADO &&
        geoDistance(costaRica.centro, centroVista) < Math.PI / 2 - 0.05;
      const punto = visible ? p(costaRica.centro) : null;
      faro.current.style.opacity = punto ? "1" : "0";
      if (punto) faro.current.style.transform = `translate(${punto[0]}px, ${punto[1]}px) translate(-50%, -50%)`;
    }
  }, [proyeccion]);

  const pedirDibujo = useCallback(() => {
    if (cuadro.current === undefined) cuadro.current = requestAnimationFrame(dibujar);
  }, [dibujar]);

  /** Mientras algo se mueve se dibuja el mapa grueso; 140 ms después de
      quedarse quieto, el fino. */
  const marcarMovimiento = useCallback(() => {
    moviendo.current = true;
    window.clearTimeout(quieto.current);
    quieto.current = window.setTimeout(() => {
      moviendo.current = false;
      pedirDibujo();
    }, 140);
  }, [pedirDibujo]);

  const detenerAnimacion = useCallback(() => {
    if (animacion.current !== undefined) cancelAnimationFrame(animacion.current);
    animacion.current = undefined;
  }, []);

  /* ── Viajar ── El centro va por el arco más corto de la esfera y el
     zoom, en escala logarítmica para que acercarse de 1 a 8 no se sienta
     como un salto al final. Si el viaje es largo se aleja un poco a mitad
     de camino, como quien levanta la vista para ubicarse. */
  const volarA = useCallback(
    (centro: [number, number], zoomFinal: number) => {
      detenerAnimacion();
      const desde: [number, number] = [-vista.current.rotacion[0], -vista.current.rotacion[1]];
      const z0 = vista.current.zoom;
      const z1 = acotar(zoomFinal, ZOOM_MIN, ZOOM_MAX);
      const distancia = geoDistance(desde, centro);

      if (reducido.current) {
        vista.current.rotacion = [-centro[0], -centro[1]];
        vista.current.zoom = z1;
        pedirDibujo();
        return;
      }

      const camino = geoInterpolate(desde, centro);
      const duracion = 650 + 550 * (distancia / Math.PI);
      const alejarse = Math.min(1, distancia / 1.2) * 0.4;
      const inicio = performance.now();

      const paso = (ahora: number) => {
        const t = Math.min(1, (ahora - inicio) / duracion);
        const e = suavizar(t);
        const [lon, lat] = camino(e);
        const zoom = Math.exp(Math.log(z0) + (Math.log(z1) - Math.log(z0)) * e) * (1 - alejarse * Math.sin(Math.PI * e));
        vista.current.rotacion = [-lon, -lat];
        vista.current.zoom = Math.max(0.75, zoom);
        marcarMovimiento();
        dibujar();
        animacion.current = t < 1 ? requestAnimationFrame(paso) : undefined;
      };
      animacion.current = requestAnimationFrame(paso);
    },
    [detenerAnimacion, dibujar, marcarMovimiento, pedirDibujo],
  );

  const levantar = useCallback(() => {
    if (reducido.current) {
      relieve.current = 1;
      pedirDibujo();
      return;
    }
    relieve.current = 0;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / 420);
      relieve.current = 1 - (1 - t) ** 3;
      pedirDibujo();
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }, [pedirDibujo]);

  /** Elegir un país: se levanta, y si `viajar`, el globo va hasta él. */
  const elegir = useCallback(
    (codigo: string, como: "viajar" | "centrar" | "quieto") => {
      setElegido(codigo);
      elegidoRef.current = codigo;
      levantar();
      const mapa = mapas.current.detalle ?? mapas.current.basico;
      const datos = mapa?.paises.get(codigo);
      const centro = datos?.centro ?? CENTRO_SIN_MAPA[codigo];
      if (!centro || como === "quieto") return;
      volarA(centro, como === "viajar" ? zoomPara(datos?.radio ?? 0.004) : vista.current.zoom);
    },
    [levantar, volarA],
  );

  /* ── Cargar los mapas ── */
  useEffect(() => {
    let vivo = true;
    reducido.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Arranca mirando al país elegido, con el globo entero a la vista.
    const inicial = CENTRO_SIN_MAPA[elegidoRef.current ?? ""] ?? [-84.1, 9.9];
    vista.current.rotacion = [-inicial[0], -inicial[1] + 6];

    mapaBasico()
      .then((mapa) => {
        if (!vivo) return;
        mapas.current.basico = mapa;
        const centro = mapa.paises.get(elegidoRef.current ?? "")?.centro;
        if (centro) vista.current.rotacion = [-centro[0], -centro[1] + 6];
        setCargando(false);
        levantar();
        return mapaDetalle();
      })
      .then((mapa) => {
        if (!vivo || !mapa) return;
        mapas.current.detalle = mapa;
        pedirDibujo();
      })
      .catch(() => {
        if (vivo) {
          setFallo(true);
          setCargando(false);
        }
      });

    return () => {
      vivo = false;
      detenerAnimacion();
      window.clearTimeout(quieto.current);
      if (cuadro.current !== undefined) cancelAnimationFrame(cuadro.current);
    };
  }, [detenerAnimacion, levantar, pedirDibujo]);

  /* ── El tamaño del lienzo sigue al escenario ── */
  useEffect(() => {
    const caja = escenario.current;
    const canvas = lienzo.current;
    if (!caja || !canvas) return;
    /* `clientWidth` y no `getBoundingClientRect`: la ventana entra
       creciendo desde el 97 %, y medida en plena entrada el lienzo
       quedaba 20 px corto, con una franja vacía a la derecha y abajo. */
    const medir = () => {
      const width = caja.clientWidth;
      const height = caja.clientHeight;
      paleta.current = window.matchMedia(ESCRITORIO).matches ? PALETA_AZUL : PALETA_CLARA;
      const densidad = Math.min(window.devicePixelRatio || 1, 2);
      vista.current.ancho = width;
      vista.current.alto = height;
      canvas.width = Math.round(width * densidad);
      canvas.height = Math.round(height * densidad);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext("2d")?.setTransform(densidad, 0, 0, densidad, 0, 0);
      dibujar();
    };
    const observador = new ResizeObserver(medir);
    observador.observe(caja);
    medir();
    return () => observador.disconnect();
  }, [dibujar]);

  /* ── La rueda acerca. Va con addEventListener porque React la
     registra pasiva y así no se puede frenar el scroll de la página. */
  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;
    const alGirar = (evento: WheelEvent) => {
      evento.preventDefault();
      detenerAnimacion();
      vista.current.zoom = acotar(vista.current.zoom * Math.exp(-evento.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX);
      marcarMovimiento();
      pedirDibujo();
    };
    canvas.addEventListener("wheel", alGirar, { passive: false });
    return () => canvas.removeEventListener("wheel", alGirar);
  }, [detenerAnimacion, marcarMovimiento, pedirDibujo]);

  /* ── La ventana: Escape cierra, el foco no se escapa y la página de
     atrás no se mueve. */
  useEffect(() => {
    const devolver = document.activeElement as HTMLElement | null;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // En el teléfono no se enfoca el buscador: abriría el teclado
    // encima del globo antes de que nadie lo pida.
    if (window.matchMedia("(pointer: fine)").matches) buscador.current?.focus();
    else ventana.current?.focus();

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar.current();
        return;
      }
      if (evento.key !== "Tab" || !ventana.current) return;
      const enfocables = [
        ...ventana.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, [tabindex='0']"),
      ];
      if (!enfocables.length) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = previo;
      devolver?.focus?.();
    };
  }, []);

  /* ── Qué país hay bajo un punto de la pantalla ── */
  const paisEn = useCallback(
    (x: number, y: number): string | null => {
      const p = proyeccion();
      const [cx, cy] = p.translate();
      if (Math.hypot(x - cx, y - cy) > p.scale()) return null;
      const lugar = p.invert?.([x, y]);
      const mapa = mapas.current.detalle ?? mapas.current.basico;
      if (!lugar || !mapa) return null;
      const punto: [number, number] = [lugar[0], lugar[1]];
      for (const pais of mapa.paises.values()) {
        if (enCaja(punto, pais.caja) && geoContains(pais.forma, punto)) return pais.codigo;
      }
      return null;
    },
    [proyeccion],
  );

  /* ── Arrastrar, pellizcar, tocar ── */
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef({ x: 0, y: 0, cuando: 0, recorrido: 0, separacion: 0, zoom: 1 });

  const posicion = (evento: ReactPointerEvent) => {
    const caja = lienzo.current!.getBoundingClientRect();
    return { x: evento.clientX - caja.left, y: evento.clientY - caja.top };
  };

  const alBajar = (evento: ReactPointerEvent<HTMLCanvasElement>) => {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    detenerAnimacion();
    const punto = posicion(evento);
    punteros.current.set(evento.pointerId, punto);
    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      gesto.current.separacion = Math.hypot(a.x - b.x, a.y - b.y);
      gesto.current.zoom = vista.current.zoom;
      gesto.current.recorrido = 99;
    } else {
      gesto.current = { ...gesto.current, x: punto.x, y: punto.y, cuando: performance.now(), recorrido: 0 };
    }
  };

  const alMover = (evento: ReactPointerEvent<HTMLCanvasElement>) => {
    const punto = posicion(evento);

    if (!punteros.current.has(evento.pointerId)) {
      // Solo pasando por encima: resaltar y rotular el país.
      if (evento.pointerType !== "mouse") return;
      const codigo = paisEn(punto.x, punto.y);
      if (codigo !== encima.current) {
        encima.current = codigo;
        evento.currentTarget.style.cursor = codigo ? "pointer" : "grab";
        pedirDibujo();
      }
      if (rotulo.current) {
        rotulo.current.textContent = codigo ? nombreDe(codigo) : "";
        rotulo.current.style.opacity = codigo ? "1" : "0";
        rotulo.current.style.transform = `translate(${punto.x + 14}px, ${punto.y + 16}px)`;
      }
      return;
    }

    const anterior = punteros.current.get(evento.pointerId)!;
    punteros.current.set(evento.pointerId, punto);

    if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      const separacion = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesto.current.separacion > 0) {
        vista.current.zoom = acotar((gesto.current.zoom * separacion) / gesto.current.separacion, ZOOM_MIN, ZOOM_MAX);
      }
    } else {
      const dx = punto.x - anterior.x;
      const dy = punto.y - anterior.y;
      gesto.current.recorrido += Math.abs(dx) + Math.abs(dy);
      const escala = Math.min(vista.current.ancho, vista.current.alto) * 0.42 * vista.current.zoom;
      const grados = 180 / Math.PI / escala;
      const [lambda, phi] = vista.current.rotacion;
      vista.current.rotacion = [lambda + dx * grados, acotar(phi - dy * grados, -88, 88)];
      if (gesto.current.recorrido > 4) {
        evento.currentTarget.style.cursor = "grabbing";
        if (rotulo.current) rotulo.current.style.opacity = "0";
      }
    }
    if (!tocado) setTocado(true);
    marcarMovimiento();
    pedirDibujo();
  };

  const alSoltar = (evento: ReactPointerEvent<HTMLCanvasElement>) => {
    const eraUnToque =
      punteros.current.size === 1 && gesto.current.recorrido < 6 && performance.now() - gesto.current.cuando < 600;
    punteros.current.delete(evento.pointerId);
    evento.currentTarget.style.cursor = "grab";
    if (!eraUnToque) return;
    const { x, y } = posicion(evento);
    const codigo = paisEn(x, y);
    if (codigo) {
      setTocado(true);
      elegir(codigo, "centrar");
    }
  };

  /* ── Teclado sobre el globo ── */
  const alTeclearGlobo = (evento: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const paso = 12 / vista.current.zoom;
    const [lambda, phi] = vista.current.rotacion;
    const acciones: Record<string, () => void> = {
      ArrowLeft: () => (vista.current.rotacion = [lambda + paso, phi]),
      ArrowRight: () => (vista.current.rotacion = [lambda - paso, phi]),
      ArrowUp: () => (vista.current.rotacion = [lambda, acotar(phi - paso, -88, 88)]),
      ArrowDown: () => (vista.current.rotacion = [lambda, acotar(phi + paso, -88, 88)]),
      "+": () => (vista.current.zoom = acotar(vista.current.zoom * 1.4, ZOOM_MIN, ZOOM_MAX)),
      "=": () => (vista.current.zoom = acotar(vista.current.zoom * 1.4, ZOOM_MIN, ZOOM_MAX)),
      "-": () => (vista.current.zoom = acotar(vista.current.zoom / 1.4, ZOOM_MIN, ZOOM_MAX)),
      Enter: () => {
        const codigo = paisEn(vista.current.ancho / 2, vista.current.alto / 2);
        if (codigo) elegir(codigo, "quieto");
      },
    };
    const accion = acciones[evento.key];
    if (!accion) return;
    evento.preventDefault();
    detenerAnimacion();
    accion();
    marcarMovimiento();
    pedirDibujo();
  };

  const acercar = (factor: number) => {
    const z1 = acotar(vista.current.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    volarA([-vista.current.rotacion[0], -vista.current.rotacion[1]], z1);
  };

  /* ── El buscador ── Primero los que EMPIEZAN con lo escrito, después
     los que lo contienen. Sin tildes: «mexico» encuentra México. */
  const resultados = useMemo(() => {
    const texto = sinAcentos(busqueda.trim());
    if (!texto) return [];
    const empiezan: typeof opciones = [];
    const contienen: typeof opciones = [];
    for (const opcion of opciones) {
      const nombre = sinAcentos(opcion.label);
      if (nombre.startsWith(texto)) empiezan.push(opcion);
      else if (nombre.includes(texto) || opcion.value.toLowerCase() === texto) contienen.push(opcion);
    }
    const orden = (a: (typeof opciones)[number], b: (typeof opciones)[number]) => a.label.localeCompare(b.label, localeTag);
    return [...empiezan.sort(orden), ...contienen.sort(orden)].slice(0, 7);
  }, [busqueda, opciones, localeTag]);

  const elegirDeLista = (codigo: string) => {
    // En el teléfono el teclado tapaba medio globo justo cuando el
    // globo viaja: se baja.
    if (!window.matchMedia("(pointer: fine)").matches) buscador.current?.blur();
    setBusqueda("");
    setListaAbierta(false);
    setActivo(0);
    setTocado(true);
    elegir(codigo, "viajar");
  };

  const alTeclearBuscador = (evento: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!resultados.length) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setListaAbierta(true);
      setActivo((i) => (i + 1) % resultados.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setActivo((i) => (i - 1 + resultados.length) % resultados.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      elegirDeLista(resultados[activo]?.value ?? resultados[0].value);
    }
  };

  const nombreElegido = nombreDe(elegido);
  const sePuede = disponible(elegido);
  const mostrarLista = listaAbierta && busqueda.trim().length > 0;

  /* ── Las piezas ── */
  const insignia = (codigo: string) =>
    disponible(codigo) ? (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#14A3B8]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0E8DA1]">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#14A3B8]" />
        {t("auth.globe.available")}
      </span>
    ) : (
      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
        {t("auth.globe.unavailable")}
      </span>
    );

  /* Los botones redondos del globo: blancos sobre el escenario claro
     del teléfono; en escritorio, vidrio navy. De vidrio blanco se
     perdían en cuanto el zoom ponía tierra detrás. */
  const botonRedondo =
    "grid h-11 w-11 place-items-center rounded-full bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,32,44,0.08),0_6px_16px_-6px_rgba(15,32,44,0.25)] transition-[background-color,color,transform] duration-150 ease-out hover:text-[#1E2A33] active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14A3B8] md:h-10 md:w-10 md:bg-[#0f3550]/55 md:text-white md:shadow-[0_6px_18px_-8px_rgba(4,20,34,0.6)] md:ring-1 md:ring-white/20 md:backdrop-blur-md md:hover:bg-[#0f3550]/75 md:hover:text-white md:focus-visible:outline-white";

  /* ── La ventana ──
     Afuera de la aplicación todavía, así que no lleva la cabecera navy
     de las ventanas del sistema: es la tarjeta del login. En escritorio,
     el lado blanco con el título, el buscador y la decisión, y el panel
     azul con su curva —la misma de la pantalla de entrada— donde vive el
     globo. En el teléfono, blanca de arriba abajo, como el login ahí. */
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-stretch justify-center md:items-center md:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("auth.globe.close")}
        onClick={() => cerrar.current()}
        className="anim-fade absolute inset-0 bg-[#0d2c40]/55 backdrop-blur-[3px]"
      />

      <div
        ref={ventana}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="globo-ventana relative grid h-dvh w-full grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden bg-white text-[#1E2A33] outline-none md:h-[min(660px,calc(100dvh-3rem))] md:max-w-[1040px] md:grid-cols-[380px_minmax(0,1fr)] md:grid-rows-[auto_auto_minmax(0,1fr)_auto] md:rounded-[28px] md:shadow-[0_30px_80px_rgba(15,32,44,0.4)]"
      >
        <button
          type="button"
          onClick={() => cerrar.current()}
          aria-label={t("auth.globe.close")}
          className="absolute top-4 right-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-200 hover:text-[#1E2A33] active:scale-[0.94] md:top-5 md:right-5 md:bg-[#0f3550]/55 md:text-white md:ring-1 md:ring-white/20 md:backdrop-blur-md md:hover:bg-[#0f3550]/75 md:hover:text-white"
        >
          <X size={18} />
        </button>

        {/* ── El título ── */}
        <div className="row-start-1 px-5 pt-5 pr-16 md:col-start-1 md:px-10 md:pt-10 md:pr-10">
          <h2 id={tituloId} className="text-[22px] leading-tight font-bold text-[#1E2A33] md:text-[28px]">
            {t("auth.globe.title")}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{t("auth.globe.subtitle")}</p>
        </div>

        {/* ── El buscador ── */}
        <div className="relative z-20 row-start-2 border-b border-slate-100 px-5 pt-4 pb-4 md:col-start-1 md:border-b-0 md:px-10 md:pt-6 md:pb-2">
          <div className="relative">
            <Search size={17} aria-hidden className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-[#14A3B8]" />
            <input
              ref={buscador}
              type="text"
              role="combobox"
              aria-expanded={mostrarLista}
              aria-controls={listaId}
              aria-autocomplete="list"
              aria-activedescendant={mostrarLista && resultados[activo] ? `${listaId}-${resultados[activo].value}` : undefined}
              aria-label={t("auth.globe.searchAria")}
              placeholder={t("auth.globe.searchPlaceholder")}
              value={busqueda}
              autoComplete="off"
              spellCheck={false}
              onChange={(evento) => {
                setBusqueda(evento.target.value);
                setActivo(0);
                setListaAbierta(true);
              }}
              onFocus={() => setListaAbierta(true)}
              onBlur={() => window.setTimeout(() => setListaAbierta(false), 120)}
              onKeyDown={alTeclearBuscador}
              className="h-12 w-full rounded-full border border-transparent bg-slate-100 pr-5 pl-12 text-[16px] text-[#1E2A33] transition-colors duration-150 placeholder:text-slate-400 focus:border-[#14A3B8]/40 focus:bg-white focus:ring-2 focus:ring-[#14A3B8]/25 focus:outline-none md:h-[52px] md:text-sm"
            />

            {mostrarLista && (
              <ul
                id={listaId}
                role="listbox"
                aria-label={t("auth.globe.searchAria")}
                className="desplegable absolute top-[calc(100%+8px)] right-0 left-0 z-20 max-h-[min(320px,45dvh)] overflow-y-auto rounded-[20px] bg-white p-1.5 shadow-[0_18px_44px_-12px_rgba(15,32,44,0.3)] ring-1 ring-slate-200/70"
              >
                {resultados.length ? (
                  resultados.map((opcion, i) => (
                    <li
                      key={opcion.value}
                      id={`${listaId}-${opcion.value}`}
                      role="option"
                      aria-selected={i === activo}
                      onPointerDown={(evento) => evento.preventDefault()}
                      onClick={() => elegirDeLista(opcion.value)}
                      onPointerEnter={() => setActivo(i)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5 text-sm transition-colors duration-100 ${
                        i === activo ? "bg-slate-100 text-[#1E2A33]" : "text-slate-600"
                      }`}
                    >
                      <span className="min-w-0 truncate">{opcion.label}</span>
                      {insignia(opcion.value)}
                    </li>
                  ))
                ) : (
                  <li role="option" aria-selected={false} aria-disabled="true" className="px-3.5 py-3 text-[13px] text-slate-400">
                    {t("auth.globe.noResults", { q: busqueda.trim() })}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* ── El escenario ── */}
        <div
          ref={escenario}
          className="relative row-start-3 min-h-0 overflow-hidden bg-[radial-gradient(85%_75%_at_50%_45%,#ffffff_0%,#f3f7f9_45%,#e4ecf0_100%)] md:col-start-2 md:row-span-4 md:row-start-1 md:bg-[linear-gradient(135deg,#2F71A8_0%,#1f5a87_55%,#123C52_100%)]"
        >
          <canvas
            ref={lienzo}
            tabIndex={0}
            role="img"
            aria-label={t("auth.globe.globeAria")}
            aria-describedby={pistaId}
            onPointerDown={alBajar}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={(evento) => punteros.current.delete(evento.pointerId)}
            onPointerLeave={() => {
              if (rotulo.current) rotulo.current.style.opacity = "0";
              if (encima.current) {
                encima.current = null;
                pedirDibujo();
              }
            }}
            onKeyDown={alTeclearGlobo}
            className="absolute inset-0 cursor-grab touch-none outline-none select-none focus-visible:ring-2 focus-visible:ring-[#14A3B8]/50 focus-visible:ring-inset md:focus-visible:ring-white/50"
          />

          {/* La curva del login: el lado blanco entra en el azul y se
              ensancha hacia abajo. Misma forma, más corta. */}
          <svg
            aria-hidden
            viewBox="0 0 64 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden h-full w-16 md:block"
          >
            <path d="M0,0 L4,0 C4,42 24,82 64,100 L0,100 Z" fill="#ffffff" />
          </svg>

          {/* El faro de Costa Rica: late cuando no es el elegido, para
              que se encuentre sin buscarlo. */}
          <span
            ref={faro}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 opacity-0 transition-opacity duration-300"
          >
            <span className="globo-faro block h-3 w-3 rounded-full bg-[#14A3B8] ring-2 ring-white" />
          </span>

          {/* El nombre sobre el pinchito. */}
          <span
            ref={etiqueta}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 rounded-full bg-rail px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap text-white opacity-0 shadow-[0_4px_12px_-4px_rgba(15,32,44,0.4)] transition-opacity duration-200 md:bg-white md:text-[#1E2A33]"
          >
            {nombreElegido}
          </span>

          {/* El nombre del país bajo el mouse. */}
          <span
            ref={rotulo}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 rounded-[10px] bg-white px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap text-[#1E2A33] opacity-0 shadow-[0_6px_16px_-6px_rgba(15,32,44,0.35)] transition-opacity duration-150"
          />

          {cargando && (
            <div className="absolute inset-0 grid place-items-center">
              <span className="flex items-center gap-2 text-[13px] text-slate-500 md:text-white/80">
                <Loader size={16} className="animate-spin" />
                {t("auth.globe.loading")}
              </span>
            </div>
          )}
          {fallo && (
            <div className="absolute inset-0 grid place-items-center px-8 text-center text-[13px] text-slate-500 md:text-white/80">
              {t("auth.globe.loadError")}
            </div>
          )}

          {/* La pista, hasta el primer gesto. */}
          <p
            id={pistaId}
            className={`pointer-events-none absolute bottom-4 left-4 max-w-[55%] text-[11.5px] leading-snug text-slate-400 transition-opacity duration-500 md:bottom-6 md:left-20 md:text-white/70 ${tocado ? "opacity-0" : "opacity-100"}`}
          >
            {t("auth.globe.hint")}
          </p>

          <div className="absolute right-4 bottom-4 flex flex-col gap-2 md:right-6 md:bottom-6">
            <button type="button" className={botonRedondo} onClick={() => acercar(1.6)} aria-label={t("auth.globe.zoomIn")} title={t("auth.globe.zoomIn")}>
              <Plus size={17} />
            </button>
            <button type="button" className={botonRedondo} onClick={() => acercar(1 / 1.6)} aria-label={t("auth.globe.zoomOut")} title={t("auth.globe.zoomOut")}>
              <Minus size={17} />
            </button>
            <button
              type="button"
              className={botonRedondo}
              onClick={() => elegir(PAIS_PREDETERMINADO, "viajar")}
              aria-label={t("auth.globe.center")}
              title={t("auth.globe.center")}
            >
              <LocateFixed size={17} />
            </button>
          </div>
        </div>

        {/* ── Al medio, solo en escritorio: dónde ya estamos y qué
            significa cada color. ── */}
        <div className="hidden min-h-0 flex-col gap-6 overflow-y-auto px-10 pt-6 md:col-start-1 md:row-start-3 md:flex">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">{t("auth.globe.availableNow")}</p>
            <button
              type="button"
              onClick={() => elegir(PAIS_PREDETERMINADO, "viajar")}
              className="mt-2.5 flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-left transition-[background-color,transform] duration-150 ease-out hover:bg-slate-100 active:scale-[0.99]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#14A3B8]/10 text-[#14A3B8]">
                <MapPin size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#1E2A33]">{nombreDe(PAIS_PREDETERMINADO)}</span>
                <span className="block text-xs text-slate-500">{t("auth.globe.availableNowHint")}</span>
              </span>
            </button>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-500" aria-label={t("auth.globe.legend")}>
            {[
              [RELIEVE.tapa, t("auth.globe.legendSelected")],
              [PALETA_AZUL.disponible, t("auth.globe.legendAvailable")],
              [PALETA_AZUL.tierra, t("auth.globe.legendSoon")],
            ].map(([color, texto]) => (
              <li key={texto} className="flex items-center gap-2.5">
                <span aria-hidden className="h-3 w-3 rounded-full ring-1 ring-slate-900/10" style={{ background: color }} />
                {texto}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Abajo: el país elegido y la decisión. ── */}
        <div className="row-start-4 border-t border-slate-100 bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:col-start-1 md:row-start-4 md:px-10 md:pt-6 md:pb-9">
          <div aria-live="polite">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">{t("auth.globe.selected")}</p>
            {elegido ? (
              <>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                  <p className="min-w-0 truncate text-xl leading-tight font-bold text-[#1E2A33]">{nombreElegido}</p>
                  {insignia(elegido)}
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                  {sePuede ? t("auth.globe.availableBody") : t("auth.globe.unavailableBody", { pais: nombreElegido })}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[13px] text-slate-500">{t("auth.globe.noneSelected")}</p>
            )}
          </div>

          <div className="mt-4 md:mt-5">
            {elegido && !sePuede ? (
              <button
                type="button"
                onClick={() => elegir(PAIS_PREDETERMINADO, "viajar")}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#14A3B8]/60 px-6 text-xs font-semibold tracking-[0.12em] text-[#0E8DA1] uppercase transition-[background-color,border-color,transform] duration-200 ease-out hover:border-[#14A3B8] hover:bg-[#14A3B8]/5 active:scale-[0.98] md:h-[52px]"
              >
                <LocateFixed size={15} />
                {t("auth.globe.backToCr", { pais: nombreDe(PAIS_PREDETERMINADO) })}
              </button>
            ) : (
              <button
                type="button"
                disabled={!sePuede}
                onClick={() => elegido && onElegir(elegido)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#14A3B8] px-6 text-xs font-semibold tracking-[0.12em] text-white uppercase shadow-[0_10px_25px_rgba(20,163,184,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0E8DA1] hover:shadow-[0_14px_30px_rgba(14,141,161,0.5)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 md:h-[52px]"
              >
                <Check size={16} />
                {t("auth.globe.use", { pais: nombreElegido })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default GloboPaises;
