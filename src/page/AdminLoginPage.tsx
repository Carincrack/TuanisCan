import { useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  BarChart3,
  Loader,
  Lock,
  ShieldCheck,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { MARCA } from "../lib/nav";

/* Acceso interno de la plataforma. No está enlazado desde ninguna
   pantalla pública: se llega escribiendo /acceso-interno.

   Comparte el lenguaje visual del login público — misma tarjeta
   redondeada sobre degradado, mismos campos píldora, mismo botón —
   para que se sienta parte del mismo producto. Lo que cambia es el
   panel de marca: aquí avisa que es un área restringida.

   Credenciales de maqueta: admin / 1234 */

const USUARIO_ADMIN = "admin";
const CLAVE_ADMIN = "1234";

const CAPACIDADES = [
  { Icon: BarChart3, texto: "Métricas y comisión de la plataforma" },
  { Icon: Users, texto: "Gestión de dueños y paseadores" },
  { Icon: Wallet, texto: "Liquidaciones y finanzas" },
];

const AdminLoginPage = ({ onLogin }: { onLogin: () => void }) => {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    await new Promise((r) => setTimeout(r, 700));

    if (usuario.trim() !== USUARIO_ADMIN || clave !== CLAVE_ADMIN) {
      setError("Usuario o contraseña incorrectos");
      setCargando(false);
      return;
    }

    setCargando(false);
    onLogin();
  };

  const inputBase =
    "w-full rounded-full border border-transparent bg-slate-100 py-4 pr-5 pl-14 text-sm text-[#14242E] transition-all duration-200 placeholder:text-slate-400 focus:border-[#14A3B8]/40 focus:bg-slate-50 focus:ring-2 focus:ring-[#14A3B8]/25 focus:outline-none";
  const iconBase =
    "pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-[#14A3B8]";

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center p-4 sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, #4C8CB0 0%, #2E6584 55%, #163C52 100%)",
      }}
    >
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,32,44,0.4)]">
        <div className="flex flex-col md:min-h-[560px] md:flex-row">
          {/* ─── Panel de marca ─── */}
          <div className="flex flex-col justify-center gap-6 bg-gradient-to-br from-[#1D4E6C] to-[#0E2733] px-8 py-12 md:w-[46%] md:px-12">
            <img
              src={MARCA.logoLogin}
              alt={MARCA.completo}
              className="h-24 w-auto self-center object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)] md:h-28"
            />

            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-white/85 uppercase">
                <ShieldCheck size={13} strokeWidth={2.2} />
                Acceso interno
              </span>
              <h2 className="mt-5 text-2xl font-bold text-white">
                Panel de administración
              </h2>
              <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed text-white/70">
                Área restringida al equipo de {MARCA.completo}. Los dueños y
                paseadores no ven esta sección.
              </p>
            </div>

            <ul className="mx-auto flex flex-col gap-3">
              {CAPACIDADES.map(({ Icon, texto }) => (
                <li key={texto} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#14A3B8]/20">
                    <Icon size={15} strokeWidth={1.9} className="text-[#14A3B8]" />
                  </span>
                  <span className="text-[13px] text-white/75">{texto}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ─── Formulario ─── */}
          <div className="flex flex-1 items-center px-8 py-12 md:px-12">
            <div className="mx-auto w-full max-w-[360px]">
              <h1 className="mb-8 text-center text-4xl font-bold text-[#14242E]">
                Iniciar sesión
              </h1>

              <form onSubmit={enviar} className="space-y-4">
                <div className="relative">
                  <label htmlFor="admin-usuario" className="sr-only">
                    Usuario
                  </label>
                  <User className={iconBase} size={18} />
                  <input
                    id="admin-usuario"
                    type="text"
                    autoComplete="username"
                    placeholder="Usuario"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    className={inputBase}
                    required
                  />
                </div>

                <div className="relative">
                  <label htmlFor="admin-clave" className="sr-only">
                    Contraseña
                  </label>
                  <Lock className={iconBase} size={18} />
                  <input
                    id="admin-clave"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Contraseña"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    className={inputBase}
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-center pt-2">
                  <button
                    type="submit"
                    disabled={cargando}
                    className="flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-[#14A3B8] px-10 py-4 text-xs font-semibold tracking-[0.12em] text-white shadow-[0_10px_25px_rgba(20,163,184,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0E8DA1] hover:shadow-[0_14px_30px_rgba(14,141,161,0.5)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cargando ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        <span>VERIFICANDO...</span>
                      </>
                    ) : (
                      "ENTRAR"
                    )}
                  </button>
                </div>
              </form>

              <p className="mt-8 text-center text-xs text-slate-400">
                Maqueta · usuario <span className="text-slate-600">admin</span> ·
                clave <span className="text-slate-600">1234</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
