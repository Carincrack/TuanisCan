import {
  MetricasMaqueta,
  TablaMaqueta,
  Varios,
  frase,
  nombre,
  zona,
} from "./piezas";

/* ─────────────────────────────────────────────────────────────
   UNA MAQUETA POR PANTALLA

   Cada una repite la estructura de su tarjeta real: las mismas
   clases, los mismos radios, la misma rejilla. Lo que boneyard
   fotografía es esto, así que cualquier diferencia acá sale después
   como un hueso descolocado.

   Todas cargan LLENAS —seis tarjetas, ocho filas— aunque los datos
   reales traigan una. Es el pedido, y tiene sentido: una rejilla que
   carga con seis huecos y termina con una tarjeta dice "viene más";
   una que carga con uno y termina con uno parece una pantalla vacía
   mostrada dos veces.
   ───────────────────────────────────────────────────────────── */

/* ══ Rejilla de paseadores ═══════════════════════════════════════ */

export const MaquetaPaseadores = () => (
  <div className="flex flex-col gap-2.5">

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Varios cuantos={6}>
        {(i) => (
          <article key={i} className="flex flex-col bg-surface px-5 py-5">
            <div className="flex items-start gap-3.5">
              <span className="h-[52px] w-[52px] shrink-0 rounded-full bg-sunken" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold text-ink">{nombre(i)}</h3>
                <div className="nums mt-1 text-[12.5px] text-ink-soft">4.8 (12) · 86 paseos</div>
                <span className="mt-2 inline-flex rounded-full bg-sunken px-2.5 py-1 text-[11.5px] font-medium text-ink-soft">
                  {zona(i)}
                </span>
              </div>
            </div>

            <p className="mt-4 min-h-[34px] text-[12.5px] leading-snug text-ink-soft">{frase(1)}</p>

            <div className="mt-4 flex items-center justify-between rounded-[14px] bg-sunken px-4 py-3">
              <div>
                <p className="nums text-[17px] leading-none font-semibold text-ink">₡4.500</p>
                <p className="mt-1 text-[11px] text-ink-mute">por paseo</p>
              </div>
              <span className="text-[12px] font-medium text-ink">Disponible</span>
            </div>

            <div className="mt-auto flex gap-2 pt-4">
              <span className="flex-1 rounded-full bg-sunken px-5 py-2.5 text-center text-[13px] font-medium text-ink">
                Ver perfil
              </span>
              <span className="flex-1 rounded-full bg-rail px-5 py-2.5 text-center text-[13px] font-semibold text-white">
                Solicitar
              </span>
            </div>
          </article>
        )}
      </Varios>
    </div>
  </div>
);

/* ══ Rejilla de mascotas perdidas ════════════════════════════════ */

export const MaquetaPerdidas = () => (
  <div className="flex flex-col gap-2.5">

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Varios cuantos={6}>
        {(i) => (
          <article key={i} className="flex flex-col overflow-hidden bg-surface">
            <div className="relative">
              <div className="aspect-[16/10] w-full bg-sunken" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="truncate text-[17px] font-semibold text-ink">{nombre(i)}</h3>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">Perro · Zaguate</p>
              </div>
            </div>

            <div className="flex flex-1 flex-col px-5 py-4">
              <dl className="flex flex-col gap-1 text-[12.5px] text-ink-soft">
                <div>Visto en {zona(i)}</div>
                <div className="nums">1 sept, 12:30 a. m.</div>
                <div className="nums">+506 8888 8888</div>
              </dl>

              <p className="mt-3 text-[12.5px] leading-relaxed text-ink">{frase(0)}</p>

              <div className="mt-3 rounded-[14px] bg-sunken px-3 py-2.5 text-[12px] text-ink-soft">
                <p className="font-semibold text-ink">2 avistamientos</p>
                <p className="mt-1">Último: Barrio Escalante · 1 sept, 09:15 a. m.</p>
              </div>

              <div className="mt-auto grid gap-2 pt-3.5">
                <span className="rounded-full bg-rail px-5 py-2.5 text-center text-[13px] font-semibold text-white">
                  Vi a esta mascota
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <span className="rounded-full bg-sunken px-3 py-2 text-center text-[12px] font-medium text-ink">
                    Ubicación
                  </span>
                  <span className="rounded-full bg-sunken px-3 py-2 text-center text-[12px] font-medium text-ink">
                    Ya apareció
                  </span>
                </div>
              </div>
            </div>
          </article>
        )}
      </Varios>
    </div>
  </div>
);

