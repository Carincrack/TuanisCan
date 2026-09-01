import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, Loader } from "../lib/iconos";
import { MARCA } from "../lib/nav";
import { useAuth } from "../hooks/useAuth";

const UpdatePasswordPage = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      navigate({ to: "/" });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-8" style={{ background: "linear-gradient(135deg, #4C8CB0 0%, #2E6584 55%, #163C52 100%)" }}>
      <div className="w-full max-w-md rounded-[28px] bg-white px-8 py-12 shadow-[0_30px_80px_rgba(15,32,44,0.4)] md:px-12">
        <div className="mb-8 flex justify-center"><img src={MARCA.logoLogin} alt={MARCA.completo} className="h-28 w-auto object-contain" /></div>
        <h1 className="text-center text-3xl font-bold text-[#1E2A33]">Nueva contraseña</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-500">Define una contraseña nueva para proteger tu cuenta.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {[{ value: password, set: setPassword, placeholder: "Nueva contraseña" }, { value: confirmation, set: setConfirmation, placeholder: "Confirmar contraseña" }].map((field) => (
            <div className="relative" key={field.placeholder}>
              <Lock className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#14A3B8]" size={18} />
              <input type={visible ? "text" : "password"} required minLength={6} placeholder={field.placeholder} value={field.value} onChange={(event) => field.set(event.target.value)} className="w-full rounded-full border border-transparent bg-slate-100 py-4 pl-14 pr-14 text-sm text-[#1E2A33] placeholder:text-slate-400 focus:border-[#14A3B8]/40 focus:outline-none focus:ring-2 focus:ring-[#14A3B8]/25" />
              {field.placeholder === "Nueva contraseña" && <button type="button" onClick={() => setVisible(!visible)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#14A3B8]" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
            </div>
          ))}
          {error && <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"><AlertCircle size={16} /><span>{error}</span></div>}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#14A3B8] px-10 py-4 text-xs font-semibold tracking-[0.12em] text-white shadow-[0_10px_25px_rgba(20,163,184,0.4)] transition-all hover:bg-[#0E8DA1] disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><Loader className="animate-spin" size={16} /> GUARDANDO...</> : "CAMBIAR CONTRASEÑA"}</button>
        </form>
        <button type="button" onClick={() => navigate({ to: "/" })} className="mx-auto mt-8 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 hover:text-[#14A3B8]"><ArrowLeft size={15} /> VOLVER AL LOGIN</button>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;