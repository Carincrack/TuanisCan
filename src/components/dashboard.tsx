import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { BookOpen, Users, TrendingUp, Calendar, Search, Bell, Settings } from "lucide-react";

// Interfaces para TypeScript
interface StatData {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  color: string;
}

interface LoanData {
  name: string;
  prestamos: number;
  devoluciones: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface WeeklyActivity {
  day: string;
  visitas: number;
}

interface PopularBook {
  title: string;
  author: string;
  loans: number;
}

// Componente Card personalizado
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`p-6 pb-4 ${className}`}>
    {children}
  </div>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h3>
);

const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <p className={`text-sm text-slate-600 mt-1 ${className}`}>
    {children}
  </p>
);

// Componente Badge personalizado
const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);



// Datos de ejemplo
const statsData: StatData[] = [
  { title: "Total de Libros", value: "2,847", change: "+12%", icon: BookOpen, color: "text-emerald-600" },
  { title: "Usuarios Activos", value: "1,234", change: "+8%", icon: Users, color: "text-blue-600" },
  { title: "Préstamos del Mes", value: "456", change: "+23%", icon: TrendingUp, color: "text-purple-600" },
  { title: "Eventos Programados", value: "12", change: "+3%", icon: Calendar, color: "text-orange-600" },
];

const loanData: LoanData[] = [
  { name: "Lun", prestamos: 45, devoluciones: 38 },
  { name: "Mar", prestamos: 52, devoluciones: 41 },
  { name: "Mié", prestamos: 48, devoluciones: 45 },
  { name: "Jue", prestamos: 61, devoluciones: 52 },
  { name: "Vie", prestamos: 55, devoluciones: 48 },
  { name: "Sáb", prestamos: 67, devoluciones: 58 },
  { name: "Dom", prestamos: 43, devoluciones: 39 },
];

const categoryData: CategoryData[] = [
  { name: "Ficción", value: 35, color: "#10b981" },
  { name: "Ciencia", value: 25, color: "#3b82f6" },
  { name: "Historia", value: 20, color: "#8b5cf6" },
  { name: "Arte", value: 12, color: "#f59e0b" },
  { name: "Otros", value: 8, color: "#ef4444" },
];

const weeklyActivity: WeeklyActivity[] = [
  { day: "L", visitas: 120 },
  { day: "M", visitas: 145 },
  { day: "X", visitas: 132 },
  { day: "J", visitas: 168 },
  { day: "V", visitas: 155 },
  { day: "S", visitas: 189 },
  { day: "D", visitas: 98 },
];

const popularBooks: PopularBook[] = [
  { title: "El Quijote", author: "Cervantes", loans: 45 },
  { title: "Cien Años de Soledad", author: "García Márquez", loans: 38 },
  { title: "1984", author: "George Orwell", loans: 35 },
  { title: "El Principito", author: "Saint-Exupéry", loans: 32 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
    

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Título y descripción */}
        <div className="space-y-2">
      
          <p className="text-slate-600">Monitorea el rendimiento y las métricas clave de tu librería</p>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <p className="text-xs text-emerald-600 font-medium">{stat.change} desde el mes pasado</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Préstamos y Devoluciones */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Préstamos y Devoluciones</CardTitle>
                <CardDescription>Actividad semanal de la biblioteca</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={loanData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="prestamos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="devoluciones" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Categorías Populares */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900">Categorías Populares</CardTitle>
                <CardDescription>Distribución por género</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {categoryData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="text-sm text-slate-700 font-medium">{category.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{category.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actividad Semanal y Libros Populares */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Actividad Semanal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Actividad Semanal</CardTitle>
              <CardDescription>Visitas diarias a la biblioteca</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="visitas"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Libros Más Populares */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Libros Más Populares</CardTitle>
              <CardDescription>Los más prestados este mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularBooks.map((book, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 text-sm">{book.title}</h4>
                      <p className="text-xs text-slate-700">{book.author}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800">
                      {book.loans} préstamos
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;