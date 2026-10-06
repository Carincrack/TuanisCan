import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Loader, PawPrint, Siren, Syringe } from "../lib/iconos";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "../hooks/useTranslation";
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

const EmployeeHome = () => {
  const { user, getProfile } = useAuth();
  const { t, localeTag } = useTranslation();
  const [mascotas, setMascotas] = useState<Pet[]>([]);
  const [paseos, setPaseos] = useState<WalkWithRelations[]>([]);
  const [pagos, setPagos] = useState<PaymentMovement[]>([]);
  const [perdidasEnZona, setPerdidasEnZona] = useState(0);
  const [sinCalificar, setSinCalificar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fechaCorta = (fecha: string) =>
    new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short" }).format(new Date(`${fecha}T00:00:00`));

  const accesos = [
    { to: "/paseadores", label: t("home.quickAccess.walkers.label"), descripcion: t("home.quickAccess.walkers.descripcion") },
    { to: "/mascotas", label: t("home.quickAccess.registerPet.label"), descripcion: t("home.quickAccess.registerPet.descripcion") },
    { to: "/mascotas-perdidas", label: t("home.quickAccess.reportLost.label"), descripcion: t("home.quickAccess.reportLost.descripcion") },
  ];

  const subtituloHoy = new Intl.DateTimeFormat(localeTag, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

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
      setError(cause instanceof Error ? cause.message : t("home.loadError"));
    } finally {
      setLoading(false);
    }
  }, [user, getProfile, t]);

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
        texto: t(
          vacuna.estado === "vencida" ? "home.alerts.vaccineExpired" : "home.alerts.vaccineExpiring",
          { vacuna: vacuna.nombre_vacuna, mascota: m.nombre, fecha: fechaCorta(vacuna.fecha_vencimiento) },
        ),
      });
    }
  });
  if (perdidasEnZona > 0) {
    alertas.push({
      icono: Siren,
      tono: "text-danger",
      texto: t(perdidasEnZona === 1 ? "home.alerts.lostPetsSingular" : "home.alerts.lostPetsPlural", { count: perdidasEnZona }),
    });
  }
  if (sinCalificar > 0) {
    alertas.push({
      icono: PawPrint,
      tono: "text-ink-mute",
      texto: t(sinCalificar === 1 ? "home.alerts.unratedSingular" : "home.alerts.unratedPlural", { count: sinCalificar }),
    });
  }

  return (
    <Page>
      <PageHeader
        title={t("home.title")}
        subtitle={loading ? t("home.loading") : t("home.subtitleSummary", { fecha: subtituloHoy })}
        action={
          <Link to="/paseadores" className={btnPrimary}>
            <CalendarDays size={15} strokeWidth={2} />
            {t("home.scheduleWalk")}
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
          <Loader size={16} className="animate-spin" /> {t("home.loadingPanel")}
        </div>
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              etiqueta={t("home.stats.pets")}
              valor={String(mascotas.length)}
              nota={
                mascotasConVacunaPendiente.length
                  ? t("home.stats.petsPendingVaccine", { count: mascotasConVacunaPendiente.length })
                  : undefined
              }
            />
            <Stat
              etiqueta={t("home.stats.walksThisMonth")}
              valor={String(paseosDelMes.length)}
              nota={t("home.stats.walksThisWeek", { count: paseosEstaSemana.length })}
            />
            <Stat etiqueta={t("home.stats.monthSpend")} valor={colones(gastoDelMes)} nota={t("home.stats.paidWalks", { count: paseosDelMes.filter((p) => p.estado === "finalizado").length })} />
            <Stat
              etiqueta={t("home.stats.pending")}
              valor={colones(pagosPendientes.reduce((sum, p) => sum + p.monto, 0))}
              nota={`${pagosPendientes.length} ${pagosPendientes.length === 1 ? t("home.stats.chargeSingular") : t("home.stats.chargePlural")}`}
            />
          </div>

          <Section
            title={t("home.upcomingWalks.title")}
            aside={
              <Link
                to="/paseos"
                className="flex items-center gap-1 text-[12.5px] font-semibold text-accent-dark hover:underline"
              >
                {t("home.upcomingWalks.viewAll")}
                <ArrowRight size={13} strokeWidth={2.2} aria-hidden />
              </Link>
            }
            bodyClass="pt-4"
          >
            {proximos.length ? (
              <Table
                caption={t("home.upcomingWalks.caption")}
                columnas={[
                  { label: t("home.upcomingWalks.columns.when") },
                  { label: t("home.upcomingWalks.columns.pet") },
                  { label: t("home.upcomingWalks.columns.walker") },
                  { label: t("home.upcomingWalks.columns.status") },
                  { label: t("home.upcomingWalks.columns.price"), align: "right" },
                ]}
              >
                {proximos.map((p) => (
                  <tr key={p.id_paseo}>
                    <td className="nums px-6 py-3.5 text-[12.5px] text-ink-soft">
                      {fechaCorta(p.fecha)} · {p.hora_inicio.slice(0, 5)}
                    </td>
                    <td className="px-6 py-3.5 text-[13px] font-medium text-ink">
                      {p.mascota?.nombre ?? t("home.upcomingWalks.noPetName")}
                    </td>
                    <td className="px-6 py-3.5 text-[12.5px] text-ink-soft">
                      {p.paseador?.nombre ?? t("home.upcomingWalks.unassigned")}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge tono={p.estado === "en_curso" ? "accent" : "ok"}>
                        {p.estado === "en_curso" ? t("home.upcomingWalks.statusInCourse") : t("home.upcomingWalks.statusScheduled")}
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
                title={t("home.upcomingWalks.empty.title")}
                hint={t("home.upcomingWalks.empty.hint")}
              />
            )}
          </Section>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Section
                title={t("home.myPets.title")}
                aside={
                  <Link
                    to="/mascotas"
                    className="flex items-center gap-1 text-[12.5px] font-semibold text-accent-dark hover:underline"
                  >
                    {t("home.myPets.manage")}
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
                            <MockPhoto src={m.fotoUrl} alt={t("common.photoOf", { nombre: m.nombre })} />
                          ) : (
                            <div className="flex aspect-square items-center justify-center bg-neutral-wash text-[13px] text-ink-mute">
                              {t("home.myPets.noPhoto")}
                            </div>
                          )}
                          <div className="px-4 py-3">
                            <p className="text-[14px] font-semibold text-ink">{m.nombre}</p>
                            <p className="mt-0.5 text-[12px] text-ink-soft">{m.raza}</p>
                            <span className="mt-2 inline-block">
                              <Badge tono={alDia ? "ok" : "warn"}>
                                {alDia ? t("home.myPets.upToDate") : t("home.myPets.pendingVaccine")}
                              </Badge>
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState title={t("home.myPets.empty.title")} hint={t("home.myPets.empty.hint")} />
                )}
              </Section>
            </div>

            <div className="flex flex-col gap-3">
              <Section title={t("home.alerts.title")} bodyClass="px-6 pt-4 pb-5">
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
                  <p className="text-[12.5px] leading-snug text-ink-soft">{t("home.alerts.none")}</p>
                )}
              </Section>

              <Section title={t("home.quickAccessTitle")} bodyClass="px-6 pt-4 pb-5">
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
