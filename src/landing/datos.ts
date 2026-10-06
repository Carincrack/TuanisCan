import { Footprints, PawPrint, Siren, type Icono } from "../lib/iconos";

/* ─────────────────────────────────────────────────────────────

* Contenido de la portada.
* Separado del maquetado para poder ajustar el mensaje sin tocar
* la estructura visual de la landing.
* ───────────────────────────────────────────────────────────── */

export interface Enlace {
href: string;
label: string;
}

export const ENLACES: Enlace[] = [
{ href: "#servicios", label: "landing.nav.services" },
{ href: "#pasos", label: "landing.nav.howItWorks" },
];

/* ── Los tres públicos ─────────────────────────────────────────

* Tuani Scan conecta tres necesidades dentro de una misma comunidad:
* quienes tienen mascota, quienes quieren pasear y quienes necesitan
* ayuda cuando una mascota se pierde.
* ───────────────────────────────────────────────────────────── */

export type ClavePublico = "dueno" | "paseador" | "perdidas";

export interface Publico {
clave: ClavePublico;
Icon: Icono;

/** Rótulo del conmutador. Clave de traducción, se resuelve con `t()`. */
label: string;

/** Texto principal que acompaña al hero. Clave de traducción. */
entrada: string;

/** Clave de traducción. */
cta: string;

/** Si existe, el CTA lleva a una página específica. */
ruta?: string;

foto: string;
/** Clave de traducción. */
fotoAlt: string;
}

export const PUBLICOS: Publico[] = [
{
clave: "dueno",
Icon: PawPrint,
label: "landing.publicos.dueno.label",
entrada: "landing.publicos.dueno.entrada",
cta: "landing.publicos.dueno.cta",
foto: "/img/hero-dueno.webp",
fotoAlt: "landing.publicos.dueno.fotoAlt",
},

{
clave: "paseador",
Icon: Footprints,
label: "landing.publicos.paseador.label",
entrada: "landing.publicos.paseador.entrada",
cta: "landing.publicos.paseador.cta",
foto: "/img/hero-paseador.webp",
fotoAlt: "landing.publicos.paseador.fotoAlt",
},

{
clave: "perdidas",
Icon: Siren,
label: "landing.publicos.perdidas.label",
entrada: "landing.publicos.perdidas.entrada",
cta: "landing.publicos.perdidas.cta",
ruta: "/perdidas",
foto: "/img/hero-perdidas.webp",
fotoAlt: "landing.publicos.perdidas.fotoAlt",
},
];

/* ── Servicios ─────────────────────────────────────────────────

* Cada módulo comunica una parte concreta de la experiencia.
* El lenguaje busca ser cercano y claro, sin sonar corporativo.
* ───────────────────────────────────────────────────────────── */

export interface Modulo {
foto: Ficha;

/** Nombre corto de la sección. */
etiqueta: string;

titulo: string;

texto: string;
}

export const MODULOS: Modulo[] = [
{
foto: {
src: "/img/golden.webp",
alt: "landing.modulos.paseos.fotoAlt",
},
etiqueta: "landing.modulos.paseos.etiqueta",
titulo: "landing.modulos.paseos.titulo",
texto: "landing.modulos.paseos.texto",
},

{
foto: {
src: "/img/gato-angora.webp",
alt: "landing.modulos.directorio.fotoAlt",
},
etiqueta: "landing.modulos.directorio.etiqueta",
titulo: "landing.modulos.directorio.titulo",
texto: "landing.modulos.directorio.texto",
},

{
foto: {
src: "/img/chihuahua.webp",
alt: "landing.modulos.alertas.fotoAlt",
},
etiqueta: "landing.modulos.alertas.etiqueta",
titulo: "landing.modulos.alertas.titulo",
texto: "landing.modulos.alertas.texto",
},
];

/* ── Cómo funciona ─────────────────────────────────────────────

* Es una secuencia sencilla: registrás a tu mascota, elegís a
* quién confiarle el paseo y acompañás todo el proceso desde la app.
* ───────────────────────────────────────────────────────────── */

export interface Paso {
titulo: string;
texto: string;
}

export const PASOS: Paso[] = [
{
titulo: "landing.pasos.registrar.titulo",
texto: "landing.pasos.registrar.texto",
},

{
titulo: "landing.pasos.encontrar.titulo",
texto: "landing.pasos.encontrar.texto",
},

{
titulo: "landing.pasos.disfrutar.titulo",
texto: "landing.pasos.disfrutar.texto",
},
];

/** Caras del grupo de prueba social. */
export const PASEADORES_DESTACADOS = ["walker-1", "walker-2", "walker-3"];

/* ── Fotos ───────────────────────────────────────────────────── */

export interface Ficha {
src: string;

/** Describe lo que se ve. Si la foto cambia, esto cambia. */
alt: string;
}