/* ══ Rejilla de mis mascotas ═════════════════════════════════════ */

export const MaquetaMascotas = () => (
  <div className="flex flex-col gap-2.5">

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Varios cuantos={6}>
        {(i) => (
          <article key={i} className="flex flex-col bg-surface">
            <div className="aspect-[4/3] w-full bg-sunken" />
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-[16px] font-semibold text-ink">{nombre(i)}</h3>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">Perro · Zaguate · 3 años</p>
              <dl className="mt-4 grid grid-cols-2 gap-2.5">
                <Varios cuantos={4}>
                  {(d) => (
                    <div key={d} className="rounded-[14px] bg-sunken px-4 py-3">
                      <dt className="rotulo text-ink-mute">Dato</dt>
                      <dd className="nums mt-1 text-[13px] text-ink">12,4 kg</dd>
                    </div>
                  )}
                </Varios>
              </dl>
              <div className="mt-auto flex gap-2 pt-4">
                <span className="flex-1 rounded-full bg-sunken px-5 py-2.5 text-center text-[13px] font-medium text-ink">
                  Carné
                </span>
                <span className="flex-1 rounded-full bg-rail px-5 py-2.5 text-center text-[13px] font-semibold text-white">
                  Editar
                </span>
              </div>
            </div>
          </article>
        )}
      </Varios>
    </div>
  </div>
);

/* ══ Directorio de negocios ══════════════════════════════════════ */

export const MaquetaDirectorio = () => (
  <div className="flex flex-col gap-2.5">

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Varios cuantos={6}>
        {(i) => (
          <article key={i} className="flex flex-col bg-surface px-5 py-5">
            <div className="flex items-start gap-3.5">
              <span className="h-11 w-11 shrink-0 rounded-full bg-sunken" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold text-ink">Veterinaria Central</h3>
                <p className="mt-1 text-[12.5px] text-ink-soft">{zona(i)}</p>
              </div>
            </div>
            <p className="mt-4 min-h-[34px] text-[12.5px] leading-snug text-ink-soft">{frase(2)}</p>
            <div className="mt-4 rounded-[14px] bg-sunken px-4 py-3 text-[12.5px] text-ink-soft">
              Lunes a sábado · 8:00 a 18:00
            </div>
            <div className="mt-auto flex gap-2 pt-4">
              <span className="flex-1 rounded-full bg-sunken px-5 py-2.5 text-center text-[13px] font-medium text-ink">
                Ver en el mapa
              </span>
            </div>
          </article>
        )}
      </Varios>
    </div>
  </div>
);

/* ══ Carné digital ═══════════════════════════════════════════════ */

