import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: string;
  description: string;
}

function StatCard({ title, value, change, changeType, icon, description }: StatCardProps) {
  const changeColor = {
    positive: "text-success",
    negative: "text-destructive",
    neutral: "text-foreground-secondary"
  }[changeType];

  return (
    <Card className="enterprise-card p-6 hover:shadow-enterprise-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground-secondary">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className={`text-sm font-medium ${changeColor}`}>
              {change}
            </span>
            <span className="text-xs text-foreground-secondary">vs mes anterior</span>
          </div>
          <p className="text-xs text-foreground-secondary mt-1">{description}</p>
        </div>
        <div className="text-2xl opacity-80">{icon}</div>
      </div>
    </Card>
  );
}

export function DashboardStats() {
  const stats = [
    {
      title: "Ventas Totales",
      value: "$24,890",
      change: "+12.5%",
      changeType: "positive" as const,
      icon: "💰",
      description: "Revenue del mes actual"
    },
    {
      title: "Órdenes Activas",
      value: "127",
      change: "+8.2%",
      changeType: "positive" as const,
      icon: "📋",
      description: "Ventas y servicios pendientes"
    },
    {
      title: "Clientes Nuevos",
      value: "34",
      change: "+15.1%",
      changeType: "positive" as const,
      icon: "👥",
      description: "Registrados este mes"
    },
    {
      title: "Stock Crítico",
      value: "18",
      change: "-5.2%",
      changeType: "negative" as const,
      icon: "⚠️",
      description: "Productos bajo mínimo"
    },
    {
      title: "Servicios Taller",
      value: "45",
      change: "+22.1%",
      changeType: "positive" as const,
      icon: "🔧",
      description: "Reparaciones en progreso"
    },
    {
      title: "Apartados Activos",
      value: "$8,450",
      change: "+18.7%",
      changeType: "positive" as const,
      icon: "🏪",
      description: "Valor en layaways"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div key={stat.title} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
          <StatCard {...stat} />
        </div>
      ))}
    </div>
  );
}