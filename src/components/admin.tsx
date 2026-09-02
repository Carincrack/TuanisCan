import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Building2, Check, ChevronLeft, ChevronRight, Download, Eye, FileText, IdCard, Loader, RefreshCw, Search, ShieldCheck, UserCheck, UserX, X } from "../lib/iconos";
import { useAdminPaseadores } from "../hooks/useAdminPaseadores";
import { useAdminUsuarios } from "../hooks/useAdminUsuarios";
import { useAuth } from "../hooks/useAuth";
import {
  downloadVerificationDocument,
  listVerificationRequests,
  getVerificationDocumentUrl,
  reviewVerificationRequest,
} from "../services/verification.service";
import type { AdminUser, AdminVerificationRequest, AdminWalker, RolPublico, VerificationDocumentType } from "../types/auth.types";
import {
  Avatar,
  Badge,
  EmptyState,
  FilterTabs,
  Page,
  PageHeader,
  Section,
  Stat,
  Table,
  btnDanger,
  btnPrimary,
  btnQuiet,
  btnSecondary,
  colones,
  input,
} from "./ui";
import { Combo } from "./Combo";
import { Skeleton } from "boneyard-js/react";
import { aviso } from "../lib/aviso";

/* ─────────────────────────────────────────────────────────────
   Panel de la plataforma. Solo para el equipo de TuanisCan:
   se entra por /acceso-interno, que no está enlazado desde
   ninguna pantalla pública.
   ───────────────────────────────────────────────────────────── */

const mesesIngreso = [
  { mes: "Mar", bruto: 1840000 },
  { mes: "Abr", bruto: 2120000 },
  { mes: "May", bruto: 2460000 },
  { mes: "Jun", bruto: 2890000 },
  { mes: "Jul", bruto: 3240000 },
  { mes: "Ago", bruto: 3680000 },
];

const maxIngreso = Math.max(...mesesIngreso.map((m) => m.bruto));

