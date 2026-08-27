import { useEffect, useState } from "react";
import {
  ArrowRight,
  Footprints,
  Menu,
  PawPrint,
  Siren,
  Store,
  X,
} from "lucide-react";
import { MARCA } from "../lib/nav";

/* ─────────────────────────────────────────────────────────────
   Portada pública. Lo primero que ve alguien sin sesión.

   A propósito NO sigue el sistema plano de la aplicación: adentro
   mandan las tablas y la sobriedad, aquí manda la marca. Bloques
   de color, esquinas muy redondeadas, tarjetas que flotan y una
   mascota como protagonista. El login, que también rompe la regla
   con su tarjeta redondeada, ya marcaba este camino.

   Paleta: el turquesa del logo como base, más un coral y un
   amarillo cálidos que solo viven en esta pantalla.
   ───────────────────────────────────────────────────────────── */

const CORAL = "#FF7A59";
const AMARILLO = "#FFC24B";
const CREMA = "#FFF8F0";
/* Turquesa aclarado: el del logo no llega a 4.5:1 sobre el azul
   profundo del menú. */
const TURQUESA_CLARO = "#5FCADA";

interface LandingProps {
  /** Abre el login. `registro` arranca la tarjeta en "Crear cuenta". */
  onEntrar: (modo?: "login" | "registro") => void;
}

const ENLACES = [
  { href: "#servicios", label: "Servicios" },
  { href: "#pasos", label: "Cómo funciona" },
];

const MODULOS = [
  {
    Icon: Footprints,
    titulo: "Paseos con quien sí conocés",
    texto:
      "Paseadores verificados, con calificación y zona visible. Agendás, seguís el paseo y pagás desde la misma pantalla.",
    fondo: "#DDF0F3",
    circulo: "#14A3B8",
  },
  {
    Icon: Store,
    titulo: "Veterinarias y tiendas cerca",
    texto:
      "Directorio de comercios aliados con horario, teléfono y reseñas. Se acabó buscar en tres grupos de Facebook distintos.",
    fondo: "#FFEEDC",
    circulo: CORAL,
  },
  {
    Icon: Siren,
    titulo: "Una comunidad que busca",
    texto:
      "Cuando una mascota se pierde, el reporte le llega a la gente de la zona. Los avistamientos vuelven al dueño en minutos.",
    fondo: "#FFF3D6",
    circulo: "#E0A21B",
  },
];

const PASOS = [
  {
    n: 1,
    titulo: "Registrá a tu mascota",
    texto: "Nombre, raza, foto y carné de vacunas. Queda lista para cualquier paseo.",
    color: "#14A3B8",
  },
  {
    n: 2,
    titulo: "Elegí paseador por zona",
    texto: "Filtrás por cantón, disponibilidad y calificación. Ves el precio antes de pedir.",
    color: CORAL,
  },
  {
    n: 3,
    titulo: "Seguí el paseo y pagá",
    texto: "Bitácora del recorrido, cobro al terminar y una reseña que ayuda al siguiente.",
    color: "#E0A21B",
  },
];

