import { Footprints, PawPrint, type LucideIcon } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Contenido de la portada. Separado del maquetado a propósito: el
   texto de venta cambia mucho más seguido que el layout.
   ───────────────────────────────────────────────────────────── */

export interface Enlace {
  href: string;
  label: string;
}

export const ENLACES: Enlace[] = [
  { href: "#servicios", label: "Servicios" },
  { href: "#pasos", label: "Cómo funciona" },
];

/* ── Los dos públicos ──────────────────────────────────────────
   La referencia tiene un conmutador perro/gato abajo a la derecha.
   El nuestro no puede ser ese: acá no vendemos comida para dos
   especies, sino un servicio con dos lados. El conmutador cambia
   entre quien contrata y quien pasea, que es la única bifurcación
   real del producto — y cambia lo que dice el hero, no solo el
   icono. */

export type ClavePublico = "dueno" | "paseador";

export interface Publico {
  clave: ClavePublico;
  Icon: LucideIcon;
  /** Rótulo del conmutador. */
  label: string;
  /** Se lee debajo del wordmark. */
  entrada: string;
  cta: string;
  /** El perro del hero. Cambia con el conmutador porque es la
      señal más grande de que el botón hizo algo: el párrafo y el
      CTA también cambian, pero hay que leerlos; al perro se lo ve.

      Los dos recortes se encuadraron para ser intercambiables —
      mismo lienzo, sujeto a sangre de arriba abajo y su centro en
      el 48% del ancho—, así que el cambio no salta de tamaño ni
      se corre de sitio. Si se agrega un tercer público hay que
      encuadrar el suyo igual. */
  foto: string;
  fotoAlt: string;
}

export const PUBLICOS: Publico[] = [
  {
    clave: "dueno",
    Icon: PawPrint,
    label: "Tengo mascota",
    entrada:
      "Paseadores verificados, veterinarias cerca y una comunidad que se activa cuando una mascota se pierde.",
    cta: "Buscar paseador",
    foto: "/img/hero-dueno.webp",
    fotoAlt: "Border collie atento, listo para salir a pasear",
  },
  {
    clave: "paseador",
    Icon: Footprints,
    label: "Quiero pasear",
    entrada:
      "Armá tu perfil, elegí las zonas donde paseás y recibí solicitudes de dueños de tu cantón. El cobro va por la app.",
    cta: "Ofrecer mis paseos",
    foto: "/img/hero-paseador.webp",
    fotoAlt: "Husky de ojos azules sentado, esperando a que lo saquen",
  },
];

export interface Modulo {
  foto: Ficha;
  /** Nombre corto del módulo, de rótulo sobre el titular. Nombra la
      parte del producto; no la enumera, porque las tres son
      paralelas y ninguna va antes que otra. */
  etiqueta: string;
  titulo: string;
  texto: string;
}

/* Sin ícono: la referencia (era-residence.com) no lleva ni uno en su
   bloque de tres — la elegancia sale de la foto y del aire, no de un
   cuadrito de color. Cada módulo lleva la suya en vez de compartir el
   par decorativo que había antes; así la foto ilustra lo que el
   texto de al lado promete y no un adorno de fondo sin relación. */
/* Las tres de acá abajo NO son de `public/mock`: viven en
   `public/img` y son recortes sin fondo, elegidos a mano. Salieron
   de `src/resources/img` pesando 7,9 MB entre las tres; se les
   sangró el color del sujeto sobre el halo del recorte —venían de
   fondos oscuros y dejaban borde gris sobre blanco—, se escalaron a
   600 px de ancho y se guardaron en WebP con alfa: 257 KB en total.

   600 px porque en la banda se dibujan a unos 290: da 2x de sobra
   para pantalla retina y no más.

   Las tres llevan alfa, así que aguantan cualquier color de banda.

   En `public/img` viven además los dos juguetes que flotan en esa
   misma banda. Son decoración y no contenido, así que no salen de
   acá: los declara `Servicios.tsx`, que es quien los coloca. */
export const MODULOS: Modulo[] = [
  {
    foto: {
      src: "/img/golden.webp",
      alt: "Golden retriever adulto sentado, con la boca abierta, mirando a cámara",
    },
    etiqueta: "Paseos",
    titulo: "Paseos con quien sí conocés",
    texto:
      "Paseadores verificados, con calificación y zona visible. Agendás, seguís el paseo y pagás desde la misma pantalla.",
  },
  {
    foto: {
      src: "/img/gato-angora.webp",
      alt: "Gato angora blanco y negro sentado, mirando a cámara",
    },
    etiqueta: "Directorio",
    titulo: "Veterinarias y tiendas cerca",
    texto:
      "Directorio de comercios aliados con horario, teléfono y reseñas. Se acabó buscar en tres grupos de Facebook distintos.",
  },
  {
    foto: {
      src: "/img/chihuahua.webp",
      alt: "Chihuahua color crema sentado, con la lengua afuera, mirando a cámara",
    },
    etiqueta: "Alertas",
    titulo: "Una comunidad que busca",
    texto:
      "Cuando una mascota se pierde, el reporte le llega a la gente de la zona. Los avistamientos vuelven al dueño en minutos.",
  },
];

export interface Paso {
  titulo: string;
  texto: string;
}

/* Esto sí es una secuencia — no se puede pedir un paseo sin haber
   registrado la mascota — pero ya no lleva foto. `MODULOS`, arriba,
   es todo fotografía; si "Cómo funciona" repite el mismo molde de
   tarjeta con imagen, la página lee dos veces la misma idea con
   ropa distinta. Acá el peso lo lleva la tipografía: el número
   grande y el texto, sin caja, sin ficha, sin ícono. */
export const PASOS: Paso[] = [
  {
    titulo: "Registrá a tu mascota",
    texto: "Nombre, raza, foto y carné de vacunas. Queda lista para cualquier paseo.",
  },
  {
    titulo: "Elegí paseador por zona",
    texto: "Filtrás por cantón, disponibilidad y calificación. Ves el precio antes de pedir.",
  },
  {
    titulo: "Seguí el paseo y pagá",
    texto: "Bitácora del recorrido, cobro al terminar y una reseña que ayuda al siguiente.",
  },
];

/** Caras del grupo de prueba social.

    Hoy no lo usa nadie: el bloque "Paseadores verificados" salió de
    "Cómo funciona". Se deja porque las fotos siguen en `public/mock`
    y la lista es el único sitio donde está escrito cuáles eran. */
export const PASEADORES_DESTACADOS = ["walker-1", "walker-2", "walker-3"];

/* ── Fotos ─────────────────────────────────────────────────────
   Pocas y chicas, a propósito. Las de `public/mock` miden 500 px
   de ancho: pasadas de ~260 px de caja se ven blandas en pantalla
   retina. Se usan en fichas pequeñas, que además es la idea — la
   portada se sostiene con tipografía y aire, no con fotos grandes.

   Los `walker-*` son retratos de estudio de personas, no escenas
   de paseo. Sirven de caras verificadas; no de foto de acción.

   Ojo: son imágenes de relleno. Antes de publicar hay que
   confirmar la licencia de cada una o cambiarlas por propias. */

export interface Ficha {
  src: string;
  /** Describe lo que se ve. Si la foto cambia, esto cambia. */
  alt: string;
}
