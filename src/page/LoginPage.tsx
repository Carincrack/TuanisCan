import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
  PawPrint,
  Footprints,
  Store,
  MapPin,
  Image,
  FileText,
  Banknote,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { inicioDeRol, MARCA } from "../lib/nav";
import { useAuth } from "../hooks/useAuth";
import { getZonas } from "../services/auth.service";
import type { RolPublico, Zona } from "../types/auth.types";
import { isValidProfilePhotoUrl } from "../lib/profile";

/** Rol elegido en el login. El administrador entra por /acceso-interno. */
interface LoginPageProps {
  /** Lockup con contorno blanco. Ver MARCA en src/lib/nav.ts. */
  logoSrc?: string;
  initialMode?: Mode;
  onBack?: () => void;
}

const ROLES: {
  id: RolPublico;
  titulo: string;
  descripcion: string;
  Icon: typeof PawPrint;
}[] = [
  {
    id: "dueno",
    titulo: "Dueño",
    descripcion: "Contrato paseos",
    Icon: PawPrint,
  },
  {
    id: "paseador",
    titulo: "Paseador",
    descripcion: "Realizo los paseos",
    Icon: Footprints,
  },
  {
    id: "negocio",
    titulo: "Negocio",
    descripcion: "Ofrezco servicios",
    Icon: Store,
  },
];

/*
  ─── PALETA ───────────────────────────────────────────────────────────
  El panel NO usa los turquesas del logo a propósito: si el fondo es del
  mismo color, el logo se pierde. Va en azul oscuro (el mismo tono del
  "CR" y de la correa del logo), así el turquesa del logo resalta encima.
  Se subió la saturación de todos los azules (fondo, panel, media luna)
  para que se sienta más vivo, sin tocar el logo ni el turquesa de acento.

    #2F6FA6 / #123C52  azul vívido → media luna y panel de marca (desktop)
    #1D4E6C / #0E2733  azul oscuro → panel de marca (fallback mobile, sin luna)
    #4C8CB0 / #2E6584 / #163C52  fondo de la página, azul fresco
    #14A3B8            turquesa    → SOLO acentos: botones e íconos (igual al logo)
    #1E2A33            casi negro  → títulos
*/

type Mode = "signin" | "signup";
/*
  ─── FASES ────────────────────────────────────────────────────────────
  idle     → quieto.
  sweeping → avanza la media luna. NADA desaparece todavía: el
             formulario se queda quieto y la luna se lo come; el panel
             de marca aguanta hasta los 365ms, que es cuando la tarjeta
             ya está totalmente cubierta.
  snap     → 500ms: tarjeta 100% cubierta. Se cambian los textos y se
             coloca todo corrido hacia su lado de entrada, invisible y
             SIN transición. Ocurre entero dentro de la ventana de
             cobertura (360ms – 555ms).
  entering → 790ms: la media luna ya casi termina. Recién ahí entra el
             contenido con el desliz suave.

  IMPORTANTE: la media luna se mueve con `sweepMode`, que cambia YA en
  el mismo click (no espera a `mode`). Antes la luna usaba `isSignUp`
  (derivado de `mode`), y `mode` solo cambiaba a los 500ms dentro del
  setTimeout — así que la luna casi no se había movido cuando el
  contenido ya se ocultaba en "snap", y por eso se veía desaparecer
  sin estar cubierto. Con `sweepMode` la luna arranca a barrer desde
  el click (t=0ms) y tarda sus 900ms completos, cubriendo de verdad
  la ventana en la que el contenido se oculta y vuelve a aparecer.
*/
type Phase = "idle" | "sweeping" | "snap" | "entering";

const SWEEP_MS = 900; // recorrido completo de la media luna
const BRAND_OUT_DELAY = 365; // el panel de marca aguanta hasta estar cubierto
const BRAND_OUT_MS = 120;
const SNAP_AT = 500; // dentro de la ventana de cobertura total
const REVEAL_AT = 790; // la luna ya casi llegó → entra el contenido
const ENTER_MS = 540; // desliz suave de entrada


const normalizarTexto = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");


