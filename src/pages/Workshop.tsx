import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Workshop() {
  const sampleOrders = [
    {
      id: 1,
      orderNumber: "ST-2024-001",
      customer: "Luis Pérez",
      vehicle: "Bicicleta Trek Mountain",
      problem: "Frenos no funcionan correctamente",
      status: "in_progress",
      technician: "Carlos Méndez",
      estimatedCost: 45.00,
      startDate: "2024-01-15",
      estimatedCompletion: "2024-01-16",
      priority: "high"
    },
    {
      id: 2,
      orderNumber: "ST-2024-002",
      customer: "Ana Silva",
      vehicle: "Moto Honda CB600F",
      problem: "Cambio de aceite y revisión general",
      status: "waiting_parts",
      technician: "Roberto García",
      estimatedCost: 120.00,
      startDate: "2024-01-14",
      estimatedCompletion: "2024-01-17",
      priority: "normal"
    },
    {
      id: 3,
      orderNumber: "ST-2024-003",
      customer: "María González",
      vehicle: "Bicicleta Specialized Road",
      problem: "Cambio de cadena y piñones",
      status: "completed",
      technician: "Carlos Méndez",
      estimatedCost: 89.50,
      startDate: "2024-01-13",
      estimatedCompletion: "2024-01-14",
      priority: "normal"
    }
  ];

  return (
    <AppLayout>
      <div className="container-enterprise py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Taller de Servicio</h1>
            <p className="text-foreground-secondary">
              Gestión completa de órdenes de servicio y reparaciones
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-success border-success">
              🔧 Taller operativo
            </Badge>
            <Button size="sm" className="bg-primary hover:bg-primary-hover">
              ➕ Nueva Orden
            </Button>
          </div>
        </div>

        {/* Workshop Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-info">45</p>
            <p className="text-sm text-foreground-secondary">Órdenes Activas</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-warning">12</p>
            <p className="text-sm text-foreground-secondary">En Progreso</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-destructive">8</p>
            <p className="text-sm text-foreground-secondary">Esperando Partes</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-success">25</p>
            <p className="text-sm text-foreground-secondary">Completadas</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-primary">$3,450</p>
            <p className="text-sm text-foreground-secondary">Revenue Pendiente</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="enterprise-card p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              id="workshop-search"
              name="workshop-search"
              type="text" 
              placeholder="Buscar por orden, cliente o vehículo..."
              className="enterprise-input flex-1"
            />
            <div className="flex gap-2">
              <select id="workshop-status" name="workshop-status" className="enterprise-input">
                <option>Todos los estados</option>
                <option>Recibidas</option>
                <option>En progreso</option>
                <option>Esperando partes</option>
                <option>Completadas</option>
                <option>Entregadas</option>
              </select>
              <select id="workshop-technician" name="workshop-technician" className="enterprise-input">
                <option>Todos los técnicos</option>
                <option>Carlos Méndez</option>
                <option>Roberto García</option>
                <option>Ana Morales</option>
              </select>
              <select id="workshop-priority" name="workshop-priority" className="enterprise-input">
                <option>Todas las prioridades</option>
                <option>Urgente</option>
                <option>Alta</option>
                <option>Normal</option>
                <option>Baja</option>
              </select>
              <Button>🔍 Filtrar</Button>
            </div>
          </div>
        </Card>

        {/* Service Orders Table */}
        <Card className="enterprise-card">
          <div className="p-6 border-b border-card-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Órdenes de Servicio</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">📄 Imprimir Orden</Button>
                <Button variant="outline" size="sm">📊 Reporte</Button>
                <Button variant="outline" size="sm">⚙️ Configurar</Button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Orden</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Cliente</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Vehículo</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Problema</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Estado</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Técnico</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Costo</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Prioridad</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sampleOrders.map((order) => (
                  <tr key={order.id} className="border-b border-card-border hover:bg-background-secondary/50">
                    <td className="p-4">
                      <div>
                        <p className="font-mono text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-foreground-secondary">
                          Inicio: {order.startDate}
                        </p>
                        <p className="text-xs text-foreground-secondary">
                          Est. término: {order.estimatedCompletion}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{order.customer}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{order.vehicle}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm max-w-xs truncate" title={order.problem}>
                        {order.problem}
                      </p>
                    </td>
                    <td className="p-4">
                      {order.status === "in_progress" && (
                        <Badge className="status-badge status-info">🔄 En Progreso</Badge>
                      )}
                      {order.status === "waiting_parts" && (
                        <Badge className="status-badge status-warning">⏳ Esperando Partes</Badge>
                      )}
                      {order.status === "completed" && (
                        <Badge className="status-badge status-success">✅ Completada</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{order.technician}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">${order.estimatedCost.toFixed(2)}</p>
                    </td>
                    <td className="p-4">
                      {order.priority === "high" && (
                        <Badge className="status-badge status-error">🔴 Alta</Badge>
                      )}
                      {order.priority === "normal" && (
                        <Badge className="status-badge status-info">🟡 Normal</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" title="Ver detalle">👁️</Button>
                        <Button variant="ghost" size="sm" title="Editar">✏️</Button>
                        <Button variant="ghost" size="sm" title="Imprimir">📄</Button>
                        <Button variant="ghost" size="sm" title="Actualizar estado">🔄</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 border-t border-card-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground-secondary">
                Mostrando 3 de 45 órdenes activas
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>« Anterior</Button>
                <span className="text-sm text-foreground-secondary">Página 1 de 15</span>
                <Button variant="outline" size="sm">Siguiente »</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Workshop Tools */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">🔧</div>
              <h3 className="font-semibold text-foreground">Nueva Orden</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Crear orden de servicio
              </p>
            </div>
          </Card>
          
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">⚙️</div>
              <h3 className="font-semibold text-foreground">Gestión de Partes</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Control de repuestos usados
              </p>
            </div>
          </Card>
          
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-semibold text-foreground">Reportes Taller</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Eficiencia y rentabilidad
              </p>
            </div>
          </Card>
          
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">👨‍🔧</div>
              <h3 className="font-semibold text-foreground">Gestión de Técnicos</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Asignación y productividad
              </p>
            </div>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card className="enterprise-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Agenda del Día</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-warning"></div>
                <div>
                  <p className="font-medium">09:00 - Revisión general - Moto Honda</p>
                  <p className="text-sm text-foreground-secondary">Cliente: Ana Silva - Técnico: Roberto García</p>
                </div>
              </div>
              <Badge className="status-badge status-warning">En Progreso</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-success"></div>
                <div>
                  <p className="font-medium">11:00 - Arreglo de frenos - Bicicleta Trek</p>
                  <p className="text-sm text-foreground-secondary">Cliente: Luis Pérez - Técnico: Carlos Méndez</p>
                </div>
              </div>
              <Badge className="status-badge status-success">Completado</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-info"></div>
                <div>
                  <p className="font-medium">14:00 - Mantenimiento preventivo - Bicicleta Specialized</p>
                  <p className="text-sm text-foreground-secondary">Cliente: Pedro Ramírez - Técnico: Ana Morales</p>
                </div>
              </div>
              <Badge className="status-badge status-info">Programado</Badge>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}