import { createElement, useEffect, useRef, useState } from "react";
import type {
  ComponentType,
  CSSProperties,
  ForwardRefExoticComponent,
  RefAttributes,
} from "react";

import {
  TriangleAlert as AlertTriangleVivo,
  ArrowLeft as ArrowLeftVivo,
  ArrowRight as ArrowRightVivo,
  Banknote as BanknoteVivo,
  ChartColumn as BarChart3Vivo,
  Bell as BellVivo,
  BookOpen as BookOpenVivo,
  Calendar as CalendarVivo,
  CalendarCheck as CalendarCheckVivo,
  CalendarDays as CalendarDaysVivo,
  Camera as CameraVivo,
  Check as CheckVivo,
  CircleCheck as CheckCircle2Vivo,
  ChevronDown as ChevronDownVivo,
  ChevronLeft as ChevronLeftVivo,
  ChevronRight as ChevronRightVivo,
  CircleCheckBig as CircleCheckBigVivo,
  Clock as ClockVivo,
  CreditCard as CreditCardVivo,
  Download as DownloadVivo,
  ExternalLink as ExternalLinkVivo,
  Eye as EyeVivo,
  EyeOff as EyeOffVivo,
  FileText as FileTextVivo,
  Footprints as FootprintsVivo,
  Image as ImageVivo,
  Inbox as InboxVivo,
  LayoutDashboard as LayoutDashboardVivo,
  Loader as LoaderVivo,
  Lock as LockVivo,
  LogOut as LogOutVivo,
  Mail as MailVivo,
  MapPin as MapPinVivo,
  Menu as MenuVivo,
  MessageCircle as MessageCircleVivo,
  Navigation as NavigationVivo,
  Pause as PauseVivo,
  Pencil as PencilVivo,
  Phone as PhoneVivo,
  Play as PlayVivo,
  Plus as PlusVivo,
  RefreshCw as RefreshCwVivo,
  Repeat as RepeatVivo,
  Save as SaveVivo,
  Search as SearchVivo,
  Send as SendVivo,
  Share as Share2Vivo,
  ShieldCheck as ShieldCheckVivo,
  Sparkles as SparklesVivo,
  Star as StarVivo,
  Store as StoreVivo,
  Timer as TimerVivo,
  Trash2 as Trash2Vivo,
  TrendingUp as TrendingUpVivo,
  Upload as UploadVivo,
  User as UserVivo,
  UserCheck as UserCheckVivo,
  UserPlus as UserPlusVivo,
  UserRound as UserRoundVivo,
  UserX as UserXVivo,
  Users as UsersVivo,
  Wallet as WalletVivo,
  X as XVivo,
} from "@animateicons/react/lucide";

/* ─────────────────────────────────────────────────────────────
   LOS ICONOS

   Un único sitio del que sale todo icono de la aplicación y de la
   portada. Nadie importa de "lucide-react" ni de
   "@animateicons/react/lucide" directamente: importan de acá, y
   desde fuera todos los iconos son la misma cosa.

   Por dentro hay dos procedencias.

   · 63 vienen del paquete animado. Son los dibujos de Lucide
     con cada trazo convertido en `motion.path`.

   · 16 los dibujamos acá. El paquete no los tiene, y entre
     ellos está PawPrint —la marca— y Siren, que rotula mascotas
     perdidas. Sustituirlos por el dibujo más parecido que sí
     estuviera (Dog por PawPrint, Megaphone por Siren) habría sido
     cambiar lo que dicen para ganar un movimiento. Así que llevan
     la geometría exacta de Lucide, copiada de su propio paquete, y
     el movimiento se lo pone CSS: cada trazo lleva `pathLength="1"`
     —el mismo recurso con el que se dibujan solos los garabatos de
     la portada— y un `--i` con su posición, para escalonarlos. Las
     reglas viven en index.css bajo `.icono-propio`.

   Las dos familias son geometría Lucide sobre la retícula de 24, así
   que mezcladas no se distinguen. Con una condición: el trazo. Los
   del paquete lo llevan clavado a 2 y no lo exponen, así que el
   sistema entero es de trazo 2 y `strokeWidth` deja de existir como
   recurso — por eso este módulo se lo traga en vez de pasarlo: si
   llegara al componente animado acabaría de atributo suelto en un
   `<div>`, y React lo cantaría por consola en cada render.

   ── Por qué el envoltorio ──

   Un icono animado se anima al pasarle el ratón POR ENCIMA. Pero acá
   casi ninguno está suelto: viven dentro de un botón, de una fila del
   menú, de una píldora. Que se mueva solo cuando el cursor acierta a
   caer sobre sus 16 px, y no cuando se recorre la fila entera, es
   peor que no moverse: parece que falla.

   El envoltorio busca al montar el elemento que de verdad se pulsa
   —`closest()` hasta el botón, el enlace o la fila— y engancha ahí
   el roce. Se hace en el DOM y no pasando propiedades desde cada
   botón porque son más de cuatrocientos sitios de llamada, y ninguno
   tendría por qué enterarse de que su icono ahora se mueve.

   El paquete colabora: en cuanto se le engancha un `ref` deja de
   animarse por su cuenta y cede el mando. Por eso el envoltorio trae
   además su propio roce de reserva, para el icono que no encuentra
   contenedor y sí está suelto de verdad.

   El movimiento reducido se respeta por los dos lados: el paquete ya
   consulta `prefers-reduced-motion`, y los de dibujo propio lo tienen
   contemplado en index.css.
   ───────────────────────────────────────────────────────────── */

