import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Sale {
  id: string;
  customer: string;
  amount: number;
  status: "completed" | "pending" | "cancelled";
  date: string;
  items: number;
  paymentMethod: string;
}

function StatusBadge({ status }: { status: Sale["status"] }) {
  const variants = {
    completed: "status-success",
    pending: "status-warning",
    cancelled: "status-error"
  };

  const labels = {
    completed: "Completada",
    pending: "Pendiente",
    cancelled: "Cancelada"
  };

  return (
    <Badge className={`status-badge ${variants[status]}`}>
      {labels[status]}
    </Badge>
  );
}

export function RecentSales() {
  const recentSales: Sale[] = [
    {
      id: "INV-2024-001",
      customer: "María González",
      amount: 450.00,
      status: "completed",
      date: "2024-01-15",
      items: 3,
      paymentMethod: "Efectivo USD"
    },
    {
      id: "INV-2024-002",
      customer: "Carlos Rodríguez",
      amount: 1250.00,
      status: "completed",
      date: "2024-01-15",
      items: 1,
      paymentMethod: "Transferencia"
    },
    {
      id: "INV-2024-003",
      customer: "Ana Martínez",
      amount: 89.90,
      status: "pending",
      date: "2024-01-14",
      items: 2,
      paymentMethod: "Tarjeta"
    },
    {
      id: "INV-2024-004",
      customer: "Luis Pérez",
      amount: 2100.00,
      status: "completed",
      date: "2024-01-14",
      items: 1,
      paymentMethod: "Zelle"
    },
    {
      id: "INV-2024-005",
      customer: "Carmen Silva",
      amount: 675.50,
      status: "completed",
      date: "2024-01-13",
      items: 4,
      paymentMethod: "Efectivo Bs"
    }
  ];

  return (
    <Card className="enterprise-card">
      <div className="p-6 border-b border-card-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Ventas Recientes</h3>
            <p className="text-sm text-foreground-secondary">Últimas transacciones del día</p>
          </div>
          <Button variant="outline" size="sm">
            Ver Todas
          </Button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {recentSales.map((sale, index) => (
            <div 
              key={sale.id} 
              className="flex items-center justify-between p-4 rounded-lg bg-background-secondary hover:bg-muted transition-colors cursor-pointer animate-slide-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium">
                  {sale.customer.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-medium text-foreground">{sale.customer}</p>
                  <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                    <span>{sale.id}</span>
                    <span>•</span>
                    <span>{sale.items} {sale.items === 1 ? 'artículo' : 'artículos'}</span>
                    <span>•</span>
                    <span>{sale.paymentMethod}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-foreground">${sale.amount.toLocaleString()}</p>
                  <p className="text-xs text-foreground-secondary">{sale.date}</p>
                </div>
                <StatusBadge status={sale.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}