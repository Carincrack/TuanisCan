import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
   Piezas compartidas. Plano y cuadrado: ningún borde, ninguna
   sombra, ningún degradado. La separación entre bloques la da el
   fondo del canvas asomando entre superficies blancas.
   ───────────────────────────────────────────────────────────── */

/** Bloque de contenido. Blanco sobre el gris de la página. */
export const surface = "bg-surface";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-dark";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 bg-neutral-wash px-4 py-2.5 text-[13px] font-medium text-ink transition-colors duration-150 hover:bg-[#dcdfe2]";

export const btnQuiet =
  "inline-flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors duration-150 hover:bg-sunken hover:text-ink";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 bg-danger-wash px-4 py-2.5 text-[13px] font-semibold text-danger transition-colors duration-150 hover:bg-[#f0d5d5]";

export const input =
  "w-full bg-sunken px-3 py-2.5 text-[13.5px] text-ink transition-colors duration-150 placeholder:text-ink-mute focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-accent";

export const colones = (n: number) => `₡${n.toLocaleString("es-CR")}`;

/* ── Estructura de página ────────────────────────────────────── */

export const Page = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-3">{children}</div>
);

export const PageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) => (
  <header className="flex flex-wrap items-end justify-between gap-4 bg-surface px-6 py-5">
    <div>
      <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      <p className="mt-1 text-[13px] text-ink-soft">{subtitle}</p>
    </div>
    {action}
  </header>
);

/** Bloque blanco con título opcional. */
export const Section = ({
  title,
  aside,
  children,
  bodyClass = "px-6 py-5",
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  bodyClass?: string;
}) => (
  <section className="bg-surface">
    {(title || aside) && (
      <div className="flex items-center justify-between gap-4 px-6 pt-5">
        {title && (
          <h3 className="text-[11px] font-semibold tracking-[0.1em] text-ink-mute uppercase">
            {title}
          </h3>
        )}
        {aside}
      </div>
    )}
    <div className={bodyClass}>{children}</div>
  </section>
);

/* ── Controles ───────────────────────────────────────────────── */

/** Filtros mutuamente excluyentes. El estado vive en el padre. */
export const FilterTabs = ({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) => (
  <div role="group" aria-label={label} className="flex flex-wrap">
    {options.map((o) => (
      <button
        key={o}
        type="button"
        aria-pressed={value === o}
        onClick={() => onChange(o)}
        className={`px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
          value === o
            ? "bg-ink text-white"
            : "bg-sunken text-ink-soft hover:bg-neutral-wash hover:text-ink"
        }`}
      >
        {o}
      </button>
    ))}
  </div>
);

type Tono = "ok" | "warn" | "danger" | "accent" | "neutral";

const tonoClases: Record<Tono, string> = {
  ok: "bg-ok-wash text-ok",
  warn: "bg-warn-wash text-warn",
  danger: "bg-danger-wash text-danger",
  accent: "bg-accent-wash text-accent-dark",
  neutral: "bg-neutral-wash text-ink-soft",
};

export const Badge = ({ tono, children }: { tono: Tono; children: ReactNode }) => (
  <span
    className={`inline-block px-2 py-1 text-[11px] font-semibold tracking-[0.02em] uppercase ${tonoClases[tono]}`}
  >
    {children}
  </span>
);

/** Dato etiquetado. Se usa en las tiras de métricas. */
export const Stat = ({
  etiqueta,
  valor,
  nota,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
}) => (
  <div className="bg-surface px-6 py-5">
    <p className="text-[11px] font-semibold tracking-[0.1em] text-ink-mute uppercase">
      {etiqueta}
    </p>
    <p className="nums mt-2 text-[26px] leading-none font-semibold tracking-[-0.02em] text-ink">
      {valor}
    </p>
    {nota && <p className="mt-1.5 text-[12px] text-ink-soft">{nota}</p>}
  </div>
);

export const EmptyState = ({ title, hint }: { title: string; hint: string }) => (
  <div className="bg-sunken px-6 py-12 text-center">
    <p className="text-[14px] font-semibold text-ink">{title}</p>
    <p className="mt-1 text-[13px] text-ink-soft">{hint}</p>
  </div>
);

/** Tabla administrativa: cabecera hundida y filas cebra, cero líneas. */
export const Table = ({
  columnas,
  children,
  caption,
}: {
  columnas: { label: string; align?: "right" }[];
  children: ReactNode;
  caption: string;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[560px] text-left">
      <caption className="sr-only">{caption}</caption>
      <thead className="bg-sunken">
        <tr>
          {columnas.map((c) => (
            <th
              key={c.label}
              scope="col"
              className={`px-6 py-3 text-[11px] font-semibold tracking-[0.08em] text-ink-mute uppercase ${
                c.align === "right" ? "text-right" : ""
              }`}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="[&>tr:nth-child(even)]:bg-sunken">{children}</tbody>
    </table>
  </div>
);

/* ── Imágenes ficticias ──────────────────────────────────────── */

/** Foto de maqueta. Los archivos viven en public/mock/. */
export const MockPhoto = ({
  src,
  alt,
  className = "aspect-[4/3]",
}: {
  src: string;
  alt: string;
  className?: string;
}) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    className={`w-full bg-sunken object-cover ${className}`}
  />
);

/** Avatar cuadrado con iniciales. Sin foto: es una maqueta. */
export const Avatar = ({
  nombre,
  size = 40,
}: {
  nombre: string;
  size?: number;
}) => {
  const iniciales = nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="flex flex-shrink-0 items-center justify-center bg-ink font-semibold text-white"
    >
      {iniciales}
    </span>
  );
};
