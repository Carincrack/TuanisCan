import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Star } from "../lib/iconos";
import { getUserProfile } from "../services/auth.service";
import { listarHistorialPaseador, type PaseoHistorialPaseador } from "../services/walker-history.service";
import { useAuth } from "../hooks/useAuth";
import type { UserProfile } from "../types/auth.types";
import { Avatar, EmptyState, Page, PageHeader, Section, Stat, btnSecondary, colones } from "./ui";

const fecha = (valor: string) => new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${valor}T12:00:00`));

const PerfilPaseador = () => {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [historial, setHistorial] = useState<PaseoHistorialPaseador[]>([]);
  const [error, setError] = useState("");
  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      setError("");
      const [datos, paseos] = await Promise.all([getUserProfile(user.id, user.email ?? ""), listarHistorialPaseador()]);
      setPerfil(datos); setHistorial(paseos);
    } catch { setError("No se pudo cargar tu perfil de paseador."); }
  }, [user]);
  useEffect(() => { void cargar(); }, [cargar]);
  const generado = useMemo(() => historial.reduce((total, paseo) => total + paseo.precio, 0), [historial]);
  const paseador = perfil?.paseador;
  return <Page><PageHeader title="Mi perfil" subtitle="Tus datos públicos y las mascotas que ya paseaste." action={<a href="/perfil" className={btnSecondary}>Editar perfil</a>} />{error && <p className="bg-danger-wash px-5 py-3 text-danger">{error}</p>}<Section title="Perfil público" bodyClass="px-6 pb-6"><div className="flex flex-wrap items-center gap-4"><Avatar nombre={perfil?.nombre ?? "Paseador"} size={56} /><div className="min-w-[180px] flex-1"><h2 className="text-[18px] font-semibold text-ink">{perfil?.nombre ?? "Cargando…"}</h2><p className="mt-1 text-[13px] text-ink-soft">{paseador?.descripcion || "Agrega una descripción desde Editar perfil."}</p><p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-soft"><MapPin size={13} />{perfil?.zona?.nombre ?? "Sin zona asignada"}</p></div><div className="flex items-center gap-1 text-[14px] font-semibold text-ink"><Star size={15} className="fill-warn text-warn" />{paseador?.calificacion_promedio?.toFixed(1) ?? "0.0"}</div></div></Section><div className="grid gap-3 sm:grid-cols-3"><Stat etiqueta="Paseos finalizados" valor={String(historial.length)} /><Stat etiqueta="Mascotas paseadas" valor={String(new Set(historial.map((paseo) => paseo.mascota)).size)} /><Stat etiqueta="Generado" valor={colones(generado)} /></div><Section title="Historial de mascotas paseadas" bodyClass="px-6 pb-6">{historial.length === 0 ? <EmptyState title="Aún no has finalizado paseos" hint="Cuando completes un paseo, la mascota aparecerá aquí." /> : <div className="grid gap-3 sm:grid-cols-2">{historial.map((paseo) => <article key={paseo.id_paseo} className="flex items-center gap-3 bg-sunken p-4"><Avatar nombre={paseo.mascota} size={42} /><div className="min-w-0 flex-1"><h3 className="truncate text-[14px] font-semibold text-ink">{paseo.mascota}</h3><p className="mt-0.5 text-[12px] text-ink-soft">Dueño: {paseo.dueno} · {paseo.zona}</p><p className="mt-1 text-[11.5px] text-ink-mute">{fecha(paseo.fecha)} · {paseo.duracion_min} min</p></div></article>)}</div>}</Section></Page>;
};

export default PerfilPaseador;