export const MaquetaCarnet = () => (
  <div className="flex flex-col gap-2.5">

    <div className="flex flex-wrap items-center gap-3 bg-surface px-5 py-4">
      <p className="rotulo text-ink-mute">Mascota</p>
      <div className="w-full max-w-[260px] rounded-[14px] bg-sunken px-4 py-2.5 text-[13.5px] text-ink-mute">
        Elegí una mascota
      </div>
    </div>

    <article className="overflow-hidden rounded-[18px] bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-rail px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="h-8 w-8 rounded-full bg-rail-hover" />
          <div>
            <p className="text-[13px] font-semibold text-white">TuanisCan</p>
            <p className="rotulo text-rail-mute">Carné de identificación y salud</p>
          </div>
        </div>
        <span className="nums rounded-full bg-rail-hover px-3 py-1.5 text-[11.5px] text-rail-text">
          TSC-00000000-OSO
        </span>
      </header>

      <div className="flex flex-col gap-5 p-6 sm:flex-row">
        <div className="flex flex-shrink-0 flex-col gap-3 sm:w-[196px]">
          <div className="aspect-[3/4] w-full rounded-[14px] bg-sunken" />
          <div className="rounded-[14px] bg-sunken px-4 py-3 text-[11px] leading-snug text-ink-soft">
            Carné emitido por TuanisCan para la cuenta del responsable.
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="titular text-[26px] text-ink">Oso</h3>
          <p className="mt-1 text-[13px] text-ink-soft">Perro · Zaguate</p>

          <Varios cuantos={2}>
            {(g) => (
              <section key={g} className="mt-5">
                <h4 className="rotulo mb-2 text-ink-mute">Grupo de datos</h4>
                <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <Varios cuantos={6}>
                    {(d) => (
                      <div key={d} className="rounded-[14px] bg-sunken px-4 py-3">
                        <dt className="rotulo text-ink-mute">Etiqueta</dt>
                        <dd className="nums mt-1 text-[13px] text-ink">Valor</dd>
                      </div>
                    )}
                  </Varios>
                </dl>
              </section>
            )}
          </Varios>
        </div>
      </div>

      <div className="px-6 pb-6">
        <h4 className="rotulo pb-3 text-ink-mute">Historial de vacunación</h4>
        <TablaMaqueta columnas={4} filas={4} />
      </div>
    </article>
  </div>
);

/* ══ Lista ancha: verificaciones y solicitudes ═══════════════════ */

const TarjetaAncha = ({ i, conFoto }: { i: number; conFoto: boolean }) => (
  <article className="bg-surface px-6 py-5">
    <div className="flex flex-wrap items-start gap-5">
      <span
        className={`shrink-0 bg-sunken ${conFoto ? "h-28 w-28 rounded-[14px]" : "h-16 w-16 rounded-full"}`}
      />
      <div className="min-w-[220px] flex-1">
        <h3 className="text-[15px] font-semibold text-ink">{nombre(i)}</h3>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">correo@ejemplo.com · {zona(i)}</p>
        <p className="mt-1 text-[11.5px] text-ink-mute">Dueño + Paseador · enviado 1 sept, 12:30</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Varios cuantos={3}>
            {(b) => (
              <span
                key={b}
                className="rounded-full bg-sunken px-5 py-2.5 text-[13px] font-medium text-ink"
              >
                Documento
              </span>
            )}
          </Varios>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-rail px-5 py-2.5 text-[13px] font-semibold text-white">
          Aprobar perfil
        </span>
        <span className="rounded-full bg-danger-wash px-5 py-2.5 text-[13px] font-semibold text-danger">
          Rechazar
        </span>
      </div>
    </div>
  </article>
);

export const MaquetaVerificaciones = () => (
  <div className="flex flex-col gap-2.5">
    <Varios cuantos={4}>{(i) => <TarjetaAncha key={i} i={i} conFoto={false} />}</Varios>
  </div>
);

export const MaquetaSolicitudes = () => (
  <div className="flex flex-col gap-2.5">
    <Varios cuantos={4}>{(i) => <TarjetaAncha key={i} i={i} conFoto />}</Varios>
  </div>
);

/* ══ Paneles con métricas ════════════════════════════════════════ */

export const MaquetaPanel = () => (
  <div className="flex flex-col gap-2.5">
    <MetricasMaqueta cuantas={3} />
    <div className="bg-surface px-6 py-5">
      <h3 className="rotulo text-ink-mute">Sección</h3>
      <div className="mt-4 h-[180px] w-full rounded-[14px] bg-sunken" />
    </div>
    <div className="grid gap-2.5 sm:grid-cols-2">
      <Varios cuantos={2}>
        {(i) => (
          <div key={i} className="bg-surface px-6 py-5">
            <h3 className="rotulo text-ink-mute">Bloque</h3>
            <div className="mt-4 flex flex-col gap-2.5">
              <Varios cuantos={4}>
                {(f) => (
                  <div key={f} className="rounded-[14px] bg-sunken px-4 py-3">
                    <p className="text-[13px] font-medium text-ink">{nombre(f)}</p>
                    <p className="mt-1 text-[12px] text-ink-soft">Detalle de la fila</p>
                  </div>
                )}
              </Varios>
            </div>
          </div>
        )}
      </Varios>
    </div>
  </div>
);