export interface PropsIcono {
  size?: number;
  className?: string;
  /** Se acepta y se ignora. Ver arriba: el sistema es de trazo 2. */
  strokeWidth?: number;
  /** Cae en la caja del icono, no en el trazo. Sirve para el color
      —el dibujo es todo `currentColor`— en los sitios donde el valor
      no es un token de Tailwind, como los de la portada. */
  style?: CSSProperties;
  title?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Un icono, venga de donde venga. Es lo que va en las tablas de
    navegación y en cualquier sitio donde el icono viaje como dato. */
export type Icono = ComponentType<PropsIcono>;

interface Mando {
  startAnimation: () => void;
  stopAnimation: () => void;
}

type PropsVivo = {
  size?: number;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

type ComponenteVivo = ForwardRefExoticComponent<
  PropsVivo & RefAttributes<Mando>
>;

/* Quitar el trazo por copia y no por desestructuración: nombrar una
   variable solo para no usarla es exactamente lo que la regla de
   variables sin usar existe para señalar. */
const sinTrazo = (props: PropsIcono) => {
  const limpias: PropsIcono = { ...props };
  delete limpias.strokeWidth;
  return limpias;
};

/* Lo que cuenta como "lo que el usuario está pulsando". El orden no
   importa: `closest` devuelve el ancestro más cercano que encaje con
   cualquiera de estos, que es justo lo que se busca. */
const ANFITRION = [
  "button",
  "a[href]",
  "label",
  "summary",
  "[role='button']",
  "[role='option']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='combobox']",
].join(",");

/* El ancla existe solo para tener un nodo desde el que subir por el
   árbol. `display: contents` la borra de la maquetación —no ocupa, no
   rompe un `flex`, no hereda tamaño— pero la deja en el DOM, que es
   lo único que `closest` necesita. */
const useRoce = (arrancar: () => void, parar: () => void) => {
  const ancla = useRef<HTMLSpanElement>(null);
  const suelto = useRef(false);
  const acciones = useRef({ arrancar, parar });

  useEffect(() => {
    acciones.current = { arrancar, parar };
  });

  useEffect(() => {
    const anfitrion = ancla.current?.closest(ANFITRION);

    if (!anfitrion) {
      suelto.current = true;
      return;
    }

    const entrar = () => acciones.current.arrancar();
    const salir = () => acciones.current.parar();

    anfitrion.addEventListener("mouseenter", entrar);
    anfitrion.addEventListener("mouseleave", salir);

    return () => {
      anfitrion.removeEventListener("mouseenter", entrar);
      anfitrion.removeEventListener("mouseleave", salir);
    };
  }, []);

  return { ancla, suelto };
};

const animado = (Vivo: ComponenteVivo): Icono => {
  const Envuelto = (props: PropsIcono) => {
    const mando = useRef<Mando>(null);
    const { ancla, suelto } = useRoce(
      () => mando.current?.startAnimation(),
      () => mando.current?.stopAnimation(),
    );

    return (
      <span ref={ancla} style={{ display: "contents" }}>
        <Vivo
          ref={mando}
          onMouseEnter={() => {
            if (suelto.current) mando.current?.startAnimation();
          }}
          onMouseLeave={() => {
            if (suelto.current) mando.current?.stopAnimation();
          }}
          {...sinTrazo(props)}
        />
      </span>
    );
  };

  Envuelto.displayName = "IconoAnimado";

  return Envuelto;
};

/* ── Los de dibujo propio ───────────────────────────────────── */

type Parte = [string, Record<string, string>, string];

const DIBUJOS: Record<string, Parte[]> = {
  PawPrint: [
    ["circle", {"cx":"11","cy":"4","r":"2"}, "vol9p0"],
    ["circle", {"cx":"18","cy":"8","r":"2"}, "17gozi"],
    ["circle", {"cx":"20","cy":"16","r":"2"}, "1v9bxh"],
    ["path", {"d":"M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"}, "1ydw1z"],
  ],
  Siren: [
    ["path", {"d":"M7 18v-6a5 5 0 1 1 10 0v6"}, "pcx96s"],
    ["path", {"d":"M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"}, "1b4s83"],
    ["path", {"d":"M21 12h1"}, "jtio3y"],
    ["path", {"d":"M18.5 4.5 18 5"}, "g5sp9y"],
    ["path", {"d":"M2 12h1"}, "1uaihz"],
    ["path", {"d":"M12 2v1"}, "11qlp1"],
    ["path", {"d":"m4.929 4.929.707.707"}, "1i51kw"],
    ["path", {"d":"M12 12v6"}, "3ahymv"],
  ],
  AlertCircle: [
    ["circle", {"cx":"12","cy":"12","r":"10"}, "1mglay"],
    ["line", {"x1":"12","x2":"12","y1":"8","y2":"12"}, "1pkeuh"],
    ["line", {"x1":"12","x2":"12.01","y1":"16","y2":"16"}, "4dfq90"],
  ],
  ShieldAlert: [
    ["path", {"d":"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"}, "oel41y"],
    ["path", {"d":"M12 8v4"}, "1got3b"],
    ["path", {"d":"M12 16h.01"}, "1drbdi"],
  ],
  ChevronsUpDown: [
    ["path", {"d":"m7 15 5 5 5-5"}, "1hf1tw"],
    ["path", {"d":"m7 9 5-5 5 5"}, "sgt6xg"],
  ],
  HeartHandshake: [
    ["path", {"d":"M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762"}, "17lmqv"],
  ],
  Stethoscope: [
    ["path", {"d":"M11 2v2"}, "1539x4"],
    ["path", {"d":"M5 2v2"}, "1yf1q8"],
    ["path", {"d":"M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"}, "rb5t3r"],
    ["path", {"d":"M8 15a6 6 0 0 0 12 0v-3"}, "x18d4x"],
    ["circle", {"cx":"20","cy":"10","r":"2"}, "ts1r5v"],
  ],
  Maximize2: [
    ["path", {"d":"M15 3h6v6"}, "1q9fwt"],
    ["path", {"d":"m21 3-7 7"}, "1l2asr"],
    ["path", {"d":"m3 21 7-7"}, "tjx5ai"],
    ["path", {"d":"M9 21H3v-6"}, "wtvkvv"],
  ],
  Minimize2: [
    ["path", {"d":"m14 10 7-7"}, "oa77jy"],
    ["path", {"d":"M20 10h-6V4"}, "mjg0md"],
    ["path", {"d":"m3 21 7-7"}, "tjx5ai"],
    ["path", {"d":"M4 14h6v6"}, "rmj7iw"],
  ],
  PanelLeftClose: [
    ["rect", {"width":"18","height":"18","x":"3","y":"3","rx":"2"}, "afitv7"],
    ["path", {"d":"M9 3v18"}, "fh3hqa"],
    ["path", {"d":"m16 15-3-3 3-3"}, "14y99z"],
  ],
  PanelLeftOpen: [
    ["rect", {"width":"18","height":"18","x":"3","y":"3","rx":"2"}, "afitv7"],
    ["path", {"d":"M9 3v18"}, "fh3hqa"],
    ["path", {"d":"m14 9 3 3-3 3"}, "8010ee"],
  ],
  Syringe: [
    ["path", {"d":"m18 2 4 4"}, "22kx64"],
    ["path", {"d":"m17 7 3-3"}, "1w1zoj"],
    ["path", {"d":"M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"}, "1exhtz"],
    ["path", {"d":"m9 11 4 4"}, "rovt3i"],
    ["path", {"d":"m5 19-3 3"}, "59f2uf"],
    ["path", {"d":"m14 4 6 6"}, "yqp9t2"],
  ],
  Building2: [
    ["path", {"d":"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"}, "1b4qmf"],
    ["path", {"d":"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"}, "i71pzd"],
    ["path", {"d":"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"}, "10jefs"],
    ["path", {"d":"M10 6h4"}, "1itunk"],
    ["path", {"d":"M10 10h4"}, "tcdvrf"],
    ["path", {"d":"M10 14h4"}, "kelpxr"],
    ["path", {"d":"M10 18h4"}, "1ulq68"],
  ],
  IdCard: [
    ["path", {"d":"M16 10h2"}, "8sgtl7"],
    ["path", {"d":"M16 14h2"}, "epxaof"],
    ["path", {"d":"M6.17 15a3 3 0 0 1 5.66 0"}, "n6f512"],
    ["circle", {"cx":"9","cy":"11","r":"2"}, "yxgjnd"],
    ["rect", {"x":"2","y":"5","width":"20","height":"14","rx":"2"}, "qneu4z"],
  ],
  UserCircle: [
    ["circle", {"cx":"12","cy":"12","r":"10"}, "1mglay"],
    ["circle", {"cx":"12","cy":"10","r":"3"}, "ilqhr7"],
    ["path", {"d":"M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"}, "154egf"],
  ],
  BadgeCheck: [
    ["path", {"d":"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"}, "3c2336"],
    ["path", {"d":"m9 12 2 2 4-4"}, "dzmm74"],
  ],
};

/* El gesto de cada uno, y para el par de paneles la dirección del
   empujón: cerrar mira a la izquierda, abrir a la derecha. */
const GESTOS: Record<string, [string, number?]> = {
  PawPrint: ["patitas"],
  Siren: ["aviso"],
  AlertCircle: ["aviso"],
  ShieldAlert: ["aviso"],
  ChevronsUpDown: ["separar"],
  HeartHandshake: ["latido"],
  Stethoscope: ["latido"],
  Maximize2: ["crecer"],
  Minimize2: ["menguar"],
  PanelLeftClose: ["panel", -1],
  PanelLeftOpen: ["panel", 1],
  Syringe: ["inyectar"],
  Building2: ["trazo"],
  IdCard: ["trazo"],
  UserCircle: ["trazo"],
  BadgeCheck: ["trazo"],
};

const propio = (nombre: string): Icono => {
  const [gesto, direccion] = GESTOS[nombre];
  const partes = DIBUJOS[nombre];

  const Envuelto = (props: PropsIcono) => {
    const [roce, setRoce] = useState(false);
    const { ancla, suelto } = useRoce(
      () => setRoce(true),
      () => setRoce(false),
    );

    const { size = 24, className, ...resto } = sinTrazo(props);

    return (
      <span ref={ancla} style={{ display: "contents" }}>
        <div
          className={`inline-flex items-center justify-center ${className ?? ""}`}
          onMouseEnter={() => {
            if (suelto.current) setRoce(true);
          }}
          onMouseLeave={() => {
            if (suelto.current) setRoce(false);
          }}
          {...resto}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icono-propio"
            data-gesto={gesto}
            data-roce={roce ? "si" : "no"}
            style={
              direccion
                ? ({ "--tsc-dir": direccion } as CSSProperties)
                : undefined
            }
          >
            {partes.map(([etiqueta, atributos, llave], i) =>
              createElement(etiqueta, {
                ...atributos,
                key: llave,
                /* Normaliza el largo del trazo a 1, así el redibujado
                   se escribe en CSS sin medir nada. */
                pathLength: 1,
                style: { "--i": i } as CSSProperties,
              }),
            )}
          </svg>
        </div>
      </span>
    );
  };

  Envuelto.displayName = "IconoPropio";

  return Envuelto;
};

/* ── Del paquete ────────────────────────────────────────────── */

export const AlertTriangle = animado(AlertTriangleVivo);
export const ArrowLeft = animado(ArrowLeftVivo);
export const ArrowRight = animado(ArrowRightVivo);
export const Banknote = animado(BanknoteVivo);
export const BarChart3 = animado(BarChart3Vivo);
export const Bell = animado(BellVivo);
export const BookOpen = animado(BookOpenVivo);
export const Calendar = animado(CalendarVivo);
export const CalendarCheck = animado(CalendarCheckVivo);
export const CalendarDays = animado(CalendarDaysVivo);
export const Camera = animado(CameraVivo);
export const Check = animado(CheckVivo);
export const CheckCircle2 = animado(CheckCircle2Vivo);
export const ChevronDown = animado(ChevronDownVivo);
export const ChevronLeft = animado(ChevronLeftVivo);
export const ChevronRight = animado(ChevronRightVivo);
export const CircleCheckBig = animado(CircleCheckBigVivo);
export const Clock = animado(ClockVivo);
export const CreditCard = animado(CreditCardVivo);
export const Download = animado(DownloadVivo);
export const ExternalLink = animado(ExternalLinkVivo);
export const Eye = animado(EyeVivo);
export const EyeOff = animado(EyeOffVivo);
export const FileText = animado(FileTextVivo);
export const Footprints = animado(FootprintsVivo);
export const Image = animado(ImageVivo);
export const Inbox = animado(InboxVivo);
export const LayoutDashboard = animado(LayoutDashboardVivo);
export const Loader = animado(LoaderVivo);
export const Lock = animado(LockVivo);
export const LogOut = animado(LogOutVivo);
export const Mail = animado(MailVivo);
export const MapPin = animado(MapPinVivo);
export const Menu = animado(MenuVivo);
export const MessageCircle = animado(MessageCircleVivo);
export const Navigation = animado(NavigationVivo);
export const Pause = animado(PauseVivo);
export const Pencil = animado(PencilVivo);
export const Phone = animado(PhoneVivo);
export const Play = animado(PlayVivo);
export const Plus = animado(PlusVivo);
export const RefreshCw = animado(RefreshCwVivo);
export const Repeat = animado(RepeatVivo);
export const Save = animado(SaveVivo);
export const Search = animado(SearchVivo);
export const Send = animado(SendVivo);
export const Share2 = animado(Share2Vivo);
export const ShieldCheck = animado(ShieldCheckVivo);
export const Sparkles = animado(SparklesVivo);
export const Star = animado(StarVivo);
export const Store = animado(StoreVivo);
export const Timer = animado(TimerVivo);
export const Trash2 = animado(Trash2Vivo);
export const TrendingUp = animado(TrendingUpVivo);
export const Upload = animado(UploadVivo);
export const User = animado(UserVivo);
export const UserCheck = animado(UserCheckVivo);
export const UserPlus = animado(UserPlusVivo);
export const UserRound = animado(UserRoundVivo);
export const UserX = animado(UserXVivo);
export const Users = animado(UsersVivo);
export const Wallet = animado(WalletVivo);
export const X = animado(XVivo);

/* ── De dibujo propio ───────────────────────────────────────── */

export const AlertCircle = propio("AlertCircle");
export const BadgeCheck = propio("BadgeCheck");
export const Building2 = propio("Building2");
export const ChevronsUpDown = propio("ChevronsUpDown");
export const HeartHandshake = propio("HeartHandshake");
export const IdCard = propio("IdCard");
export const Maximize2 = propio("Maximize2");
export const Minimize2 = propio("Minimize2");
export const PanelLeftClose = propio("PanelLeftClose");
export const PanelLeftOpen = propio("PanelLeftOpen");
export const PawPrint = propio("PawPrint");
export const ShieldAlert = propio("ShieldAlert");
export const Siren = propio("Siren");
export const Stethoscope = propio("Stethoscope");
export const Syringe = propio("Syringe");
export const UserCircle = propio("UserCircle");