const LoginPage: React.FC<LoginPageProps> = ({
  logoSrc = MARCA.logoLogin,
  initialMode = "signin",
  onBack,
}) => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  // Rol elegido. Se comparte entre iniciar sesión y registrarse.
  const [rol, setRol] = useState<RolPublico>("dueno");
  const [mode, setMode] = useState<Mode>(initialMode);
  // Controla SOLO hacia dónde barre la media luna. Cambia en el instante
  // del click, independiente de `mode` (que cambia recién en "snap").
  const [sweepMode, setSweepMode] = useState<Mode>(initialMode);
  const [phase, setPhase] = useState<Phase>("idle");
  const isSignUp = mode === "signup";
  const isSweepSignUp = sweepMode === "signup";
  const busy = phase !== "idle";

  // ─── Estado del login ───
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Estado del registro ───
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirmation, setRegPasswordConfirmation] = useState("");
  const [regTelefono, setRegTelefono] = useState("");
  const [regFotoPerfil, setRegFotoPerfil] = useState("");
  const [regZonaId, setRegZonaId] = useState("");
  const [regDescripcion, setRegDescripcion] = useState("");
  const [regTarifa, setRegTarifa] = useState("");
  const [regDisponible, setRegDisponible] = useState(false);
  const [regNombreNegocio, setRegNombreNegocio] = useState("");
  const [regTipoNegocio, setRegTipoNegocio] = useState<"veterinaria" | "tienda" | "refugio">("veterinaria");
  const [regDireccion, setRegDireccion] = useState("");
  const [regLatitud, setRegLatitud] = useState("");
  const [regLongitud, setRegLongitud] = useState("");
  const [regHorario, setRegHorario] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [zonas, setZonas] = useState<Zona[]>([]);
const [zonasLoading, setZonasLoading] = useState(true);
const [regZonaBusqueda, setRegZonaBusqueda] = useState("");
const [zonaDropdownOpen, setZonaDropdownOpen] = useState(false);

const zonaSelectorRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    getZonas()
      .then(setZonas)
      .catch(() => {
        setError("No se pudo cargar el catálogo de zonas");
        setShowError(true);
      })
      .finally(() => setZonasLoading(false));
  }, []);


  const zonasFiltradas = useMemo(() => {
  const termino = normalizarTexto(regZonaBusqueda);

  /*
   * Si el campo está vacío mostramos todas.
   */
  if (!termino) {
    return zonas;
  }

  return zonas.filter((zona) => {
    const contenido = normalizarTexto(
      `${zona.nombre} ${zona.canton} ${zona.provincia}`,
    );

    return contenido.includes(termino);
  });
}, [zonas, regZonaBusqueda]);