/* ══ Pantallas de tabla: usuarios, zonas, paseos ═════════════════ */

export const MaquetaTabla = () => (
  <div className="flex flex-col gap-2.5">
    <MetricasMaqueta cuantas={3} />
    <TablaMaqueta columnas={6} filas={8} />
  </div>
);

/* ══ Lista de paseos ═════════════════════════════════════════════ */

export const MaquetaPaseos = () => (
  <div className="flex flex-col gap-2.5">
    <div className="flex flex-col gap-2.5">
      <Varios cuantos={5}>
        {(i) => (
          <article key={i} className="flex flex-wrap items-center gap-4 bg-surface px-6 py-4">
            <span className="h-12 w-12 shrink-0 rounded-full bg-sunken" />
            <div className="min-w-[180px] flex-1">
              <p className="text-[14px] font-semibold text-ink">{nombre(i)}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">{zona(i)} · 45 minutos</p>
            </div>
            <div className="nums text-[15px] font-semibold text-ink">₡4.500</div>
            <span className="rounded-full bg-ok-wash px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-ok uppercase">
              Confirmado
            </span>
          </article>
        )}
      </Varios>
    </div>
  </div>
);

/* ══ Mi perfil ═══════════════════════════════════════════════════

   Esta pantalla no usa el lenguaje llano del resto: tiene su propia
    con radio de 16, un borde muy tenue y sombra doble.
   La maqueta lo copia tal cual, porque de ahí salen los bordes de los
   huesos. */

const TARJETA_PERFIL =
  "overflow-hidden rounded-2xl border border-black/[0.06] bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03),0_10px_35px_rgb(0_0_0/0.025)]";

export const MaquetaPerfil = () => (
  <div className="flex flex-col gap-2.5">
    {/* La cabecera de identidad, con su degradado */}
    <div className={TARJETA_PERFIL}>
      <div className="border-b border-black/[0.05] bg-gradient-to-br from-accent/[0.09] via-surface to-accent/[0.025] px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="h-28 w-28 shrink-0 rounded-full bg-sunken" />
          <div className="min-w-0 flex-1">
            <h3 className="titular text-[22px] text-ink">María Fernández</h3>
            <p className="mt-1 text-[13px] text-ink-soft">correo@ejemplo.com</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Varios cuantos={3}>
                {(i) => (
                  <span
                    key={i}
                    className="rounded-full bg-sunken px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] text-ink-soft uppercase"
                  >
                    Perfil
                  </span>
                )}
              </Varios>
            </div>
            <p className="mt-3 text-[12px] text-ink-mute">
              Tocá la foto para verla · la cámara la cambia · JPG, PNG o WebP.
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* La tira de pestañas */}
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-sunken p-1">
      <Varios cuantos={3}>
        {(i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium ${
              i === 0 ? "bg-rail text-white" : "text-ink-soft"
            }`}
          >
            Sección
          </span>
        )}
      </Varios>
    </div>

    {/* El panel de datos personales */}
    <div className={TARJETA_PERFIL}>
      <div className="p-5 sm:p-7">
        <div className="mb-6">
          <h3 className="text-[15px] font-semibold text-ink">Información personal</h3>
          <p className="mt-1 text-[12px] text-ink-mute">
            Estos datos se comparten entre todos los perfiles asociados a la cuenta.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Varios cuantos={6}>
            {(i) => (
              <div key={i}>
                <p className="rotulo text-ink-mute">Etiqueta del campo</p>
                <div className="mt-2 w-full rounded-xl border border-black/[0.07] bg-sunken px-4 py-2.5 text-[13.5px] text-ink-mute">
                  Valor guardado
                </div>
              </div>
            )}
          </Varios>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <span className="rounded-full bg-sunken px-5 py-2.5 text-center text-[13px] font-medium text-ink">
            Descartar
          </span>
          <span className="rounded-full bg-rail px-5 py-2.5 text-center text-[13px] font-semibold text-white">
            Guardar cambios
          </span>
        </div>
      </div>
    </div>
  </div>
);