export const PanelAdmin = () => (
  <Page>
    <PageHeader
      title="Panel general"
      subtitle="Estado de la plataforma · miércoles 19 de agosto"
      action={
        <span className="flex items-center gap-2 bg-accent-wash px-4 py-2.5 text-[13px] font-semibold text-accent-dark">
          <ShieldCheck size={15} strokeWidth={1.9} aria-hidden />
          Acceso interno
        </span>
      }
    />

    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      <Stat etiqueta="Comisión del mes" valor={colones(552000)} nota="15% de 3.68 M" />
      <Stat etiqueta="Paseos del mes" valor="1 284" nota="+13.6% vs julio" />
      <Stat etiqueta="Paseadores activos" valor="62" nota="de 78 registrados" />
      <Stat etiqueta="Dueños activos" valor="418" nota="+37 este mes" />
    </div>

    <Section title="Volumen bruto por mes" bodyClass="px-6 pt-5 pb-6">
      {/* Barras en CSS: no vale la pena una librería de gráficos para una maqueta. */}
      <ul className="flex h-[180px] items-end gap-3">
        {mesesIngreso.map((m, i) => (
          <li key={m.mes} className="flex flex-1 flex-col items-center gap-2">
            <span className="nums text-[11px] text-ink-soft">
              {(m.bruto / 1_000_000).toFixed(2)} M
            </span>
            <span
              style={{
                height: `${(m.bruto / maxIngreso) * 100}%`,
                animationDelay: `${i * 60}ms`,
              }}
              className="anim-rise w-full bg-accent"
            />
            <span className="text-[11px] font-medium text-ink-mute">{m.mes}</span>
          </li>
        ))}
      </ul>
    </Section>

    <div className="grid gap-3 lg:grid-cols-2">
      <Section title="Top paseadores del mes" bodyClass="">
        <Table
          caption="Paseadores con más paseos completados"
          columnas={[
            { label: "Paseador" },
            { label: "Paseos", align: "right" },
            { label: "Generado", align: "right" },
          ]}
        >
          {[
            { n: "María Fernández", p: 68, g: 306000 },
            { n: "Carolina Mora", p: 54, g: 280800 },
            { n: "Luis Rojas", p: 49, g: 186200 },
            { n: "Valeria Chacón", p: 41, g: 196800 },
          ].map((w) => (
            <tr key={w.n}>
              <td className="px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar nombre={w.n} size={30} />
                  <span className="text-[13px] font-medium text-ink">{w.n}</span>
                </div>
              </td>
              <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">
                {w.p}
              </td>
              <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                {colones(w.g)}
              </td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Cobertura por zona" bodyClass="px-6 pt-4 pb-6">
        <ul className="flex flex-col gap-3">
          {[
            { z: "Curridabat", n: 18, pct: 100 },
            { z: "Escazú", n: 14, pct: 78 },
            { z: "San Pedro", n: 11, pct: 61 },
            { z: "Heredia", n: 9, pct: 50 },
            { z: "Cartago", n: 6, pct: 33 },
            { z: "Alajuela", n: 4, pct: 22 },
          ].map((z, i) => (
            <li key={z.z} className="flex items-center gap-3">
              <span className="w-[84px] flex-shrink-0 text-[12.5px] text-ink-soft">
                {z.z}
              </span>
              <span className="h-2.5 flex-1 bg-sunken">
                <span
                  style={{ width: `${z.pct}%`, animationDelay: `${i * 50}ms` }}
                  className="anim-bar block h-full bg-accent"
                />
              </span>
              <span className="nums w-8 flex-shrink-0 text-right text-[12px] text-ink-mute">
                {z.n}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  </Page>
);

/* ── Finanzas ────────────────────────────────────────────────── */

const liquidaciones = [
  { id: "LQ-0091", periodo: "11 – 17 ago", paseadores: 58, bruto: 892000, comision: 133800, estado: "Pagada" as const },
  { id: "LQ-0090", periodo: "4 – 10 ago", paseadores: 55, bruto: 845000, comision: 126750, estado: "Pagada" as const },
  { id: "LQ-0092", periodo: "18 – 24 ago", paseadores: 62, bruto: 418000, comision: 62700, estado: "Abierta" as const },
  { id: "LQ-0089", periodo: "28 jul – 3 ago", paseadores: 53, bruto: 803000, comision: 120450, estado: "Pagada" as const },
];

export const FinanzasAdmin = () => {
  const [filtro, setFiltro] = useState("Todas");

  const visibles = liquidaciones.filter((l) =>
    filtro === "Todas" ? true : l.estado === (filtro === "Pagadas" ? "Pagada" : "Abierta")
  );

  return (
    <Page>
      <PageHeader
        title="Finanzas"
        subtitle="Comisión de la plataforma y liquidaciones semanales a paseadores."
        action={
          <button type="button" className={btnSecondary}>
            <Download size={14} strokeWidth={1.9} />
            Exportar
          </button>
        }
      />

      <div className="grid gap-2.5 sm:grid-cols-3">
        <Stat etiqueta="Comisión acumulada" valor={colones(2841000)} nota="año en curso" />
        <Stat etiqueta="Por liquidar" valor={colones(355300)} nota="62 paseadores" />
        <Stat etiqueta="Ticket promedio" valor={colones(4520)} nota="por paseo" />
      </div>

      <div className="bg-surface">
        <FilterTabs
          label="Filtrar liquidaciones"
          options={["Todas", "Abiertas", "Pagadas"]}
          value={filtro}
          onChange={setFiltro}
        />
      </div>

      <Section bodyClass="">
        {visibles.length > 0 ? (
          <Table
            caption={`Liquidaciones filtradas por ${filtro.toLowerCase()}`}
            columnas={[
              { label: "Periodo" },
              { label: "Paseadores", align: "right" },
              { label: "Bruto", align: "right" },
              { label: "Comisión", align: "right" },
              { label: "Estado" },
            ]}
          >
            {visibles.map((l) => (
              <tr key={l.id}>
                <td className="px-6 py-3.5">
                  <p className="text-[13px] font-medium text-ink">{l.periodo}</p>
                  <p className="nums text-[11.5px] text-ink-mute">{l.id}</p>
                </td>
                <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">
                  {l.paseadores}
                </td>
                <td className="nums px-6 py-3.5 text-right text-[12.5px] text-ink-soft">
                  {colones(l.bruto)}
                </td>
                <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                  {colones(l.comision)}
                </td>
                <td className="px-6 py-3.5">
                  <Badge tono={l.estado === "Pagada" ? "ok" : "warn"}>
                    {l.estado}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            title="Sin liquidaciones en este filtro"
            hint="Cambia el filtro para ver el resto."
          />
        )}
      </Section>
    </Page>
  );
};

/* ── Paseadores ──────────────────────────────────────────────── */

const estadoPaseadorLabel: Record<AdminWalker["estado"], string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
};

const tonoPaseador = (estado: AdminWalker["estado"]) =>
  estado === "activo" ? "ok" : estado === "suspendido" ? "danger" : "neutral";

export const PaseadoresAdmin = () => {
  const { paseadores, loading, error } = useAdminPaseadores();
  const [filtro, setFiltro] = useState("Todos");

  const visibles = paseadores.filter((paseador) =>
    filtro === "Todos"
      ? true
      : filtro === "Activos"
        ? paseador.estado === "activo"
        : filtro === "Inactivos"
          ? paseador.estado === "inactivo"
          : paseador.estado === "suspendido"
  );

  return (
    <Page>
      <PageHeader
        title="Paseadores"
        subtitle="Todos los paseadores registrados en la plataforma."
      />

      <div className="bg-surface">
        <FilterTabs
          label="Filtrar paseadores"
          options={["Todos", "Activos", "Inactivos", "Suspendidos"]}
          value={filtro}
          onChange={setFiltro}
        />
      </div>

      {error && (
        <div aria-live="polite" className="bg-danger-wash px-6 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <Section bodyClass="">
        {loading ? (
          <p className="px-6 py-8 text-[13px] text-ink-soft">Cargando paseadores...</p>
        ) : visibles.length > 0 ? (
          <Table
            caption={`Paseadores filtrados por ${filtro.toLowerCase()}`}
            columnas={[
              { label: "Paseador" },
              { label: "Zona" },
              { label: "Paseos", align: "right" },
              { label: "Rating", align: "right" },
              { label: "Generado", align: "right" },
              { label: "Estado" },
            ]}
          >
            {visibles.map((p) => (
              <tr key={p.id_usuario}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    {p.foto_perfil ? (
                      <img
                        src={p.foto_perfil}
                        alt=""
                        aria-hidden
                        className="h-9 w-9 flex-shrink-0 bg-sunken object-cover"
                      />
                    ) : (
                      <Avatar nombre={p.nombre} size={36} />
                    )}
                    <span className="text-[13px] font-medium text-ink">
                      {p.nombre}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3 text-[12.5px] text-ink-soft">{p.zona}</td>
                <td className="nums px-6 py-3 text-right text-[12.5px] text-ink-soft">
                  {p.paseos}
                </td>
                <td className="nums px-6 py-3 text-right text-[12.5px] text-ink-soft">
                  {p.rating}
                </td>
                <td className="nums px-6 py-3 text-right text-[13px] font-semibold text-ink">
                  {colones(p.generado)}
                </td>
                <td className="px-6 py-3">
                  <Badge tono={tonoPaseador(p.estado)}>{estadoPaseadorLabel[p.estado]}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="Sin paseadores" hint={error ? "Revisa la conexión o los permisos de administrador." : "Cambia el filtro para ver el resto."} />
        )}
      </Section>
    </Page>
  );
};

/* ── Verificaciones ──────────────────────────────────────────── */

const documentLabel: Record<VerificationDocumentType, string> = {
  cedula_frente: "Cédula (frente)",
  cedula_reverso: "Cédula (reverso)",
  hoja_delincuencia: "Hoja de delincuencia",
  permiso_funcionamiento: "Permiso de funcionamiento",
};

const verificationRoleLabel: Record<RolPublico, string> = {
  dueno: "Dueño",
  paseador: "Paseador",
  negocio: "Negocio",
};

const verificationDate = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : "No se pudo completar la revisión.";

/* ─────────────────────────────────────────────────────────────
   EL VISOR DE DOCUMENTOS

   Lo que había mostraba UN documento por vez: para comparar la cédula
   por delante con la de atrás —que es literalmente el trabajo— había
   que cerrar, volver a la tarjeta, abrir el otro, cerrar otra vez. Y
   la imagen entraba escalada a la caja, sin acercar y sin girar, así
   que una cédula fotografiada de lado con el teléfono no se podía
   leer. No era un problema de estilo: no se podía hacer la tarea.

   Ahora la ventana es de la PERSONA y no del archivo. Los documentos
   quedan en una tira al costado y se cambia sin cerrar nada.
   ───────────────────────────────────────────────────────────── */

const iconoDocumento: Record<VerificationDocumentType, typeof IdCard> = {
  cedula_frente: IdCard,
  cedula_reverso: IdCard,
  hoja_delincuencia: FileText,
  permiso_funcionamiento: Building2,
};

const esPdf = (nombre: string) => /\.pdf$/i.test(nombre);

/* El encuadre es 1. Se puede bajar hasta un tercio para ver una hoja
   larga entera —una hoja de delincuencia no se lee, se comprueba que
   esté completa y a nombre de quien dice— y subir hasta seis veces
   para el número de cédula.

   Los pasos son multiplicativos, no de suma fija: pasar de 0.5 a 0.75
   es un salto enorme y de 5 a 5.25 no se nota. Multiplicar mantiene
   el mismo salto percibido en todo el recorrido. */
const ESCALA_MIN = 0.33;
const ESCALA_MAX = 6;
const PASO_ESCALA = 1.25;
const acotar = (valor: number) =>
  Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, Number(valor.toFixed(2))));

const VisorDocumentos = ({
  solicitud,
  inicial,
  onClose,
  onRevisar,
}: {
  solicitud: AdminVerificationRequest;
  inicial: string;
  onClose: () => void;
  /* Lanza si la revisión falla; el visor muestra el motivo y se queda
     abierto. Si resuelve, la solicitud ya salió de la lista y el visor
     se cierra solo. */
  onRevisar: (
    estado: "aprobado" | "rechazado",
    observacion?: string,
  ) => Promise<void>;
}) => {
  const [activo, setActivo] = useState(inicial);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [veredicto, setVeredicto] = useState<"aprobado" | "rechazado" | null>(
    null,
  );
  const [observacion, setObservacion] = useState("");
  const [rechazando, setRechazando] = useState(false);

  const [escala, setEscala] = useState(1);
  const [giro, setGiro] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const arranque = useRef<{ x: number; y: number } | null>(null);

  /* La imagen girada un cuarto de vuelta ya no cabe en el mismo hueco:
     lo que era su ancho pasa a medirse contra el alto. Sin medir la
     caja no hay forma de calcularlo, y el recorte se come justo el
     número de cédula. */
  const caja = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });

  const documentos = solicitud.documentos;
  const documento =
    documentos.find((d) => d.id_documento === activo) ?? documentos[0];
  const indice = documentos.findIndex(
    (d) => d.id_documento === documento?.id_documento,
  );
  const url = documento ? urls[documento.id_documento] : undefined;
  const pdf = documento ? esPdf(documento.nombre_archivo) : false;
  const vertical = giro % 180 !== 0;

  const mover = useCallback(
    (paso: number) => {
      if (documentos.length < 2) return;
      const siguiente =
        (indice + paso + documentos.length) % documentos.length;
      setActivo(documentos[siguiente].id_documento);
    },
    [documentos, indice],
  );

  const ajustar = useCallback(() => {
    setEscala(1);
    setGiro(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  const acercar = useCallback((factor: number) => {
    setEscala((actual) => {
      const nueva = acotar(actual * factor);
      if (nueva <= 1) setOffset({ x: 0, y: 0 });
      return nueva;
    });
  }, []);

  /* Volver al encuadre en cada documento. Heredar el zoom del anterior
     deja el siguiente abierto en una esquina cualquiera. */
  useEffect(() => {
    ajustar();
  }, [activo, ajustar]);

  useEffect(() => {
    const elemento = caja.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) =>
      setMedida({
        ancho: entrada.contentRect.width,
        alto: entrada.contentRect.height,
      }),
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  /* El enlace firmado vive cinco minutos. Se pide al abrir cada
     documento y se guarda: volver al anterior no vuelve a pedirlo. */
  useEffect(() => {
    if (!documento || urls[documento.id_documento]) return;
    let vivo = true;
    setCargando(true);
    setFallo(null);
    getVerificationDocumentUrl(documento)
      .then((firmada) => {
        if (vivo) {
          setUrls((actuales) => ({
            ...actuales,
            [documento.id_documento]: firmada,
          }));
        }
      })
      .catch((cause) => {
        if (vivo) setFallo(errorMessage(cause));
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [documento, urls]);

  const acciones = useRef({ onClose, mover, acercar, ajustar });
  useEffect(() => {
    acciones.current = { onClose, mover, acercar, ajustar };
  });

  useEffect(() => {
    const devolver = document.activeElement as HTMLElement | null;
    const previo = document.body.style.overflow;

    const alTeclear = (evento: KeyboardEvent) => {
      const teclas: Record<string, () => void> = {
        Escape: () => acciones.current.onClose(),
        ArrowRight: () => acciones.current.mover(1),
        ArrowLeft: () => acciones.current.mover(-1),
        "+": () => acciones.current.acercar(PASO_ESCALA),
        "=": () => acciones.current.acercar(PASO_ESCALA),
        "-": () => acciones.current.acercar(1 / PASO_ESCALA),
        "0": () => acciones.current.ajustar(),
      };
      const accion = teclas[evento.key];
      if (accion) {
        evento.preventDefault();
        accion();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = previo;
      document.removeEventListener("keydown", alTeclear);
      devolver?.focus?.();
    };
  }, []);

  const descargar = async () => {
    if (!documento) return;
    setDescargando(true);
    setFallo(null);
    try {
      await downloadVerificationDocument(documento);
      aviso.ok("Documento descargado", { detalle: documento.nombre_archivo });
    } catch (cause) {
      setFallo(errorMessage(cause));
      aviso.error(cause, { respaldo: "No se pudo descargar el documento." });
    } finally {
      setDescargando(false);
    }
  };

  const resolver = async (estado: "aprobado" | "rechazado") => {
    if (estado === "rechazado" && observacion.trim().length < 5) {
      setFallo("Escribí una observación de al menos 5 caracteres para rechazar.");
      return;
    }
    setVeredicto(estado);
    setFallo(null);
    try {
      await onRevisar(
        estado,
        estado === "rechazado" ? observacion.trim() : undefined,
      );
      onClose();
      if (estado === "aprobado") {
        aviso.ok(`${solicitud.nombre} quedó verificado`, {
          detalle: "Ya puede operar en la plataforma con todos sus perfiles.",
        });
      } else {
        aviso.dato(`Verificación de ${solicitud.nombre} rechazada`, {
          detalle: "Recibió tu observación y puede volver a enviarla.",
        });
      }
    } catch (cause) {
      setFallo(errorMessage(cause));
      setVeredicto(null);
    }
  };

/* En un teléfono no hay rueda ni teclado: los botones de acercar
     serían el único camino, y sobre una cédula eso es inservible. Con
     dos dedos se pellizca; con uno se arrastra cuando ya está
     acercada.

     Los punteros se llevan en un `Map` y no en estado porque cambian
     en cada movimiento del dedo: pintar en cada uno tiraría el gesto
     al suelo. Solo la escala y el desplazamiento —lo que sí se ve—
     pasan por `setState`. */
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const pellizco = useRef<{ distancia: number; escala: number } | null>(null);

  const separacion = () => {
    const [a, b] = [...punteros.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const tomar = (evento: ReactPointerEvent<HTMLImageElement>) => {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    punteros.current.set(evento.pointerId, {
      x: evento.clientX,
      y: evento.clientY,
    });

    if (punteros.current.size === 2) {
      pellizco.current = { distancia: separacion(), escala };
      arranque.current = null;
      setArrastrando(false);
      return;
    }

    /* Por debajo del encuadre la imagen es más chica que su hueco: no
       hay nada fuera de vista que valga la pena arrastrar. */
    if (escala <= 1) return;
    arranque.current = {
      x: evento.clientX - offset.x,
      y: evento.clientY - offset.y,
    };
    setArrastrando(true);
  };

  const llevar = (evento: ReactPointerEvent<HTMLImageElement>) => {
    if (!punteros.current.has(evento.pointerId)) return;
    punteros.current.set(evento.pointerId, {
      x: evento.clientX,
      y: evento.clientY,
    });

    if (punteros.current.size === 2 && pellizco.current) {
      const ahora = separacion();
      if (pellizco.current.distancia > 0) {
        setEscala(
          acotar(pellizco.current.escala * (ahora / pellizco.current.distancia)),
        );
      }
      return;
    }

    if (!arranque.current) return;
    setOffset({
      x: evento.clientX - arranque.current.x,
      y: evento.clientY - arranque.current.y,
    });
  };

  const soltar = (evento: ReactPointerEvent<HTMLImageElement>) => {
    punteros.current.delete(evento.pointerId);
    if (punteros.current.size < 2) pellizco.current = null;
    if (punteros.current.size === 0) {
      arranque.current = null;
      setArrastrando(false);
    }
  };

  const botonHerramienta =
    "grid h-8 w-8 place-items-center rounded-full text-rail-text transition-[background-color,color,transform] duration-150 ease-out hover:bg-rail-hover hover:text-white active:scale-[0.94] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-rail-text";

  /* `suave` en la envoltura: el portal cuelga de `document.body` y
     queda fuera del `<div class="suave">` de `AppShell`, así que sin
     esto se pierden el radio por defecto y la barra de desplazamiento
     fina. Fue lo que dejó la ventana cuadrada al portalizarla. */
  return createPortal(
    <div className="suave fixed inset-0 z-[100] flex p-2.5 sm:p-6">
      <button
        type="button"
        aria-label="Cerrar visor"
        onClick={onClose}
        className="anim-fade absolute inset-0 bg-rail/80 backdrop-blur-[2px]"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="visor-documentos-title"
        className="anim-rise relative m-auto flex h-[calc(100dvh-1.25rem)] max-h-[920px] w-full max-w-[1080px] min-w-0 flex-col overflow-hidden rounded-[20px] bg-surface sm:h-[90dvh]"
      >
        <header className="flex items-center gap-3 bg-rail px-4 py-3 sm:px-5">
          {solicitud.foto_perfil ? (
            <img
              src={solicitud.foto_perfil}
              alt=""
              aria-hidden
              className="h-9 w-9 shrink-0 rounded-full bg-rail-hover object-cover"
            />
          ) : (
            <Avatar nombre={solicitud.nombre} size={36} />
          )}

          <div className="min-w-0 flex-1">
            <h3
              id="visor-documentos-title"
              className="titular truncate text-[15px] text-white"
            >
              {solicitud.nombre}
            </h3>
            <p className="truncate text-[11.5px] text-rail-text">
              {solicitud.correo} · {solicitud.zona}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void descargar()}
            disabled={descargando || !documento}
            className={`${btnSecondary} shrink-0 disabled:cursor-wait disabled:opacity-60`}
          >
            {descargando ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span className="hidden sm:inline">Descargar</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar visor"
            className={botonHerramienta}
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* La tira de documentos. En horizontal arriba cuando la
              pantalla es angosta, en columna al costado cuando hay
              sitio: en un teléfono una columna de 190 px se come la
              mitad del ancho útil. */}
          <nav
            aria-label="Documentos de la solicitud"
            className="flex shrink-0 gap-1.5 overflow-x-auto bg-sunken p-2 sm:w-[212px] sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:p-2.5"
          >
            {documentos.map((doc) => {
              const Icono = iconoDocumento[doc.tipo_documento];
              const seleccionado = doc.id_documento === documento?.id_documento;

              return (
                <button
                  key={doc.id_documento}
                  type="button"
                  onClick={() => setActivo(doc.id_documento)}
                  aria-current={seleccionado ? "true" : undefined}
                  className={`flex shrink-0 items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] sm:w-full ${
                    seleccionado
                      ? "bg-rail text-white"
                      : "text-ink-soft hover:bg-white/70 hover:text-ink"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                      seleccionado
                        ? "bg-accent text-rail"
                        : "bg-white text-ink-mute"
                    }`}
                  >
                    <Icono size={14} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-medium whitespace-nowrap sm:whitespace-normal">
                      {documentLabel[doc.tipo_documento]}
                    </span>
                    <span
                      className={`hidden truncate text-[10.5px] sm:block ${
                        seleccionado ? "text-rail-text" : "text-ink-mute"
                      }`}
                    >
                      {doc.nombre_archivo}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Barra de herramientas. Los controles de acercar sobran
                en un PDF: el lector del navegador trae los suyos. */}
            <div className="flex shrink-0 items-center gap-1 overflow-x-auto bg-sunken px-2 py-1.5">
              <button
                type="button"
                onClick={() => mover(-1)}
                disabled={documentos.length < 2}
                aria-label="Documento anterior"
                className={`${botonHerramienta} text-ink-soft hover:bg-white hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-soft`}
              >
                <ChevronLeft size={17} />
              </button>
              <span className="nums min-w-[3.5rem] text-center text-[11.5px] font-medium text-ink-mute">
                {indice + 1} de {documentos.length}
              </span>
              <button
                type="button"
                onClick={() => mover(1)}
                disabled={documentos.length < 2}
                aria-label="Documento siguiente"
                className={`${botonHerramienta} text-ink-soft hover:bg-white hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-soft`}
              >
                <ChevronRight size={17} />
              </button>

              {!pdf && (
                <>
                  <span aria-hidden className="mx-1.5 h-5 w-px bg-suelo" />

                  <button
                    type="button"
                    onClick={() => acercar(-0.5)}
                    disabled={escala <= ESCALA_MIN}
                    aria-label="Alejar"
                    className={`${botonHerramienta} text-[17px] leading-none font-semibold text-ink-soft hover:bg-white hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-soft`}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={ajustar}
                    className="nums min-w-[3.5rem] rounded-full py-1 text-center text-[11.5px] font-medium text-ink-soft transition-colors duration-150 hover:bg-white hover:text-ink"
                  >
                    {Math.round(escala * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => acercar(0.5)}
                    disabled={escala >= ESCALA_MAX}
                    aria-label="Acercar"
                    className={`${botonHerramienta} text-[17px] leading-none font-semibold text-ink-soft hover:bg-white hover:text-ink disabled:hover:bg-transparent disabled:hover:text-ink-soft`}
                  >
                    +
                  </button>

                  <button
                    type="button"
                    onClick={() => setGiro((actual) => (actual + 90) % 360)}
                    aria-label="Girar un cuarto de vuelta"
                    className={`${botonHerramienta} text-ink-soft hover:bg-white hover:text-ink`}
                  >
                    <RefreshCw size={15} />
                  </button>
                </>
              )}

              <span className="ml-auto hidden shrink-0 pr-1 text-[11px] whitespace-nowrap text-ink-mute lg:block">
                ← → cambian de documento · rueda o pellizco acercan · 0
                encuadra
              </span>
            </div>

            <div
              ref={caja}
              /* La rueda acerca y aleja. No se llama `preventDefault`
                 a propósito: React engancha `wheel` en modo pasivo y
                 avisaría por consola. No hace falta — acá dentro no
                 hay nada que se desplace, y el scroll del documento
                 está bloqueado mientras la ventana está abierta. */
              onWheel={(evento) => {
                if (pdf) return;
                acercar(evento.deltaY < 0 ? PASO_ESCALA : 1 / PASO_ESCALA);
              }}
              className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-sunken"
            >
              {cargando && (
                <p className="flex items-center gap-2 text-[13px] text-ink-soft">
                  <Loader size={16} className="animate-spin" /> Abriendo
                  documento…
                </p>
              )}

              {!cargando && fallo && (
                <div className="max-w-[320px] px-6 text-center">
                  <AlertCircle
                    size={22}
                    aria-hidden
                    className="mx-auto text-danger"
                  />
                  <p className="mt-2 text-[13px] font-semibold text-ink">
                    No se pudo abrir el documento
                  </p>
                  <p className="mt-1 text-[12.5px] text-ink-soft">{fallo}</p>
                </div>
              )}

              {!cargando && !fallo && url && documento && (
                pdf ? (
                  <iframe
                    src={url}
                    title={documentLabel[documento.tipo_documento]}
                    className="h-full w-full bg-white"
                  />
                ) : (
                  <img
                    src={url}
                    alt={documentLabel[documento.tipo_documento]}
                    draggable={false}
                    onPointerDown={tomar}
                    onPointerMove={llevar}
                    onPointerUp={soltar}
                    onPointerCancel={soltar}
                    style={{
                      maxWidth: vertical ? medida.alto : medida.ancho,
                      maxHeight: vertical ? medida.ancho : medida.alto,
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${escala}) rotate(${giro}deg)`,
                      cursor:
                        escala > 1
                          ? arrastrando
                            ? "grabbing"
                            : "grab"
                          : "default",
                      transition: arrastrando
                        ? "none"
                        : "transform 180ms cubic-bezier(0.23, 1, 0.32, 1)",
                      /* Sin esto el navegador se queda con el gesto y
                         desplaza o hace su propio zoom antes de que
                         lleguen los eventos de puntero. */
                      touchAction: "none",
                    }}
                    className="block origin-center object-contain select-none"
                  />
                )
              )}
            </div>
          </div>
        </div>

        {/* Aprobar o rechazar sin salir.

            Antes había que cerrar el visor, buscar otra vez la tarjeta
            en la lista y recién ahí decidir — con los documentos ya
            fuera de la vista, que es justo cuando hay que acordarse de
            lo que decían. La decisión va donde está la evidencia.

            En pantalla angosta los botones se apilan y ocupan todo el
            ancho: son la acción principal y no deben quedar como dos
            píldoras chiquitas en una esquina. */}
        <footer className="shrink-0 bg-surface px-4 py-3 sm:px-5">
          {veredicto === null && rechazando && (
            <div className="mb-3">
              <label
                htmlFor="visor-observacion"
                className="rotulo text-ink-mute"
              >
                Qué debe corregir *
              </label>
              <textarea
                id="visor-observacion"
                autoFocus
                rows={2}
                maxLength={500}
                value={observacion}
                onChange={(evento) => setObservacion(evento.target.value)}
                placeholder="Indicá qué documento está mal y por qué. Lo va a leer la persona."
                className={`${input} mt-1.5 resize-y`}
              />
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {rechazando && (
              <button
                type="button"
                disabled={veredicto !== null}
                onClick={() => {
                  setRechazando(false);
                  setObservacion("");
                  setFallo(null);
                }}
                className={`${btnQuiet} w-full sm:w-auto`}
              >
                Cancelar
              </button>
            )}

            <button
              type="button"
              disabled={veredicto !== null}
              onClick={() => {
                if (rechazando) void resolver("rechazado");
                else {
                  setRechazando(true);
                  setFallo(null);
                }
              }}
              className={`${btnDanger} w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto`}
            >
              {veredicto === "rechazado" ? (
                <Loader size={15} className="animate-spin" />
              ) : (
                <X size={15} strokeWidth={2.2} />
              )}
              {rechazando ? "Confirmar rechazo" : "Rechazar"}
            </button>

            {!rechazando && (
              <button
                type="button"
                disabled={veredicto !== null}
                onClick={() => void resolver("aprobado")}
                className={`${btnPrimary} w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto`}
              >
                {veredicto === "aprobado" ? (
                  <Loader size={15} className="animate-spin" />
                ) : (
                  <Check size={15} strokeWidth={2.2} />
                )}
                Aprobar perfil
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export const VerificacionesAdmin = () => {
  const [pendientes, setPendientes] = useState<AdminVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [observation, setObservation] = useState("");
  const [error, setError] = useState<string | null>(null);
  /* La ventana se abre para una PERSONA, con el documento que se tocó
     como primero. Antes el estado guardaba un archivo suelto y su
     enlace, y por eso no había forma de pasar al siguiente sin
     cerrarla. */
  const [revision, setRevision] = useState<{ solicitud: AdminVerificationRequest; inicial: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPendientes(await listVerificationRequests());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* La llamada desnuda, sin atrapar nada: la usan los dos caminos —la
     tarjeta de la lista y el pie del visor— y cada uno enseña el error
     donde corresponde. */
  const revisar = async (
    request: AdminVerificationRequest,
    status: "aprobado" | "rechazado",
    observacion?: string,
  ) => {
    await reviewVerificationRequest(request.id_usuario, status, observacion);
    setPendientes((current) =>
      current.filter((item) => item.id_usuario !== request.id_usuario),
    );
  };

  const review = async (request: AdminVerificationRequest, status: "aprobado" | "rechazado") => {
    if (status === "rechazado" && observation.trim().length < 5) {
      setError("Escribe una observación de al menos 5 caracteres para rechazar.");
      return;
    }
    setProcessingId(request.id_usuario);
    setError(null);
    try {
      await revisar(request, status, status === "rechazado" ? observation.trim() : undefined);
      setRejectingId(null);
      setObservation("");
      if (status === "aprobado") {
        aviso.ok(`${request.nombre} quedó verificado`, {
          detalle: "Ya puede operar en la plataforma con todos sus perfiles.",
        });
      } else {
        aviso.dato(`Verificación de ${request.nombre} rechazada`, {
          detalle: "Recibió tu observación y puede volver a enviarla.",
        });
      }
    } catch (cause) {
      setError(errorMessage(cause));
      aviso.error(cause, { respaldo: "No se pudo registrar la revisión." });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Verificaciones"
        subtitle="Solicitudes de identidad pendientes de revisión administrativa."
        action={<Badge tono="warn">{pendientes.length} pendientes</Badge>}
      />

      {error && <p role="alert" className="bg-danger-wash px-5 py-4 text-[13px] text-danger">{error}</p>}

      {loading && (
        <Skeleton name="admin-verificaciones" loading>
          <div />
        </Skeleton>
      )}

      {pendientes.map((v) => (
        <article key={v.id_usuario} className="anim-rise bg-surface px-6 py-5">
          <div className="flex flex-wrap items-start gap-5">
            {v.foto_perfil ? <img src={v.foto_perfil} alt={`Foto de ${v.nombre}`} className="h-16 w-16 flex-shrink-0 rounded-full bg-sunken object-cover" /> : <Avatar nombre={v.nombre} size={64} />}

            <div className="min-w-[200px] flex-1">
              <h3 className="text-[15px] font-semibold text-ink">{v.nombre}</h3>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {v.correo} · {v.zona}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-mute">{v.roles.map((role) => verificationRoleLabel[role]).join(" + ") || "Perfil de paseador solicitado"} · enviado {verificationDate.format(new Date(v.fecha_solicitud))}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {v.documentos.length === 0 ? (
                  <p className="text-[12.5px] text-ink-mute">Sin documentos adjuntos.</p>
                ) : (
                  <>
                    <button type="button" onClick={() => setRevision({ solicitud: v, inicial: v.documentos[0].id_documento })} className={btnPrimary}>
                      <Eye size={14} /> Revisar {v.documentos.length} documento{v.documentos.length === 1 ? "" : "s"}
                    </button>
                    {/* Cada documento sigue teniendo su propia entrada:
                        abren la misma ventana, ya puesta en ese. */}
                    {v.documentos.map((documento) => (
                      <button key={documento.id_documento} type="button" onClick={() => setRevision({ solicitud: v, inicial: documento.id_documento })} className={btnSecondary}>
                        {documentLabel[documento.tipo_documento]}
                      </button>
                    ))}
                  </>
                )}
              </div>
              {rejectingId === v.id_usuario && (
                <div className="mt-4">
                  <label htmlFor={`observation-${v.id_usuario}`} className="rotulo text-ink-mute">Observación para el usuario *</label>
                  <textarea id={`observation-${v.id_usuario}`} value={observation} onChange={(event) => setObservation(event.target.value)} rows={3} maxLength={500} className={`${input} mt-2 resize-y`} placeholder="Indica qué documento debe corregir y por qué." />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void review(v, "aprobado")}
                disabled={processingId !== null}
                className={btnPrimary}
              >
                {processingId === v.id_usuario ? <Loader size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.2} />}
                Aprobar perfil
              </button>
              <button
                type="button"
                onClick={() => {
                  if (rejectingId === v.id_usuario) void review(v, "rechazado");
                  else { setRejectingId(v.id_usuario); setObservation(""); setError(null); }
                }}
                disabled={processingId !== null}
                className={btnDanger}
              >
                <X size={15} strokeWidth={2.2} />
                {rejectingId === v.id_usuario ? "Confirmar rechazo" : "Rechazar"}
              </button>
            </div>
          </div>
        </article>
      ))}

      {!loading && pendientes.length === 0 && (
        <EmptyState
          title="No hay verificaciones pendientes"
          hint="Todas las solicitudes fueron revisadas."
        />
      )}

      {revision && (
        <VisorDocumentos
          solicitud={revision.solicitud}
          inicial={revision.inicial}
          onClose={() => setRevision(null)}
          onRevisar={(estado, observacion) =>
            revisar(revision.solicitud, estado, observacion)
          }
        />
      )}

    </Page>
  );
};

/* ── Usuarios ────────────────────────────────────────────────── */

const rolLabel: Record<RolPublico, string> = { dueno: "Dueño", paseador: "Paseador", negocio: "Negocio" };
const rolTono = (rol: RolPublico | null) => rol === "paseador" ? "accent" : rol === "negocio" ? "warn" : "neutral";
const rolesLabel = (roles: RolPublico[]) => roles.map((rol) => rolLabel[rol]).join(" + ") || "Sin rol";
const PAGE_SIZE = 8;
const dateFormatter = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" });

export const UsuariosAdmin = () => {
  const { user } = useAuth();
  const { usuarios, loading, procesandoId, error, mensaje, cambiarEstado, clearMessage } = useAdminUsuarios();
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<"todos" | RolPublico>("todos");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("todos");
  const [pagina, setPagina] = useState(1);
  const [confirmar, setConfirmar] = useState<AdminUser | null>(null);

  const visibles = useMemo(() => usuarios.filter((usuario) => {
    const texto = `${usuario.nombre} ${usuario.telefono ?? ""} ${usuario.zona?.nombre ?? ""}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase()) && (filtroRol === "todos" || usuario.roles.includes(filtroRol)) && (filtroEstado === "todos" || (filtroEstado === "activos" ? usuario.activo : !usuario.activo));
  }), [busqueda, filtroEstado, filtroRol, usuarios]);
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginaUsuarios = visibles.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);
  const activos = usuarios.filter((usuario) => usuario.activo).length;
  const duenos = usuarios.filter((usuario) => usuario.roles.includes("dueno")).length;
  const cambiarFiltroRol = (value: "todos" | RolPublico) => { setFiltroRol(value); setPagina(1); };
  const cambiarFiltroEstado = (value: "todos" | "activos" | "inactivos") => { setFiltroEstado(value); setPagina(1); };
  const exportar = () => {
    const csv = ["Nombre,Correo,Telefono,Roles,Zona,Registro,Estado", ...visibles.map((u) => [u.nombre, u.correo ?? "", u.telefono ?? "", rolesLabel(u.roles), u.zona?.nombre ?? "Sin zona", u.fecha_registro, u.activo ? "Activo" : "Inactivo"].map((v) => `"${v.replaceAll('"', '""')}"`).join(","))].join("\n");
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    enlace.download = "usuarios-tuaniscan.csv";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
    aviso.ok("Directorio exportado", {
      detalle: `${visibles.length} ${visibles.length === 1 ? "fila" : "filas"} en usuarios-tuaniscan.csv`,
    });
  };

  return (
    <Page>
      <PageHeader title="Usuarios" subtitle="Directorio general de las personas y negocios registrados." action={<button type="button" onClick={exportar} className={btnSecondary}><Download size={14} strokeWidth={1.9} /> Exportar vista</button>} />
      <div className="grid gap-2.5 sm:grid-cols-3">
        <Stat etiqueta="Usuarios registrados" valor={String(usuarios.length)} nota="Todas las cuentas públicas" />
        <Stat etiqueta="Cuentas activas" valor={String(activos)} nota={`${usuarios.length ? Math.round((activos / usuarios.length) * 100) : 0}% del total`} />
        <Stat etiqueta="Dueños de mascotas" valor={String(duenos)} nota="Segmento principal" />
      </div>
      <Section title="Directorio" aside={<span className="text-[12px] text-ink-mute">{visibles.length} resultados</span>} bodyClass="px-4 py-4 sm:px-6">
        <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_160px_160px]">
          <label className="relative block"><Search size={15} className="absolute top-3 left-3 text-ink-mute" aria-hidden /><span className="sr-only">Buscar usuarios</span><input value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }} className={`${input} pl-10`} placeholder="Buscar por nombre, teléfono o zona" /></label>
          <Combo value={filtroRol} onChange={(v) => cambiarFiltroRol(v as typeof filtroRol)} aria-label="Filtrar por rol" options={[{ value: "todos", label: "Todos los roles" }, { value: "dueno", label: "Dueños" }, { value: "paseador", label: "Paseadores" }, { value: "negocio", label: "Negocios" }]} />
          <Combo value={filtroEstado} onChange={(v) => cambiarFiltroEstado(v as typeof filtroEstado)} aria-label="Filtrar por estado" options={[{ value: "todos", label: "Todos los estados" }, { value: "activos", label: "Activos" }, { value: "inactivos", label: "Inactivos" }]} />
        </div>
      </Section>
      {(error || mensaje) && <div aria-live="polite" className={`px-6 py-3 text-[13px] ${error ? "bg-danger-wash text-danger" : "bg-ok-wash text-ok"}`}>{error ?? mensaje}</div>}
      <Section bodyClass="">
        {loading ? <Skeleton name="admin-tabla" loading><div /></Skeleton> : visibles.length === 0 ? <EmptyState title="No hay usuarios con esos filtros" hint={error ? "Revisa la conexión o los permisos de administrador." : "Prueba con otra búsqueda o limpia los filtros."} /> : <Table caption="Directorio de usuarios" columnas={[{ label: "Usuario" }, { label: "Roles" }, { label: "Contacto" }, { label: "Zona" }, { label: "Registro" }, { label: "Estado" }, { label: "Acciones" }]}>{paginaUsuarios.map((usuario) => {
          const esCuentaActual = usuario.id_usuario === user?.id;
          return <tr key={usuario.id_usuario}><td className="px-6 py-3"><div className="flex items-center gap-3">{usuario.foto_perfil ? <img src={usuario.foto_perfil} alt="" className="h-9 w-9 flex-shrink-0 object-cover" /> : <Avatar nombre={usuario.nombre} size={36} />}<div className="min-w-0"><p className="truncate text-[13px] font-medium text-ink">{usuario.nombre}</p><p className="text-[11px] text-ink-mute">ID {usuario.id_usuario.slice(0, 8)}</p></div></div></td><td className="px-6 py-3"><Badge tono={rolTono(usuario.roles[0] ?? null)}>{rolesLabel(usuario.roles)}</Badge></td><td className="px-6 py-3 text-[12.5px] text-ink-soft"><span className="block">{usuario.correo || "Sin correo"}</span><span className="block text-[11px] text-ink-mute">{usuario.telefono || "Sin teléfono"}</span></td><td className="px-6 py-3 text-[12.5px] text-ink-soft">{usuario.zona?.nombre || "Sin zona"}</td><td className="px-6 py-3 text-[12.5px] text-ink-soft">{dateFormatter.format(new Date(usuario.fecha_registro))}</td><td className="px-6 py-3"><Badge tono={usuario.activo ? "ok" : "neutral"}>{usuario.activo ? "Activo" : "Inactivo"}</Badge></td><td className="px-6 py-3">{esCuentaActual ? <span className="text-[12px] font-medium text-ink-mute">Tu cuenta</span> : <button type="button" disabled={procesandoId === usuario.id_usuario} onClick={() => { clearMessage(); setConfirmar(usuario); }} className={usuario.activo ? btnDanger : btnPrimary}>{procesandoId === usuario.id_usuario ? <Loader size={14} className="animate-spin" /> : usuario.activo ? <UserX size={14} /> : <UserCheck size={14} />}{usuario.activo ? "Inactivar" : "Activar"}</button>}</td></tr>;
        })}</Table>}
      </Section>
      {!loading && visibles.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-6 py-4">
          <span className="text-[12px] text-ink-mute">Página {paginaActual} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button type="button" disabled={paginaActual === 1} onClick={() => setPagina((actual) => Math.max(1, actual - 1))} className={btnSecondary}>Anterior</button>
            <button type="button" disabled={paginaActual === totalPaginas} onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))} className={btnSecondary}>Siguiente</button>
          </div>
        </div>
      )}
      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2331]/60 px-4" role="dialog" aria-modal="true" aria-labelledby="estado-usuario-title">
          <div className="w-full max-w-[440px] bg-surface">
            <div className={`px-6 py-5 ${confirmar.activo ? "bg-danger-wash" : "bg-ok-wash"}`}>
              <h3 id="estado-usuario-title" className={`text-[18px] font-semibold ${confirmar.activo ? "text-danger" : "text-ok"}`}>{confirmar.activo ? "Inactivar usuario" : "Activar usuario"}</h3>
              <p className="mt-2 text-[13px] text-ink-soft">{confirmar.activo ? "La cuenta no podrá usar funciones protegidas aunque conserve una sesión anterior." : "La cuenta recuperará acceso a las funciones protegidas."}</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[13px] text-ink-soft">Vas a {confirmar.activo ? "inactivar" : "activar"} a <strong className="text-ink">{confirmar.nombre}</strong>.</p>
              {error && <p className="mt-4 bg-danger-wash px-3 py-2 text-[13px] text-danger">{error}</p>}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={procesandoId === confirmar.id_usuario} onClick={() => setConfirmar(null)} className={btnSecondary}>Cancelar</button>
                <button type="button" disabled={procesandoId === confirmar.id_usuario} onClick={() => void cambiarEstado(confirmar).then(() => setConfirmar(null)).catch(() => undefined)} className={confirmar.activo ? btnDanger : btnPrimary}>{procesandoId === confirmar.id_usuario ? <Loader size={14} className="animate-spin" /> : confirmar.activo ? <UserX size={14} /> : <UserCheck size={14} />}{confirmar.activo ? "Sí, inactivar" : "Sí, activar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

/* ── Paseos de la plataforma ─────────────────────────────────── */

const paseosPlataforma = [
  { id: "PS-0148", dueno: "Ana Corrales", paseador: "María Fernández", mascota: "Rocky", fecha: "19 ago 16:00", monto: 4500, estado: "En curso" as const },
  { id: "PS-0147", dueno: "Laura Vega", paseador: "Carolina Mora", mascota: "Nube", fecha: "19 ago 09:00", monto: 3800, estado: "Completado" as const },
  { id: "PS-0146", dueno: "Diego Solís", paseador: "Luis Rojas", mascota: "Kira", fecha: "19 ago 11:30", monto: 5200, estado: "Completado" as const },
  { id: "PS-0145", dueno: "Priscilla Ramírez", paseador: "Valeria Chacón", mascota: "Coco", fecha: "18 ago 15:00", monto: 4800, estado: "Incidencia" as const },
  { id: "PS-0144", dueno: "Roberto Jiménez", paseador: "Jorge Salas", mascota: "Max", fecha: "18 ago 08:30", monto: 3900, estado: "Cancelado" as const },
];

const tonoPaseo = (e: (typeof paseosPlataforma)[number]["estado"]) =>
  e === "En curso"
    ? "accent"
    : e === "Completado"
      ? "ok"
      : e === "Incidencia"
        ? "warn"
        : "danger";

export const PaseosAdmin = () => {
  const [filtro, setFiltro] = useState("Todos");

  const visibles = paseosPlataforma.filter((p) =>
    filtro === "Todos"
      ? true
      : filtro === "Incidencias"
        ? p.estado === "Incidencia"
        : p.estado === "En curso"
  );

  return (
    <Page>
      <PageHeader
        title="Paseos"
        subtitle="Actividad de toda la plataforma en tiempo real."
        action={<Badge tono="accent">1 en curso</Badge>}
      />

      <div className="bg-surface">
        <FilterTabs
          label="Filtrar paseos"
          options={["Todos", "En curso", "Incidencias"]}
          value={filtro}
          onChange={setFiltro}
        />
      </div>

      <Section bodyClass="">
        {visibles.length > 0 ? (
          <Table
            caption={`Paseos de la plataforma filtrados por ${filtro.toLowerCase()}`}
            columnas={[
              { label: "Paseo" },
              { label: "Dueño" },
              { label: "Paseador" },
              { label: "Cuándo" },
              { label: "Estado" },
              { label: "Monto", align: "right" },
            ]}
          >
            {visibles.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-3.5">
                  <p className="text-[13px] font-medium text-ink">{p.mascota}</p>
                  <p className="nums text-[11.5px] text-ink-mute">{p.id}</p>
                </td>
                <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">{p.dueno}</td>
                <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">
                  {p.paseador}
                </td>
                <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                  {p.fecha}
                </td>
                <td className="px-6 py-3.5">
                  <Badge tono={tonoPaseo(p.estado)}>{p.estado}</Badge>
                </td>
                <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                  {colones(p.monto)}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="Sin paseos" hint="Cambia el filtro para ver el resto." />
        )}
      </Section>
    </Page>
  );
};
