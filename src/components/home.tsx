import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Loader, PawPrint, Siren, Syringe } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { listPets } from "../services/pets.service";
import { listWalksWithRelations, isUpcoming, type WalkWithRelations } from "../services/walks.service";
import { listOwnerPayments, type PaymentMovement } from "../services/payments.service";
import { listLostPetReports } from "../services/lost-pets.service";
import { listResenasDelDueno } from "../services/resenas.service";
import type { Pet } from "../types/pet.types";
import {
  Badge,
  EmptyState,
  MockPhoto,
  Page,
  PageHeader,
  Section,
  Stat,
  Table,
  btnPrimary,
  btnSecondary,
  colones,
} from "./ui";

const accesos = [
  { to: "/paseadores", label: "Buscar paseador", descripcion: "Perfiles verificados de tu zona." },
  { to: "/mascotas", label: "Registrar mascota", descripcion: "Agrega un perfil nuevo." },
  { to: "/mascotas-perdidas", label: "Reportar pérdida", descripcion: "Avisa a la comunidad." },
];

const fechaCorta = (fecha: string) =>
  new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short" }).format(new Date(`${fecha}T00:00:00`));

const esMismoMes = (fecha: string, referencia: Date) => {
  const valor = new Date(`${fecha}T00:00:00`);
  return valor.getMonth() === referencia.getMonth() && valor.getFullYear() === referencia.getFullYear();
};

const esEstaSemana = (fecha: string) => {
  const valor = new Date(`${fecha}T00:00:00`);
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - 6);
  return valor >= inicio;
};

