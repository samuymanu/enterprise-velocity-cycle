import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { apiService } from "@/lib/api";

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
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentSales = async () => {
      try {
        const response = await apiService.sales.getRecent(5);
        if (response.success) {
          const transformedSales: Sale[] = response.sales.map((sale: any) => ({
            id: sale.saleNumber || sale.id,
            customer: sale.customer,
            amount: sale.amount,
            status: sale.status.toLowerCase() as Sale["status"],
            date: sale.date,
            items: sale.items,
            paymentMethod: sale.paymentMethod
          }));
          setSales(transformedSales);
        }
      } catch (error) {
        console.error('Error fetching recent sales:', error);
        // Fallback to mock data if API fails
        setSales([
          {
            id: "VENTA-001",
            customer: "María González",
            amount: 450.00,
            status: "completed",
            date: new Date().toISOString().split('T')[0],
            items: 3,
            paymentMethod: "Efectivo USD"
          },
          {
            id: "VENTA-002",
            customer: "Carlos Rodríguez",
            amount: 1250.00,
            status: "completed",
            date: new Date().toISOString().split('T')[0],
            items: 1,
            paymentMethod: "Transferencia"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentSales();
  }, []);

  if (loading) {
    return (
      <Card className="enterprise-card">
        <div className="p-6 border-b border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Ventas Recientes</h3>
              <p className="text-sm text-foreground-secondary">Últimas transacciones del día</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Ver Todas
            </Button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

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
        {sales.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-foreground-secondary">No hay ventas recientes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sales.map((sale, index) => (
              <div 
                key={sale.id} 
                className="flex items-center justify-between p-4 rounded-lg bg-background-secondary hover:bg-muted transition-colors cursor-pointer animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium">
                    {sale.customer.split(' ').map((n: string) => n[0]).join('')}
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
        )}
      </div>
    </Card>
  );
}