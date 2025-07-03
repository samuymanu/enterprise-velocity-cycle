import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  return (
    <div className="container-enterprise py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Ejecutivo</h1>
          <p className="text-foreground-secondary">
            Resumen general del negocio - {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-success border-success">
            ✅ Todos los sistemas operativos
          </Badge>
          <Button size="sm" className="bg-primary hover:bg-primary-hover">
            📊 Generar Reporte
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <DashboardStats />

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <SalesChart />
          
          {/* Quick Actions */}
          <Card className="enterprise-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="flex items-center gap-2 justify-start h-12">
                <span className="text-lg">🛒</span>
                <div className="text-left">
                  <div className="text-sm font-medium">Nueva Venta</div>
                  <div className="text-xs text-foreground-secondary">Punto de venta</div>
                </div>
              </Button>
              <Button variant="outline" className="flex items-center gap-2 justify-start h-12">
                <span className="text-lg">👥</span>
                <div className="text-left">
                  <div className="text-sm font-medium">Nuevo Cliente</div>
                  <div className="text-xs text-foreground-secondary">Registrar cliente</div>
                </div>
              </Button>
              <Button variant="outline" className="flex items-center gap-2 justify-start h-12">
                <span className="text-lg">📦</span>
                <div className="text-left">
                  <div className="text-sm font-medium">Nuevo Producto</div>
                  <div className="text-xs text-foreground-secondary">Agregar inventario</div>
                </div>
              </Button>
              <Button variant="outline" className="flex items-center gap-2 justify-start h-12">
                <span className="text-lg">🔧</span>
                <div className="text-left">
                  <div className="text-sm font-medium">Orden Servicio</div>
                  <div className="text-xs text-foreground-secondary">Nuevo trabajo</div>
                </div>
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <RecentSales />
          
          {/* Alerts & Notifications */}
          <Card className="enterprise-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Alertas del Sistema</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-warning-light border border-warning/20">
                <span className="text-warning text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Stock Bajo</p>
                  <p className="text-xs text-foreground-secondary">18 productos bajo el mínimo</p>
                </div>
                <Button size="sm" variant="outline">Ver</Button>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-info-light border border-info/20">
                <span className="text-info text-lg">💰</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Apartados por Vencer</p>
                  <p className="text-xs text-foreground-secondary">5 apartados vencen esta semana</p>
                </div>
                <Button size="sm" variant="outline">Ver</Button>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-success-light border border-success/20">
                <span className="text-success text-lg">🔧</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Servicios Completados</p>
                  <p className="text-xs text-foreground-secondary">8 trabajos listos para entrega</p>
                </div>
                <Button size="sm" variant="outline">Ver</Button>
              </div>
            </div>
          </Card>

          {/* System Health */}
          <Card className="enterprise-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Estado del Sistema</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <span className="text-sm text-foreground">Base de Datos</span>
                </div>
                <Badge className="status-badge status-success">Operativo</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <span className="text-sm text-foreground">API Servicios</span>
                </div>
                <Badge className="status-badge status-success">Operativo</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <span className="text-sm text-foreground">Backup Automático</span>
                </div>
                <Badge className="status-badge status-success">Activo</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-warning"></div>
                  <span className="text-sm text-foreground">Sincronización</span>
                </div>
                <Badge className="status-badge status-warning">Lenta</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Analytics Summary */}
      <Card className="enterprise-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Resumen Mensual</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">$45.2k</p>
            <p className="text-sm text-foreground-secondary">Revenue Total</p>
            <p className="text-xs text-success">+15.3% vs mes pasado</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-accent">342</p>
            <p className="text-sm text-foreground-secondary">Transacciones</p>
            <p className="text-xs text-success">+8.7% vs mes pasado</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-info">89</p>
            <p className="text-sm text-foreground-secondary">Nuevos Clientes</p>
            <p className="text-xs text-success">+22.1% vs mes pasado</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-warning">156</p>
            <p className="text-sm text-foreground-secondary">Servicios Completados</p>
            <p className="text-xs text-success">+12.4% vs mes pasado</p>
          </div>
        </div>
      </Card>
    </div>
  );
}