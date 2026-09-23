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
{ href: "#servicios", label: "Servicios" },
{ href: "#pasos", label: "Cómo funciona" },
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

/** Rótulo del conmutador. */
label: string;

/** Texto principal que acompaña al hero. */
entrada: string;

cta: string;

/** Si existe, el CTA lleva a una página específica. */
ruta?: string;

foto: string;
fotoAlt: string;
}

export const PUBLICOS: Publico[] = [
{
clave: "dueno",
Icon: PawPrint,
label: "Tengo mascota",
entrada:
"Todo lo que tu mascota necesita, más cerca de vos: encontrá paseadores, veterinarias y lugares de confianza, y mantené siempre a tu compañero conectado con su comunidad.",
cta: "Buscar paseador",
foto: "/img/hero-dueno.webp",
fotoAlt: "Border collie atento, listo para salir a pasear",
},

{
clave: "paseador",
Icon: Footprints,
label: "Quiero pasear",
entrada:
"Convertí tu amor por los animales en una oportunidad. Creá tu perfil, elegí dónde querés pasear y conectá con personas de tu zona que necesitan alguien de confianza para cuidar a su mascota.",
cta: "Ofrecer mis paseos",
foto: "/img/hero-paseador.webp",
fotoAlt: "Husky de ojos azules sentado, esperando a que lo saquen",
},

{
clave: "perdidas",
Icon: Siren,
label: "Mascotas perdidas",
entrada:
"Mirá las mascotas que se perdieron cerca de vos. Si viste alguna, avisale a su dueño desde su ficha y ayudá a que vuelva a casa.",
cta: "Ver mascotas perdidas",
ruta: "/perdidas",
foto: "/img/hero-perdidas.webp",
fotoAlt: "Gato atigrado gris mirando de frente a cámara",
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
alt: "Golden retriever adulto sentado, con la boca abierta, mirando a cámara",
},
etiqueta: "Paseos",
titulo: "Un paseo se disfruta más cuando hay confianza",
texto:
"Encontrá paseadores verificados cerca de vos, conocé su perfil, calificaciones y zona de trabajo antes de reservar. Coordiná el paseo, seguí el recorrido y pagá de forma sencilla, todo desde un mismo lugar.",
},

{
foto: {
src: "/img/gato-angora.webp",
alt: "Gato angora blanco y negro sentado, mirando a cámara",
},
etiqueta: "Directorio",
titulo: "Todo lo que tu mascota necesita, más cerca",
texto:
"Encontrá veterinarias, tiendas y otros servicios para mascotas en tu zona. Consultá horarios, teléfonos y reseñas para saber adónde ir cuando necesitás una mano con tu compañero.",
},

{
foto: {
src: "/img/chihuahua.webp",
alt: "Chihuahua color crema sentado, con la lengua afuera, mirando a cámara",
},
etiqueta: "Alertas",
titulo: "Cuando una mascota se pierde, todos podemos ayudar",
texto:
"Publicá una alerta y hacé que llegue a personas de la zona. Si alguien reconoce a tu mascota o la ve por ahí, puede avisarte directamente para que entre todos podamos ayudarla a volver a casa.",
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
titulo: "Registrá a tu mascota",
texto:
"Creá su perfil con su nombre, raza, foto y la información que querás tener siempre a mano. Así, cuando necesités un paseo o ayuda, todo está listo.",
},

{
titulo: "Encontrá a alguien de confianza",
texto:
"Buscá paseadores por zona, disponibilidad y calificación. Revisá su perfil y conocé el precio antes de solicitar el paseo.",
},

{
titulo: "Disfrutá el paseo con tranquilidad",
texto:
"Seguí el recorrido, mantené todo registrado y realizá el pago al terminar. Después, dejá tu reseña para ayudar a otros dueños de la comunidad.",
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