const subtituloHoy = new Intl.DateTimeFormat("es-CR", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

const EmployeeHome = () => {
  const { user, getProfile } = useAuth();
  const [mascotas, setMascotas] = useState<Pet[]>([]);
  const [paseos, setPaseos] = useState<WalkWithRelations[]>([]);
  const [pagos, setPagos] = useState<PaymentMovement[]>([]);
  const [perdidasEnZona, setPerdidasEnZona] = useState(0);
  const [sinCalificar, setSinCalificar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [pets, walks, payments, perdidas, resenas, perfil] = await Promise.all([
        listPets(),
        listWalksWithRelations(user.id),
        listOwnerPayments(),
        listLostPetReports(),
        listResenasDelDueno(user.id),
        getProfile(),
      ]);
      setMascotas(pets);
      setPaseos(walks);
      setPagos(payments);
      setSinCalificar(resenas.pendientes.length);
      const zonaId = perfil?.zona?.id_zona;
      setPerdidasEnZona(
        zonaId ? perdidas.filter((p) => p.estado === "perdida" && p.zona_id === zonaId).length : 0,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar tu panel.");
    } finally {
      setLoading(false);
    }
  }, [user, getProfile]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ahora = new Date();
  const proximos = paseos
    .filter((p) => isUpcoming(p))
    .sort((a, b) => `${a.fecha}${a.hora_inicio}`.localeCompare(`${b.fecha}${b.hora_inicio}`))
    .slice(0, 5);

  const paseosDelMes = paseos.filter((p) => esMismoMes(p.fecha, ahora));
  const paseosEstaSemana = paseos.filter((p) => esEstaSemana(p.fecha));
  const gastoDelMes = pagos
    .filter((p) => p.estado_pago === "pagado" && esMismoMes(p.fecha, ahora))
    .reduce((sum, p) => sum + p.monto, 0);
  const pagosPendientes = pagos.filter((p) => p.estado_pago === "pendiente");

  const mascotasConVacunaPendiente = mascotas.filter((m) =>
    m.vacunas.some((v) => v.estado !== "vigente"),
  );

  const alertas: { icono: typeof Syringe; tono: string; texto: string }[] = [];
  mascotasConVacunaPendiente.slice(0, 2).forEach((m) => {
    const vacuna = m.vacunas
      .filter((v) => v.estado !== "vigente")
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))[0];
    if (vacuna) {
      alertas.push({
        icono: Syringe,
        tono: vacuna.estado === "vencida" ? "text-danger" : "text-warn",
        texto:
          vacuna.estado === "vencida"
            ? `Vacuna ${vacuna.nombre_vacuna} de ${m.nombre} venció el ${fechaCorta(vacuna.fecha_vencimiento)}.`
            : `Vacuna ${vacuna.nombre_vacuna} de ${m.nombre} vence el ${fechaCorta(vacuna.fecha_vencimiento)}.`,
      });
    }
  });
  if (perdidasEnZona > 0) {
    alertas.push({
      icono: Siren,
      tono: "text-danger",
      texto: `${perdidasEnZona} ${perdidasEnZona === 1 ? "mascota reportada" : "mascotas reportadas"} como perdidas en tu zona.`,
    });
  }
  if (sinCalificar > 0) {
    alertas.push({
      icono: PawPrint,
      tono: "text-ink-mute",
      texto: `Tienes ${sinCalificar} ${sinCalificar === 1 ? "paseo sin calificar" : "paseos sin calificar"}.`,
    });
  }

  return (
    <Page>
      <PageHeader
        title="Panel general"
        subtitle={loading ? "Cargando..." : `${subtituloHoy} · resumen de tu cuenta`}
        action={
          <Link to="/paseadores" className={btnPrimary}>
            <CalendarDays size={15} strokeWidth={2} />
            Agendar paseo
          </Link>
        }
      />

      {error && (
        <div role="alert" className="bg-danger-wash px-6 py-4 text-[13px] text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 px-6 py-8 text-[13px] text-ink-soft">
          <Loader size={16} className="animate-spin" /> Cargando tu panel…
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              etiqueta="Mascotas"
              valor={String(mascotas.length)}
              nota={
                mascotasConVacunaPendiente.length
                  ? `${mascotasConVacunaPendiente.length} con vacuna pendiente`
                  : undefined
              }
            />
            <Stat
              etiqueta="Paseos del mes"
              valor={String(paseosDelMes.length)}
              nota={`${paseosEstaSemana.length} esta semana`}
            />
            <Stat etiqueta="Gasto del mes" valor={colones(gastoDelMes)} nota={`${paseosDelMes.filter((p) => p.estado === "finalizado").length} paseos pagados`} />
            <Stat
              etiqueta="Pendiente"
              valor={colones(pagosPendientes.reduce((sum, p) => sum + p.monto, 0))}
              nota={`${pagosPendientes.length} cobro${pagosPendientes.length === 1 ? "" : "s"}`}
            />
          </div>

          <Section
            title="Próximos paseos"
            aside={
              <Link
                to="/paseos"
                className="flex items-center gap-1 text-[12.5px] font-semibold text-accent-dark hover:underline"
              >
                Ver todos
                <ArrowRight size={13} strokeWidth={2.2} aria-hidden />
              </Link>
            }
            bodyClass="pt-4"
          >
            {proximos.length ? (
              <Table
                caption="Paseos programados y en curso"
                columnas={[
                  { label: "Cuándo" },
                  { label: "Mascota" },
                  { label: "Paseador" },
                  { label: "Estado" },
                  { label: "Precio", align: "right" },
                ]}
              >
                {proximos.map((p) => (
                  <tr key={p.id_paseo}>
                    <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                      {fechaCorta(p.fecha)} · {p.hora_inicio.slice(0, 5)}
                    </td>
                    <td className="px-6 py-3.5 text-[13px] font-medium text-ink">
                      {p.mascota?.nombre ?? "Sin nombre"}
                    </td>
                    <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">
                      {p.paseador?.nombre ?? "Sin asignar"}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tono={p.estado === "en_curso" ? "accent" : "ok"}>
                        {p.estado === "en_curso" ? "En curso" : "Programado"}
                      </Badge>
                    </td>
                    <td className="nums px-6 py-3.5 text-right text-[13px] font-semibold text-ink">
                      {colones(p.precio)}
                    </td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState
                title="No tienes paseos programados"
                hint="Busca un paseador de tu zona para agendar el próximo."
              />
            )}
          </Section>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Section
                title="Mis mascotas"
                aside={
                  <Link
                    to="/mascotas"
                    className="flex items-center gap-1 text-[12.5px] font-semibold text-accent-dark hover:underline"
                  >
                    Administrar
                    <ArrowRight size={13} strokeWidth={2.2} aria-hidden />
                  </Link>
                }
                bodyClass="px-6 pt-4 pb-6"
              >
                {mascotas.length ? (
                  <ul className="grid gap-3 sm:grid-cols-3">
                    {mascotas.slice(0, 3).map((m) => {
                      const alDia = !m.vacunas.some((v) => v.estado !== "vigente");
                      return (
                        <li key={m.id_mascota} className="bg-sunken">
                          {m.fotoUrl ? (
                            <MockPhoto src={m.fotoUrl} alt={`Foto de ${m.nombre}`} />
                          ) : (
                            <div className="flex aspect-square items-center justify-center bg-neutral-wash text-[13px] text-ink-mute">
                              Sin foto
                            </div>
                          )}
                          <div className="px-4 py-3">
                            <p className="text-[14px] font-semibold text-ink">{m.nombre}</p>
                            <p className="mt-0.5 text-[12px] text-ink-soft">{m.raza}</p>
                            <span className="mt-2 inline-block">
                              <Badge tono={alDia ? "ok" : "warn"}>
                                {alDia ? "Al día" : "Vacuna pendiente"}
                              </Badge>
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState title="Aún no registras mascotas" hint="Agrega una para poder agendar paseos." />
                )}
              </Section>
            </div>

            <div className="flex flex-col gap-3">
              <Section title="Requiere atención" bodyClass="px-6 pt-4 pb-5">
                {alertas.length ? (
                  <ul className="flex flex-col gap-3">
                    {alertas.map((a, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <a.icono size={15} strokeWidth={1.9} aria-hidden className={`mt-0.5 flex-shrink-0 ${a.tono}`} />
                        <p className="text-[12.5px] leading-snug text-ink-soft">{a.texto}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12.5px] leading-snug text-ink-soft">Todo al día, sin pendientes.</p>
                )}
              </Section>

              <Section title="Accesos rápidos" bodyClass="px-6 pt-4 pb-5">
                <ul className="flex flex-col gap-2">
                  {accesos.map((a) => (
                    <li key={a.to}>
                      <Link to={a.to} className={`${btnSecondary} w-full justify-start`}>
                        <span className="flex flex-col items-start text-left">
                          <span className="text-[13px] font-semibold text-ink">
                            {a.label}
                          </span>
                          <span className="text-[11.5px] font-normal text-ink-soft">
                            {a.descripcion}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>
          </div>
        </>
      )}
    </Page>
  );
};

export default EmployeeHome;