const Landing = ({ onEntrar }: LandingProps) => {
  const [menu, setMenu] = useState(false);

  /* Con el menú abierto la página de atrás no debe correrse, y Escape
     tiene que cerrarlo igual que la X. */
  useEffect(() => {
    if (!menu) return;

    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", alTeclear);

    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [menu]);

  const irA = (href: string) => {
    setMenu(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen text-ink" style={{ background: CREMA }}>
      {/* ── Barra ─────────────────────────────────────────── */}
      <header className="relative z-40">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent">
              <img src={MARCA.logoSimbolo} alt="" className="h-6 w-6 object-contain" />
            </span>
            <span className="text-[17px] font-bold tracking-tight">
              {MARCA.nombre}
              <span className="text-accent">{MARCA.acento}</span>
            </span>
          </div>

          {/* Los enlaces viven dentro de una píldora: separa la navegación
              de las acciones sin una barra de fondo a todo lo ancho. */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full bg-white p-1.5 shadow-[0_2px_10px_rgba(20,36,46,0.06)] md:flex">
            {ENLACES.map((e) => (
              <a
                key={e.href}
                href={e.href}
                className="rounded-full px-4 py-2 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-accent-wash hover:text-accent-dark"
              >
                {e.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              onClick={() => onEntrar("login")}
              className="rounded-full px-4 py-2.5 text-[13.5px] font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => onEntrar("registro")}
              className="rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5"
            >
              Crear cuenta
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-label="Abrir menú"
            className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-ink shadow-[0_2px_10px_rgba(20,36,46,0.08)] transition-colors hover:bg-accent-wash md:hidden"
          >
            <Menu size={20} strokeWidth={2.1} />
          </button>
        </div>
      </header>

      {/* ── Menú móvil ────────────────────────────────────── */}
      {menu && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-accent-deep md:hidden">
          {/* Huella de agua: la marca ocupa el fondo del menú en vez de
              dejarlo vacío. */}
          <PawPrint
            size={340}
            strokeWidth={0.9}
            aria-hidden
            className="absolute -bottom-16 -right-16 -rotate-12 text-white/[0.07]"
          />

          <div className="relative flex h-full flex-col px-6 pb-8 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-bold tracking-tight text-white">
                {MARCA.nombre}
                <span style={{ color: TURQUESA_CLARO }}>{MARCA.acento}</span>
              </span>
              <button
                type="button"
                onClick={() => setMenu(false)}
                aria-label="Cerrar menú"
                className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X size={22} strokeWidth={2.2} />
              </button>
            </div>

            {/* Enlaces a escala de titular: en un menú de dos entradas,
                el tamaño es la jerarquía. */}
            <nav className="mt-14 grid gap-2">
              {ENLACES.map((e, i) => (
                <button
                  key={e.href}
                  type="button"
                  onClick={() => irA(e.href)}
                  style={{ animationDelay: `${60 + i * 70}ms` }}
                  className="anim-menu-in group flex items-baseline gap-4 py-3 text-left"
                >
                  <span className="nums text-[13px] font-bold" style={{ color: TURQUESA_CLARO }}>
                    0{i + 1}
                  </span>
                  <span className="text-[34px] font-extrabold leading-none tracking-[-0.035em] text-white transition-transform duration-200 group-active:translate-x-1">
                    {e.label}
                  </span>
                </button>
              ))}
            </nav>

            <div className="mt-auto grid gap-2.5 pt-10">
              <button
                type="button"
                onClick={() => {
                  setMenu(false);
                  onEntrar("registro");
                }}
                className="rounded-full bg-accent px-5 py-4 text-[15px] font-bold text-white"
              >
                Crear cuenta gratis
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenu(false);
                  onEntrar("login");
                }}
                className="rounded-full border-2 border-white/25 px-5 py-4 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
              >
                Ya tengo cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* La ruta del paseo. Es el motivo de la marca: dos paradas
            reales de un servicio, no una decoración. Se dibuja sola al
            cargar y es el único momento de movimiento de la portada. */}
        <svg
          viewBox="0 0 900 520"
          fill="none"
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M40,470 C210,470 250,330 400,300 C560,268 590,150 760,120"
            stroke="#14A3B8"
            strokeOpacity="0.35"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="2 14"
            className="anim-trazo"
          />
          <circle cx="400" cy="300" r="6" fill="#14A3B8" fillOpacity="0.45" />
          <circle cx="760" cy="120" r="6" fill="#14A3B8" fillOpacity="0.45" />
        </svg>

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-6 lg:pb-28 lg:pt-10">
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
            {/* Texto */}
            <div className="anim-pop lg:col-span-7">
              <h1 className="text-[clamp(3rem,7.5vw,5.25rem)] font-extrabold leading-[0.92] tracking-[-0.038em]">
                Pasear es{" "}
                <span className="relative inline-block">
                  tuanis
                  {/* Trazo a mano: el gesto de marca, dibujado, no un
                      subrayado de caja. */}
                  <svg
                    viewBox="0 0 200 18"
                    preserveAspectRatio="none"
                    aria-hidden
                    className="absolute -bottom-1 left-0 h-[0.16em] w-full"
                  >
                    <path
                      d="M3,13 C48,4 105,3 197,9"
                      fill="none"
                      stroke={AMARILLO}
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <br />
                cuando es de confianza.
              </h1>

              <p className="mt-8 max-w-[46ch] text-[16px] leading-relaxed text-ink-soft">
                Paseadores verificados, veterinarias cerca y una comunidad que se
                activa cuando una mascota se pierde. Todo en la misma app.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEntrar("registro")}
                  className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-7 py-4 text-[14.5px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(20,36,46,0.55)] transition-transform duration-200 hover:-translate-y-1"
                >
                  Crear cuenta gratis
                  <ArrowRight
                    size={17}
                    strokeWidth={2.4}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onEntrar("login")}
                  className="rounded-full border-2 border-ink/12 px-7 py-4 text-[14.5px] font-bold text-ink transition-colors hover:border-ink/25 hover:bg-white"
                >
                  Ya tengo cuenta
                </button>
              </div>

              <div className="mt-12 flex items-center gap-3.5">
                <div className="flex -space-x-3">
                  {["walker-1", "walker-2", "walker-3"].map((w) => (
                    <img
                      key={w}
                      src={`/mock/${w}.jpg`}
                      alt=""
                      className="h-11 w-11 rounded-full border-[3px] object-cover"
                      style={{ borderColor: CREMA }}
                    />
                  ))}
                </div>
                <p className="text-[13.5px] font-medium leading-tight text-ink-soft">
                  Paseadores verificados
                  <br />
                  en el Gran Área Metropolitana
                </p>
              </div>
            </div>

            {/* Retrato en arco. La profundidad la dan dos planos de color
                sólido desfasados, no una sombra difusa. */}
            <div
              className="anim-pop lg:col-span-5"
              style={{ animationDelay: "140ms" }}
            >
              <div className="relative mx-auto w-full max-w-[380px]">
                <div
                  aria-hidden
                  className="absolute -left-4 top-6 h-full w-full rounded-t-full rounded-b-[44px]"
                  style={{ background: AMARILLO }}
                />
                <div
                  aria-hidden
                  className="absolute -left-2 top-3 h-full w-full rounded-t-full rounded-b-[44px] bg-accent"
                />
                <img
                  src="/mock/dog-nala.jpg"
                  alt="Nala, golden retriever, lista para su paseo"
                  className="relative aspect-[4/5] w-full rounded-t-full rounded-b-[44px] object-cover"
                />

                {/* Sello de verificación sobre el borde del arco. */}
                <span
                  className="absolute -right-3 top-8 grid h-16 w-16 -rotate-12 place-items-center rounded-full text-white shadow-[0_8px_20px_-6px_rgba(20,36,46,0.45)]"
                  style={{ background: CORAL }}
                >
                  <PawPrint size={26} strokeWidth={2.1} aria-hidden />
                </span>

                {/* Una sola tarjeta: el paseo real que la ruta punteada
                    venía a buscar. */}
                <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-3xl bg-white px-4 py-3.5 shadow-[0_14px_30px_-12px_rgba(20,36,46,0.45)] sm:-left-10">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                    style={{ background: "#DDEFE9" }}
                  >
                    <Footprints size={19} strokeWidth={2.1} className="text-ok" />
                  </span>
                  <div>
                    <p className="text-[13.5px] font-bold leading-tight">
                      Paseo confirmado
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-soft">
                      Nala · hoy 4:00 pm · Curridabat
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── Servicios ─────────────────────────────────────── */}
      <section id="servicios" className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-accent-dark">
            Qué resuelve
          </span>
          <h2 className="mt-4 text-[clamp(1.9rem,4vw,2.8rem)] font-extrabold leading-[1.08] tracking-[-0.03em]">
            Tres cosas que hoy hacés en tres lugares distintos.
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {MODULOS.map(({ Icon, titulo, texto, fondo, circulo }) => (
            <article
              key={titulo}
              className="rounded-[32px] p-8 transition-transform duration-300 hover:-translate-y-1.5"
              style={{ background: fondo }}
            >
              <span
                className="grid h-14 w-14 place-items-center rounded-2xl"
                style={{ background: circulo }}
              >
                <Icon size={24} strokeWidth={2} className="text-white" aria-hidden />
              </span>
              <h3 className="mt-6 text-[19px] font-extrabold leading-tight tracking-tight">
                {titulo}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{texto}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Pasos ─────────────────────────────────────────── */}
      <section id="pasos" className="px-5 pb-16 sm:px-6 lg:pb-24">
        <div className="mx-auto max-w-6xl rounded-[40px] bg-white px-6 py-14 sm:px-12 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-accent-dark">
              Cómo funciona
            </span>
            <h2 className="mt-4 text-[clamp(1.8rem,3.6vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.03em]">
              Tres pasos y tu perro ya anda paseando.
            </h2>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
            {PASOS.map(({ n, titulo, texto, color }) => (
              <div key={n} className="text-center">
                <span
                  className="nums mx-auto grid h-16 w-16 place-items-center rounded-full text-[22px] font-extrabold text-white"
                  style={{ background: color }}
                >
                  {n}
                </span>
                <h3 className="mt-6 text-[17px] font-extrabold tracking-tight">{titulo}</h3>
                <p className="mx-auto mt-2.5 max-w-xs text-[14px] leading-relaxed text-ink-soft">
                  {texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cierre ────────────────────────────────────────── */}
      <section className="px-5 pb-16 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] bg-accent-deep px-6 py-16 text-center sm:px-12">
          <PawPrint
            size={200}
            strokeWidth={1}
            aria-hidden
            className="absolute -left-10 -top-10 -rotate-12 text-white/10"
          />
          <PawPrint
            size={150}
            strokeWidth={1}
            aria-hidden
            className="absolute -bottom-8 right-0 rotate-12 text-white/10"
          />

          <h2 className="relative mx-auto max-w-xl text-[clamp(1.8rem,3.6vw,2.6rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
            Tu mascota merece a alguien de confianza.
          </h2>
          <button
            type="button"
            onClick={() => onEntrar("registro")}
            className="group relative mt-8 inline-flex items-center gap-2.5 rounded-full bg-accent px-8 py-4 text-[14.5px] font-bold text-white transition-transform duration-200 hover:-translate-y-1"
          >
            Crear cuenta gratis
            <ArrowRight
              size={17}
              strokeWidth={2.4}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </button>
        </div>
      </section>

      {/* ── Pie ───────────────────────────────────────────── */}
      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 pb-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent">
            <img src={MARCA.logoSimbolo} alt="" className="h-[18px] w-[18px] object-contain" />
          </span>
          <span className="text-[14px] font-bold tracking-tight">
            {MARCA.nombre}
            <span className="text-accent">{MARCA.acento}</span>
          </span>
        </div>
        <p className="text-[12.5px] text-ink-mute">
          Hecho en Costa Rica · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};

export default Landing;
