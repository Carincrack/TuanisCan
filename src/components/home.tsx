import React from "react";
import {
  Users,
  Footprints,
  Siren,
  Wallet,
  Star,
  TrendingUp,
  MapPin,
  Clock,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const revenueData = [
  { mes: "Mar", ingresos: 1240000 },
  { mes: "Abr", ingresos: 1380000 },
  { mes: "May", ingresos: 1510000 },
  { mes: "Jun", ingresos: 1470000 },
  { mes: "Jul", ingresos: 1690000 },
  { mes: "Ago", ingresos: 1820000 },
];

const walksData = [
  { semana: "Sem 1", paseos: 142 },
  { semana: "Sem 2", paseos: 168 },
  { semana: "Sem 3", paseos: 155 },
  { semana: "Sem 4", paseos: 191 },
];

const lostPetAlerts = [
  { nombre: "Rocky", tipo: "Perro · Labrador", zona: "Escazú, San José", tiempo: "hace 25 min", estado: "activo" },
  { nombre: "Michi", tipo: "Gato · Siamés", zona: "Heredia Centro", tiempo: "hace 2 h", estado: "activo" },
  { nombre: "Toby", tipo: "Perro · Poodle", zona: "San Pedro, Montes de Oca", tiempo: "hace 5 h", estado: "encontrado" },
];

const topWalkers = [
  { nombre: "María Fernández", zona: "Curridabat", calificacion: 4.9, paseos: 214 },
  { nombre: "Luis Rojas", zona: "Heredia", calificacion: 4.8, paseos: 187 },
  { nombre: "Kimberly Solano", zona: "Escazú", calificacion: 4.8, paseos: 176 },
  { nombre: "Andrés Chaves", zona: "Cartago", calificacion: 4.7, paseos: 159 },
];

const recentPayments = [
  { usuario: "Gabriela Ureña", concepto: "Paseo · 45 min", monto: "₡4,500", estado: "Pagado" },
  { usuario: "Diego Salas", concepto: "Suscripción premium", monto: "₡9,900", estado: "Pagado" },
  { usuario: "Paola Jiménez", concepto: "Paseo · 30 min", monto: "₡3,200", estado: "Pendiente" },
  { usuario: "Esteban Vargas", concepto: "Comisión plataforma", monto: "₡1,150", estado: "Pagado" },
];

const currency = (n: number): string => `₡${n.toLocaleString("es-CR")}`;

function KpiCard({ icon: Icon, label, value, delta, positive }: { icon: React.ElementType; label: string; value: string | number; delta: string; positive: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
        <span
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            positive ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"
          }`}
        >
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {delta}
        </span>
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-teal-600 font-medium">Buenas noches 🌙</p>
            <h1 className="text-2xl font-semibold text-slate-900">Panel general — Administrador</h1>
            <p className="text-sm text-slate-500 mt-1">Lunes 11 de agosto, 2026 · Resumen de la plataforma</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Bell className="w-5 h-5 text-slate-500" />
            </button>
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl pl-3 pr-4 py-2">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-sm font-semibold">
                JB
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium text-slate-900">José Baltodano</p>
                <p className="text-xs text-slate-500">Administrador</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users} label="Usuarios activos" value="8,412" delta="+6.2%" positive />
          <KpiCard icon={Footprints} label="Paseadores verificados" value="612" delta="+3.1%" positive />
          <KpiCard icon={Siren} label="Alertas de mascotas perdidas" value="18 activas" delta="+2" positive={false} />
          <KpiCard icon={Wallet} label="Ingresos del mes" value={currency(1820000)} delta="+8.4%" positive />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-900">Ingresos últimos 6 meses</h2>
                <p className="text-sm text-slate-500">Comisiones + suscripciones + publicidad</p>
              </div>
              <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                <TrendingUp className="w-4 h-4" /> Tendencia positiva
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₡${v / 1000}k`}
                />
                <Tooltip formatter={(v) => currency(typeof v === 'number' ? v : 0)} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="ingresos" stroke="#0d9488" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-1">Paseos por semana</h2>
            <p className="text-sm text-slate-500 mb-4">Últimas 4 semanas</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={walksData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="paseos" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts + Top walkers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Mascotas perdidas — recientes</h2>
              <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-1 rounded-full">2 activas</span>
            </div>
            <div className="space-y-3">
              {lostPetAlerts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Siren className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.nombre} · {p.tipo}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {p.zona} · <Clock className="w-3 h-3" /> {p.tiempo}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                      p.estado === "activo" ? "text-red-600 bg-red-100" : "text-emerald-600 bg-emerald-100"
                    }`}
                  >
                    {p.estado === "activo" ? "Activo" : "Encontrado"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">Paseadores mejor calificados</h2>
            <div className="space-y-3">
              {topWalkers.map((w, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-semibold flex-shrink-0">
                      {w.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                        {w.nombre}
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                      </p>
                      <p className="text-xs text-slate-500">{w.zona} · {w.paseos} paseos</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-slate-900">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {w.calificacion}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payments table */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Últimos pagos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="pb-3 font-medium">Usuario</th>
                  <th className="pb-3 font-medium">Concepto</th>
                  <th className="pb-3 font-medium">Monto</th>
                  <th className="pb-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 text-slate-900 font-medium">{row.usuario}</td>
                    <td className="py-3 text-slate-500">{row.concepto}</td>
                    <td className="py-3 text-slate-900">{row.monto}</td>
                    <td className="py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          row.estado === "Pagado" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                        }`}
                      >
                        {row.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}