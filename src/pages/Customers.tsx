import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Customers() {
  const sampleCustomers = [
    {
      id: 1,
      document: "V-12345678",
      name: "María González",
      email: "maria.gonzalez@email.com",
      phone: "+58 414-1234567",
      type: "individual",
      category: "regular",
      creditLimit: 500.00,
      currentBalance: 0.00,
      totalPurchases: 2450.00,
      lastPurchase: "2024-01-15"
    },
    {
      id: 2,
      document: "J-98765432",
      name: "Bicicletas Express C.A.",
      email: "ventas@bicicletasexpress.com",
      phone: "+58 212-9876543",
      type: "company",
      category: "wholesale",
      creditLimit: 5000.00,
      currentBalance: 1250.00,
      totalPurchases: 15750.00,
      lastPurchase: "2024-01-14"
    },
    {
      id: 3,
      document: "V-87654321",
      name: "Carlos Rodríguez",
      email: "carlos.rodriguez@email.com", 
      phone: "+58 426-8765432",
      type: "individual",
      category: "vip",
      creditLimit: 2000.00,
      currentBalance: 450.00,
      totalPurchases: 8900.00,
      lastPurchase: "2024-01-13"
    }
  ];

  return (
    <AppLayout>
      <div className="container-enterprise py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Clientes</h1>
            <p className="text-foreground-secondary">
              Base de datos completa de clientes y cuentas por cobrar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-info border-info">
              👥 1,847 clientes activos
            </Badge>
            <Button size="sm" className="bg-primary hover:bg-primary-hover">
              ➕ Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-primary">1,847</p>
            <p className="text-sm text-foreground-secondary">Total Clientes</p>
            <p className="text-xs text-success mt-1">+89 este mes</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-warning">$12,450</p>
            <p className="text-sm text-foreground-secondary">Cuentas por Cobrar</p>
            <p className="text-xs text-warning mt-1">23 cuentas vencidas</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-success">156</p>
            <p className="text-sm text-foreground-secondary">Clientes VIP</p>
            <p className="text-xs text-success mt-1">8.4% del total</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-info">$890.50</p>
            <p className="text-sm text-foreground-secondary">Ticket Promedio</p>
            <p className="text-xs text-success mt-1">+15.2% vs mes anterior</p>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="enterprise-card p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="Buscar por documento, nombre, email o teléfono..."
              className="enterprise-input flex-1"
            />
            <div className="flex gap-2">
              <select className="enterprise-input">
                <option>Todos los tipos</option>
                <option>Personas</option>
                <option>Empresas</option>
              </select>
              <select className="enterprise-input">
                <option>Todas las categorías</option>
                <option>Regular</option>
                <option>VIP</option>
                <option>Mayorista</option>
              </select>
              <select className="enterprise-input">
                <option>Todos los estados</option>
                <option>Al día</option>
                <option>Con deuda</option>
                <option>Morosos</option>
              </select>
              <Button>🔍 Filtrar</Button>
            </div>
          </div>
        </Card>

        {/* Customers Table */}
        <Card className="enterprise-card">
          <div className="p-6 border-b border-card-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Lista de Clientes</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">📥 Importar</Button>
                <Button variant="outline" size="sm">📤 Exportar</Button>
                <Button variant="outline" size="sm">💌 Email Masivo</Button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Cliente</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Contacto</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Tipo</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Crédito</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Balance</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Compras</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sampleCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-card-border hover:bg-background-secondary/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-foreground-secondary font-mono">{customer.document}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p>{customer.email}</p>
                        <p className="text-foreground-secondary">{customer.phone}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <Badge variant="outline">
                          {customer.type === "individual" ? "👤 Persona" : "🏢 Empresa"}
                        </Badge>
                        <div>
                          {customer.category === "regular" && (
                            <Badge className="status-badge status-info">Regular</Badge>
                          )}
                          {customer.category === "vip" && (
                            <Badge className="status-badge status-warning">⭐ VIP</Badge>
                          )}
                          {customer.category === "wholesale" && (
                            <Badge className="status-badge status-success">📦 Mayorista</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p className="font-medium">${customer.creditLimit.toLocaleString()}</p>
                        <p className="text-foreground-secondary">Límite</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p className={`font-medium ${customer.currentBalance > 0 ? "text-warning" : "text-success"}`}>
                          ${customer.currentBalance.toLocaleString()}
                        </p>
                        <p className="text-foreground-secondary">
                          {customer.currentBalance > 0 ? "Debe" : "Al día"}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p className="font-medium">${customer.totalPurchases.toLocaleString()}</p>
                        <p className="text-foreground-secondary">Última: {customer.lastPurchase}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" title="Ver perfil">👁️</Button>
                        <Button variant="ghost" size="sm" title="Editar">✏️</Button>
                        <Button variant="ghost" size="sm" title="Estado de cuenta">📋</Button>
                        <Button variant="ghost" size="sm" title="Historial">📊</Button>
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
                Mostrando 3 de 1,847 clientes
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>« Anterior</Button>
                <span className="text-sm text-foreground-secondary">Página 1 de 616</span>
                <Button variant="outline" size="sm">Siguiente »</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Customer Management Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">💳</div>
              <h3 className="font-semibold text-foreground">Cuentas por Cobrar</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Gestionar créditos y pagos pendientes
              </p>
            </div>
          </Card>
          
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-semibold text-foreground">Análisis de Clientes</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Segmentación y comportamiento de compra
              </p>
            </div>
          </Card>
          
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">💌</div>
              <h3 className="font-semibold text-foreground">Marketing</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Campañas y comunicación masiva
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}