useEffect(() => {
  const cerrarSelectorZona = (event: MouseEvent) => {
    if (
      zonaSelectorRef.current &&
      !zonaSelectorRef.current.contains(event.target as Node)
    ) {
      setZonaDropdownOpen(false);
    }
  };

  document.addEventListener("mousedown", cerrarSelectorZona);

  return () => {
    document.removeEventListener("mousedown", cerrarSelectorZona);
  };
}, []);
  const toggleMode = () => {
    if (busy) return;
    const next: Mode = mode === "signin" ? "signup" : "signin";

    setSweepMode(next); // la luna arranca a moverse YA, en este mismo click
    setPhase("sweeping");

    setTimeout(() => {
      setMode(next);
      setError(null);
      setSuccess(null);
      setShowError(false);
      if (next === "signup") setRegistrationStep(1);
      setPhase("snap");
    }, SNAP_AT);

    setTimeout(() => setPhase("entering"), REVEAL_AT);
    setTimeout(() => setPhase("idle"), REVEAL_AT + ENTER_MS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Por favor, ingrese usuario y contraseña");
      setShowError(true);
      return;
    }

    setError(null);
    setShowError(false);
    setIsLoading(true);

    try {
      await login(username.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión");
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regUsername.trim() || !regEmail.trim() || !regPassword || !regPasswordConfirmation || !regTelefono.trim() || !regZonaId) {
      setError("Por favor, complete todos los campos obligatorios");
      setShowError(true);
      return;
    }

    if (rol === "paseador" && (!regDescripcion.trim() || Number(regTarifa) <= 0)) {
      setError("Completa la descripción y una tarifa válida");
      setShowError(true);
      return;
    }

    if (rol === "negocio" && (!regNombreNegocio.trim() || !regDireccion.trim() || !regHorario.trim())) {
      setError("Completa los datos del negocio");
      setShowError(true);
      return;
    }

    if (rol === "negocio" && (
      (regLatitud && (Number(regLatitud) < -90 || Number(regLatitud) > 90)) ||
      (regLongitud && (Number(regLongitud) < -180 || Number(regLongitud) > 180))
    )) {
      setError("Las coordenadas del negocio no son válidas");
      setShowError(true);
      return;
    }

    if (!isValidProfilePhotoUrl(regFotoPerfil.trim())) {
      setError("La foto debe ser una URL https, no una imagen Base64");
      setShowError(true);
      return;
    }

    if (regPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      setShowError(true);
      return;
    }

    if (regPassword !== regPasswordConfirmation) {
      setError("Las contraseñas no coinciden");
      setShowError(true);
      return;
    }

    setError(null);
    setSuccess(null);
    setShowError(false);
    setIsLoading(true);

    try {
      const sessionCreated = await register(
        regEmail.trim(),
        regPassword,
        {
          nombre: regUsername.trim(),
          telefono: regTelefono.trim(),
          foto_perfil: regFotoPerfil.trim() || undefined,
          zona_id: regZonaId,
          tipo_usuario: rol,
          roles: [rol],
          descripcion: rol === "paseador" ? regDescripcion.trim() : undefined,
          tarifa_base: rol === "paseador" ? Number(regTarifa) : undefined,
          disponible: rol === "paseador" ? regDisponible : undefined,
          nombre_negocio: regNombreNegocio.trim() || undefined,
          tipo_negocio: rol === "negocio" ? regTipoNegocio : undefined,
          direccion: rol === "negocio" ? regDireccion.trim() : undefined,
          latitud: rol === "negocio" && regLatitud ? Number(regLatitud) : undefined,
          longitud: rol === "negocio" && regLongitud ? Number(regLongitud) : undefined,
          horario: rol === "negocio" ? regHorario.trim() : undefined,
        }
      );
      if (sessionCreated) {
        navigate({ to: inicioDeRol[rol] });
      } else {
        setSuccess("Cuenta creada. Revisa tu correo para confirmarla.");
      }
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : "No se pudo crear la cuenta"
      );
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const nextRegistrationStep = () => {
    setError(null);
    setSuccess(null);
    setShowError(false);

    if (registrationStep === 2) {
      if (!regUsername.trim() || !regEmail.trim() || !regTelefono.trim()) {
        setError("Completa tu nombre, correo y teléfono");
        setShowError(true);
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(regEmail)) {
        setError("Ingresa un correo electrónico válido");
        setShowError(true);
        return;
      }
    }

    if (registrationStep === 3) {
      if (!regZonaId) {
        setError("Selecciona tu zona");
        setShowError(true);
        return;
      }
      if (!isValidProfilePhotoUrl(regFotoPerfil.trim())) {
        setError("La foto debe ser una URL https, no una imagen Base64");
        setShowError(true);
        return;
      }
      if (rol === "paseador" && (!regDescripcion.trim() || Number(regTarifa) <= 0)) {
        setError("Completa la descripción y una tarifa válida");
        setShowError(true);
        return;
      }
      if (rol === "negocio" && (!regNombreNegocio.trim() || !regDireccion.trim() || !regHorario.trim())) {
        setError("Completa el nombre, dirección y horario del negocio");
        setShowError(true);
        return;
      }
      if (rol === "negocio" && (
        (regLatitud && (Number(regLatitud) < -90 || Number(regLatitud) > 90)) ||
        (regLongitud && (Number(regLongitud) < -180 || Number(regLongitud) > 180))
      )) {
        setError("Las coordenadas del negocio no son válidas");
        setShowError(true);
        return;
      }
    }

    setRegistrationStep((step) => Math.min(step + 1, 4));
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`Social login with: ${provider}`);
  };

  /*
    ─── DIRECCIÓN DE ENTRADA/SALIDA ────────────────────────────────────
    Cada panel entra desde el lado que da hacia el CENTRO de la tarjeta,
    y no siempre desde la izquierda. Si el panel queda del lado derecho,
    entra desde la izquierda (más cerca del centro). Si queda del lado
    izquierdo, entra desde la derecha (también más cerca del centro).
    Antes ambos paneles usaban el mismo offset negativo fijo, así que el
    panel izquierdo entraba "desde afuera" en vez de desde el centro.
  */
  const ENTER_OFFSET_PX = 72;
  const sideOffset = (side: "left" | "right") =>
    side === "right" ? `-${ENTER_OFFSET_PX}px` : `${ENTER_OFFSET_PX}px`;

  const brandSide: "left" | "right" = isSignUp ? "right" : "left";
  const formSide: "left" | "right" = isSignUp ? "left" : "right";
  const brandOffset = sideOffset(brandSide);
  const formOffset = sideOffset(formSide);

  const ENTER_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

  /* FORMULARIO: nunca se desvanece al salir. Se queda quieto y la media
     luna lo tapa. Solo se mueve para ENTRAR, desde su lado correcto. */
  const formStyle: React.CSSProperties =
    phase === "snap"
      ? { transform: `translateX(${formOffset})`, opacity: 0, transition: "none" }
      : phase === "entering"
      ? {
          transform: "translateX(0)",
          opacity: 1,
          transition: `opacity ${ENTER_MS}ms ease-out, transform ${ENTER_MS}ms ${ENTER_EASE}`,
        }
      : { transform: "translateX(0)", opacity: 1, transition: "none" };

  /* PANEL DE MARCA: va encima de la media luna, nadie lo puede tapar.
     Por eso sale solo, y recién cuando ya está todo cubierto. */
  const brandStyle: React.CSSProperties =
    phase === "sweeping"
      ? {
          transform: `translateX(${brandOffset})`,
          opacity: 0,
          transition: `opacity ${BRAND_OUT_MS}ms ease-out ${BRAND_OUT_DELAY}ms, transform ${BRAND_OUT_MS}ms ease-out ${BRAND_OUT_DELAY}ms`,
        }
      : phase === "snap"
      ? { transform: `translateX(${brandOffset})`, opacity: 0, transition: "none" }
      : phase === "entering"
      ? {
          transform: "translateX(0)",
          opacity: 1,
          transition: `opacity ${ENTER_MS}ms ease-out, transform ${ENTER_MS}ms ${ENTER_EASE}`,
        }
      : { transform: "translateX(0)", opacity: 1, transition: "none" };

  // ─── Clases reutilizables ───
  const inputBase =
    "w-full rounded-full border border-transparent bg-slate-100 py-4 pl-14 pr-5 text-sm text-[#1E2A33] placeholder:text-slate-400 transition-all duration-200 focus:border-[#14A3B8]/40 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#14A3B8]/25";
  const iconBase =
    "pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#14A3B8]";
  const primaryBtn =
    "flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-[#14A3B8] px-10 py-4 text-xs font-semibold tracking-[0.12em] text-white shadow-[0_10px_25px_rgba(20,163,184,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0E8DA1] hover:shadow-[0_14px_30px_rgba(14,141,161,0.5)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";

  /* Selector de rol. Mismo lenguaje redondeado del resto de la tarjeta:
     píldora doble, el activo en turquesa. Se muestra en los dos modos
     porque tanto al entrar como al registrarse hay que decir de qué lado
     de la plataforma se está. */
  const roleSelector = (
    <fieldset className="mb-5">
      <legend className="mb-2 w-full text-center text-xs tracking-wide text-slate-500">
        Elige el tipo de cuenta
      </legend>
      <div className="flex gap-3">
        {ROLES.map((r) => {
          const active = rol === r.id;
          return (
            <label
              key={r.id}
              className={`flex flex-1 cursor-pointer items-center gap-2.5 rounded-full px-4 py-3 transition-all duration-300 ${
                active
                  ? "bg-[#14A3B8] text-white shadow-[0_8px_20px_rgba(20,163,184,0.35)]"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200/70"
              }`}
            >
              <input
                type="radio"
                name="rol"
                value={r.id}
                checked={active}
                onChange={() => setRol(r.id)}
                className="sr-only"
              />
              <r.Icon size={17} className="flex-shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold">{r.titulo}</span>
                <span
                  className={`block truncate text-[10.5px] ${
                    active ? "text-white/75" : "text-slate-400"
                  }`}
                >
                  {r.descripcion}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );

  const socialButtons = (
    <div className="mt-4 flex justify-center gap-4">
      {/* Google */}
      <button
        type="button"
        onClick={() => handleSocialLogin("Google")}
        aria-label="Continuar con Google"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#14A3B8]/40 hover:shadow-md"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 2.43-4.53 6.16-4.53z"
          />
        </svg>
      </button>

      {/* Apple */}
      <button
        type="button"
        onClick={() => handleSocialLogin("Apple")}
        aria-label="Continuar con Apple"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1E2A33] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#14A3B8]/40 hover:shadow-md"
      >
        <svg className="h-5 w-5" viewBox="0 0 384 512" fill="currentColor">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
        </svg>
      </button>

      {/* Meta */}
      <button
        type="button"
        onClick={() => handleSocialLogin("Meta")}
        aria-label="Continuar con Meta"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#14A3B8]/40 hover:shadow-md"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
        </svg>
      </button>
    </div>
  );

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, #4C8CB0 0%, #2E6584 55%, #163C52 100%)",
      }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="absolute top-5 left-5 z-50 inline-flex items-center gap-1 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
        >
          <ChevronLeft size={17} />
          Volver
        </button>
      )}
      {/* Tarjeta principal */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,32,44,0.4)]">
        {/* ─── CAPA z-20: media luna (solo escritorio) ─── */}
        <div className="pointer-events-none absolute inset-0 z-20 hidden overflow-hidden md:block">
          <div
            className="h-full w-[220%]"
            style={{
              /*
                La franja mide 220% del ancho de la tarjeta (antes 150%).
                Más ancha = la ventana en la que cubre TODO dura mucho más
                (antes eran 76ms, ahora ~195ms), y ahí adentro entra
                cómodo el cambio de contenido.

                Se mueve según `sweepMode` (cambia en el click), no según
                `mode` (que cambia recién a los 500ms). Así arranca a
                barrer de inmediato en vez de quedarse quieta mientras el
                contenido ya se ocultó.
              */
              transform: isSweepSignUp
                ? "translateX(19.091%)"
                : "translateX(-73.636%)",
              transition: `transform ${SWEEP_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
            }}
          >
            <svg
              viewBox="0 0 220 100"
              preserveAspectRatio="none"
              className="h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="petfinder-sweep" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2F71A8" />
                <stop offset="100%" stopColor="#123C52" />
                </linearGradient>
              </defs>
              {/* Curva aprobada — misma forma, solo corrida hacia afuera */}
              <path
                d="M0,0
                   L220,0
                   C220,45 207,86 198,100
                   L22,100
                   C13,86 0,45 0,0
                   Z"
                fill="url(#petfinder-sweep)"
              />
            </svg>
          </div>
        </div>

        <div className={`relative flex flex-col md:block ${isSignUp ? "md:min-h-[720px]" : "md:min-h-[640px]"}`}>
          {/* ─── CAPA z-30: panel de marca (montado sobre la media luna) ─── */}
          <div
            className={`relative z-30 bg-gradient-to-br from-[#1D4E6C] to-[#0E2733] px-8 py-12 md:absolute md:top-0 md:h-full md:w-1/2 md:bg-none md:px-12 md:py-0 ${
              isSignUp ? "md:left-1/2" : "md:left-0"
            }`}
          >
            <div
              /* El padding va del lado de la CURVA, para separar el texto
                 de ella. Antes estaba al revés y por eso se tocaban. */
              className={`flex h-full flex-col items-center justify-center gap-5 text-center ${
                isSignUp ? "md:pl-12" : "md:pr-12"
              }`}
              style={brandStyle}
            >
              {/* ▼▼▼ LOGO ▼▼▼ Lockup con contorno blanco: el borde lo despega
                  del azul oscuro del panel. */}
              <img
                src={logoSrc}
                alt={MARCA.completo}
                className="mb-1 h-32 w-auto object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] md:h-40"
              />
              {/* ▲▲▲ FIN DEL LOGO ▲▲▲ */}

              <h2 className="text-2xl font-bold text-white">
                {isSignUp ? "¿Ya tienes cuenta?" : "¿Nuevo por aquí?"}
              </h2>
              <p className="max-w-[17rem] text-sm leading-relaxed text-white/75">
                {isSignUp
                  ? `Inicia sesión para seguir cuidando a tu mascota con ${MARCA.completo}.`
                  : "Únete a la comunidad y encuentra paseadores de confianza, veterinarias cercanas y mascotas perdidas cerca de ti."}
              </p>
              <button
                type="button"
                onClick={toggleMode}
                disabled={busy}
                className="mt-2 rounded-full border-2 border-white/80 px-9 py-2.5 text-xs font-semibold tracking-[0.12em] text-white transition-all duration-300 hover:border-white hover:bg-white hover:text-[#16242F] disabled:pointer-events-none"
              >
                {isSignUp ? "INICIAR SESIÓN" : "REGISTRARSE"}
              </button>
            </div>
          </div>

          {/* ─── CAPA z-10: formulario (lo tapa la media luna) ─── */}
          <div
            className={`relative z-10 px-8 py-12 md:absolute md:top-0 md:h-full md:w-1/2 md:px-12 md:py-0 ${
              isSignUp ? "md:left-0" : "md:left-1/2"
            }`}
          >
            <div
              /* Igual que arriba: el padding extra va del lado de la curva */
              className={`flex h-full flex-col justify-center ${
                isSignUp ? "md:pr-10" : "md:pl-10"
              }`}
              style={formStyle}
            >
              <h1 className={`${isSignUp ? "mb-4 text-3xl" : "mb-8 text-4xl"} text-center font-bold text-[#1E2A33]`}>
                {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
              </h1>

              {isSignUp ? (
                /* ─── Formulario de registro ─── */
                <form onSubmit={handleRegister} className="space-y-4">
                  <div aria-label={`Paso ${registrationStep} de 4`} className="mb-5">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-semibold tracking-wide text-slate-500">
                      <span>Paso {registrationStep} de 4</span>
                      <span>{["Tipo de cuenta", "Datos personales", "Perfil", "Acceso"][registrationStep - 1]}</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((step) => (
                        <span key={step} className={`h-1.5 flex-1 rounded-full ${step <= registrationStep ? "bg-[#14A3B8]" : "bg-slate-200"}`} />
                      ))}
                    </div>
                  </div>

                  {registrationStep === 1 && (
                    <div>
                      {roleSelector}
                      <p className="rounded-2xl bg-slate-50 px-5 py-4 text-center text-xs leading-relaxed text-slate-500">
                        Los datos del siguiente paso se adaptarán al tipo de cuenta que elijas.
                      </p>
                    </div>
                  )}

                  {registrationStep === 2 && (
                    <div className="space-y-4">
                      <div className="relative">
                        <User className={iconBase} size={18} />
                        <input type="text" autoComplete="name" placeholder="Nombre completo *" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className={inputBase} maxLength={150} required />
                      </div>
                      <div className="relative">
                        <Mail className={iconBase} size={18} />
                        <input type="email" autoComplete="email" placeholder="Correo electrónico *" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputBase} required />
                      </div>
                      <div className="relative">
                        <User className={iconBase} size={18} />
                        <input type="tel" autoComplete="tel" placeholder="Teléfono *" value={regTelefono} onChange={(e) => setRegTelefono(e.target.value)} className={inputBase} maxLength={20} required />
                      </div>
                    </div>
                  )}

                  {registrationStep === 3 && (
                    <div className="space-y-4">
                      <div
  ref={zonaSelectorRef}
  className="relative"
>
  <MapPin
    className={iconBase}
    size={18}
  />

  <input
    type="text"
    value={regZonaBusqueda}
    disabled={zonasLoading}
    placeholder={
      zonasLoading
        ? "Cargando zonas..."
        : "Busca y selecciona tu zona *"
    }
    autoComplete="off"
    className={`${inputBase} pr-12`}
    onFocus={() => {
      if (!zonasLoading) {
        setZonaDropdownOpen(true);
      }
    }}
    onChange={(e) => {
      /*
       * Cuando el usuario vuelve a escribir,
       * eliminamos la selección anterior.
       *
       * Así evitamos enviar un id_zona que ya
       * no corresponde al texto visible.
       */
      setRegZonaBusqueda(e.target.value);
      setRegZonaId("");
      setZonaDropdownOpen(true);
    }}
    aria-label="Buscar zona"
    aria-expanded={zonaDropdownOpen}
    aria-autocomplete="list"
    role="combobox"
  />

  {/* Lista desplegable */}
  {zonaDropdownOpen && !zonasLoading && (
    <div
      role="listbox"
      className="
        absolute
        left-0
        right-0
        top-[calc(100%+8px)]
        z-50
        max-h-64
        overflow-y-auto
        rounded-2xl
        border
        border-slate-200
        bg-white
        py-2
        shadow-[0_18px_45px_rgba(15,32,44,0.18)]
      "
    >
      {zonasFiltradas.length > 0 ? (
        zonasFiltradas.map((zona) => {
          const seleccionada =
            regZonaId === zona.id_zona;

          return (
            <button
              key={zona.id_zona}
              type="button"
              role="option"
              aria-selected={seleccionada}
              onMouseDown={(e) => {
                /*
                 * Evita que el input pierda el foco
                 * antes de procesar la selección.
                 */
                e.preventDefault();
              }}
              onClick={() => {
                setRegZonaId(zona.id_zona);

                setRegZonaBusqueda(
                  `${zona.nombre}, ${zona.canton} · ${zona.provincia}`,
                );

                setZonaDropdownOpen(false);

                /*
                 * Limpiamos un posible error anterior
                 * relacionado con no seleccionar zona.
                 */
                setError(null);
                setShowError(false);
              }}
              className={`
                flex
                w-full
                items-start
                gap-3
                px-5
                py-3
                text-left
                transition-colors
                ${
                  seleccionada
                    ? "bg-[#14A3B8]/10"
                    : "hover:bg-slate-50"
                }
              `}
            >
              <MapPin
                size={16}
                className="mt-0.5 flex-shrink-0 text-[#14A3B8]"
              />

              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#1E2A33]">
                  {zona.nombre}
                </span>

                <span className="mt-0.5 block text-xs text-slate-500">
                  {zona.canton} · {zona.provincia}
                </span>
              </span>
            </button>
          );
        })
      ) : (
        <div className="px-5 py-5 text-center">
          <MapPin
            size={22}
            className="mx-auto mb-2 text-slate-300"
          />

          <p className="text-sm font-medium text-slate-500">
            No encontramos esa zona
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Intenta buscar por zona, cantón o provincia.
          </p>
        </div>
      )}
    </div>
  )}

  {/* Indicador de selección correcta */}
  {regZonaId && (
    <p className="mt-2 pl-5 text-[11px] font-medium text-[#14A3B8]">
      Zona seleccionada
    </p>
  )}
</div>
                      <div className="relative">
                        <Image className={iconBase} size={18} />
                        <input type="url" placeholder="URL https de foto (opcional, no Base64)" value={regFotoPerfil} onChange={(e) => setRegFotoPerfil(e.target.value)} className={inputBase} maxLength={2048} />
                      </div>

                      {rol === "paseador" && (
                        <>
                          <div className="relative">
                            <FileText className="pointer-events-none absolute left-5 top-5 text-[#14A3B8]" size={18} />
                            <textarea rows={3} placeholder="Cuéntanos sobre tu experiencia *" value={regDescripcion} onChange={(e) => setRegDescripcion(e.target.value)} className={`${inputBase} resize-none rounded-2xl`} maxLength={800} required />
                          </div>
                          <div className="relative">
                            <Banknote className={iconBase} size={18} />
                            <input type="number" min="0" step="100" placeholder="Tarifa base en colones *" value={regTarifa} onChange={(e) => setRegTarifa(e.target.value)} className={inputBase} required />
                          </div>
                          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-100 px-5 py-3 text-sm text-slate-600">
                            <input type="checkbox" checked={regDisponible} onChange={(e) => setRegDisponible(e.target.checked)} className="h-4 w-4 accent-[#14A3B8]" />
                            Disponible para recibir solicitudes
                          </label>
                        </>
                      )}

                      {rol === "negocio" && (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="relative"><Store className={iconBase} size={18} /><input type="text" placeholder="Nombre del negocio *" value={regNombreNegocio} onChange={(e) => setRegNombreNegocio(e.target.value)} className={inputBase} maxLength={150} required /></div>
                            <select value={regTipoNegocio} onChange={(e) => setRegTipoNegocio(e.target.value as typeof regTipoNegocio)} className={`${inputBase} pl-5`} aria-label="Tipo de negocio"><option value="veterinaria">Veterinaria</option><option value="tienda">Tienda</option><option value="refugio">Refugio</option></select>
                          </div>
                          <div className="relative"><MapPin className={iconBase} size={18} /><input type="text" placeholder="Dirección exacta *" value={regDireccion} onChange={(e) => setRegDireccion(e.target.value)} className={inputBase} required /></div>
                          <div className="relative"><Clock className={iconBase} size={18} /><input type="text" placeholder="Horario de atención *" value={regHorario} onChange={(e) => setRegHorario(e.target.value)} className={inputBase} required /></div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input type="number" min="-90" max="90" step="any" placeholder="Latitud (opcional)" value={regLatitud} onChange={(e) => setRegLatitud(e.target.value)} className={`${inputBase} px-5`} />
                            <input type="number" min="-180" max="180" step="any" placeholder="Longitud (opcional)" value={regLongitud} onChange={(e) => setRegLongitud(e.target.value)} className={`${inputBase} px-5`} />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {registrationStep === 4 && (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-slate-50 px-5 py-4 text-xs leading-relaxed text-slate-600">
                        <strong className="block text-sm text-[#1E2A33]">{regUsername}</strong>
                        {regEmail} · {ROLES.find((item) => item.id === rol)?.titulo}
                      </div>
                      <div className="relative">
                        <Lock className={iconBase} size={18} />
                        <input type={showRegPassword ? "text" : "password"} autoComplete="new-password" placeholder="Contraseña (mínimo 8 caracteres) *" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={`${inputBase} pr-14`} minLength={8} required />
                        <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 hover:text-[#14A3B8]" aria-label={showRegPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                      </div>
                      <div className="relative">
                        <Lock className={iconBase} size={18} />
                        <input type={showRegPassword ? "text" : "password"} autoComplete="new-password" placeholder="Confirmar contraseña *" value={regPasswordConfirmation} onChange={(e) => setRegPasswordConfirmation(e.target.value)} className={inputBase} minLength={8} required />
                      </div>
                    </div>
                  )}

                  {error && showError && (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                      <AlertCircle size={16} className="flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">{success}</div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    {registrationStep > 1 ? (
                      <button type="button" onClick={() => { setRegistrationStep((step) => step - 1); setError(null); setShowError(false); }} className="inline-flex items-center gap-1 px-3 py-3 text-xs font-semibold text-slate-500 hover:text-[#14A3B8]"><ChevronLeft size={16} /> Atrás</button>
                    ) : <span />}
                    {registrationStep < 4 ? (
                      <button type="button" onClick={nextRegistrationStep} className={primaryBtn}>SIGUIENTE <ChevronRight size={16} /></button>
                    ) : (
                      <button type="submit" disabled={isLoading || Boolean(success)} className={primaryBtn}>{isLoading ? "CREANDO..." : "CREAR CUENTA"}</button>
                    )}
                  </div>
                </form>
              ) : (
                /* ─── Formulario de login ─── */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <User className={iconBase} size={18} />
                    <input
                      id="username"
                      type="text"
                      placeholder="Usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={inputBase}
                      required
                    />
                  </div>

                  <div className="relative">
                    <Lock className={iconBase} size={18} />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputBase} pr-14`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 hover:text-[#14A3B8]"
                      aria-label={
                        showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div className="pr-2 text-right">
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate({ to: "/recuperar-contrasena" });
                      }}
                      className="text-xs text-slate-500 transition-colors hover:text-[#14A3B8]"
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>

                  {error && showError && (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                      <AlertCircle size={16} className="flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex justify-center pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={primaryBtn}
                    >
                      {isLoading ? (
                        <>
                          <Loader className="animate-spin" size={16} />
                          <span>INGRESANDO...</span>
                        </>
                      ) : (
                        "INICIAR SESIÓN"
                      )}
                    </button>
                  </div>
                </form>
              )}

              {!isSignUp && (
                <>
                  <p className="mt-8 text-center text-sm text-slate-500">O inicia sesión con</p>
                  {socialButtons}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
