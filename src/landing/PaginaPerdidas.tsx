import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCursorPortada, usePortadaAnimacion } from "./animacion";
import ConmutadorIdioma from "./componentes/ConmutadorIdioma";
import HeroPerdidas from "./perdidas/HeroPerdidas";
import TableroPerdidas from "./perdidas/TableroPerdidas";
import { esEncontrada, type Estado } from "./perdidas/estado";
import Pie from "./secciones/Pie";
import { CANVAS, NAVY } from "./tokens";
import type { ModoAcceso } from "./tipos";
import { useTranslation } from "../hooks/useTranslation";
import { useAuth } from "../hooks/useAuth";
import { getZonas } from "../services/auth.service";
import { listPublicLostPets } from "../services/lost-pets.service";
import type { PublicLostPet } from "../types/lost-pet.types";
import type { Zona } from "../types/auth.types";
import { useZonasEncadenadas } from "../hooks/useZonasEncadenadas";
import Visor from "../components/Visor";

/* ─────────────────────────────────────────────────────────────
   Mascotas perdidas, del lado público.

   Se llega desde el tercer público del hero —«Ver mascotas
   perdidas»— y no pide cuenta: mirar el tablero no debería costar
   un registro. Por eso vive en la portada y no en la aplicación, y
   por eso `RootLayout` la deja pasar sin el guardia de sesión.

   No es `/mascotas-perdidas`: esa ruta ya existe y es la pantalla
   interna, con sesión, donde se reporta y se administra. Esta es
   la vitrina.

   Tres partes, con el aire de la portada y sin sus textos:

     banda azul    "Inicio", el símbolo y el título de siempre
     tablero       búsqueda, estado y las fichas
     pie           el de la portada

   Este archivo carga los reportes, guarda los filtros y reparte. La
   entrada del título es la del hero de la portada: `usePortadaAnimacion`
   encuentra las mismas manijas.
   ───────────────────────────────────────────────────────────── */

const PaginaPerdidas = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const raiz = useRef<HTMLDivElement>(null);
  usePortadaAnimacion(raiz);
  useCursorPortada();

  const [mascotas, setMascotas] = useState<PublicLostPet[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<Estado>("todas");
  const [fotoAbierta, setFotoAbierta] = useState<PublicLostPet | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    Promise.all([listPublicLostPets(), getZonas().catch(() => [])])
      .then(([pets, zonasData]) => {
        if (!vigente) return;
        setMascotas(pets);
        setZonas(zonasData);
      })
      .catch(() => {
        if (vigente) setError(t("landingPerdidas.loadError"));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [t]);

  const territorio = useZonasEncadenadas(zonas);

  /* Zona y búsqueda primero, de lo más nuevo a lo más viejo. El estado
     se aplica después, para que el separador pueda contar cuántas hay
     de cada una con la zona y la búsqueda ya puestas. */
  const filtradas = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es");
    return mascotas
      .filter((mascota) => {
        const texto = [
          mascota.nombre,
          mascota.especie,
          mascota.raza,
          mascota.zona?.nombre,
          mascota.zona?.canton,
          mascota.zona?.provincia,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("es");
        return territorio.cubre(mascota.zona) && (!consulta || texto.includes(consulta));
      })
      .sort((a, b) => b.fecha_reporte.localeCompare(a.fecha_reporte));
    // `territorio` se rehace en cada render; sus escalones son la dependencia real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, mascotas, territorio.provincia, territorio.canton, territorio.distrito]);

  const conteos: Record<Estado, number> = {
    todas: filtradas.length,
    perdidas: filtradas.filter((m) => !esEncontrada(m)).length,
    encontradas: filtradas.filter(esEncontrada).length,
  };
  const visibles =
    estado === "todas"
      ? filtradas
      : filtradas.filter((m) => (estado === "encontradas" ? esEncontrada(m) : !esEncontrada(m)));
  const filtrando = busqueda.trim() !== "" || territorio.filtrando || estado !== "todas";

  /* Esta vitrina vive fuera del armazón de `RootLayout` y no puede
     abrir el formulario de acceso por su cuenta: manda a la portada
     con `#iniciar-sesion` o `#crear-cuenta`, que `RootLayout` lee
     para abrirlo directamente. */
  const entrar = (modo?: ModoAcceso) =>
    navigate({ to: "/", hash: modo === "registro" ? "crear-cuenta" : "iniciar-sesion" });

  const limpiar = () => {
    setBusqueda("");
    setEstado("todas");
    territorio.limpiar();
  };

  const conSesion = Boolean(user);

  return (
    <div ref={raiz} className="portada min-h-screen" style={{ background: NAVY }}>
      <HeroPerdidas
        onEntrar={entrar}
        conSesion={conSesion}
        onMiCuenta={() => navigate({ to: "/" })}
        total={cargando || error ? null : mascotas.length}
      />

      <main>
        <TableroPerdidas
          total={mascotas.length}
          visibles={visibles}
          conteos={conteos}
          estado={estado}
          onEstado={setEstado}
          busqueda={busqueda}
          onBuscar={setBusqueda}
          territorio={territorio}
          filtrando={filtrando}
          onLimpiar={limpiar}
          cargando={cargando}
          error={error}
          conSesion={conSesion}
          onVerFoto={setFotoAbierta}
          /* Avisar de un avistamiento vive en /mascotas-perdidas,
             detrás del guardia de sesión. */
          onGestionar={conSesion ? () => navigate({ to: "/mascotas-perdidas" }) : () => entrar("login")}
        />
      </main>

      {/* El pie de la portada, con los enlaces de esta página. El idioma
          va también acá porque en el teléfono la barra de arriba no
          tiene sitio para él. */}
      <Pie
        enlaces={
          <>
            <Link to="/" className="rotulo transition-opacity duration-150 hover:opacity-60" style={{ color: CANVAS }}>
              {t("landingPerdidas.backHome")}
            </Link>
            <ConmutadorIdioma />
          </>
        }
      />

      <Visor
        abierto={fotoAbierta !== null}
        src={fotoAbierta?.fotoUrl ?? "/mock/dog-nube.jpg"}
        alt={
          fotoAbierta
            ? t("landingPerdidas.card.photoAlt", {
                nombre: esEncontrada(fotoAbierta) ? fotoAbierta.especie : fotoAbierta.nombre,
              })
            : ""
        }
        cerrar={() => setFotoAbierta(null)}
      />
    </div>
  );
};

export default PaginaPerdidas;
