import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const sampleProducts = [
    {
      id: 1,
      sku: "BIC-001",
      name: "Bicicleta Mountain Bike Pro",
      category: "Bicicletas",
      brand: "Trek",
      stock: 15,
      minStock: 5,
      price: 1250.00,
      status: "active"
    },
    {
      id: 2,
      sku: "MOT-001", 
      name: "Moto Honda CB600F",
      category: "Motocicletas",
      brand: "Honda",
      stock: 3,
      minStock: 2,
      price: 8500.00,
      status: "active"
    },
    {
      id: 3,
      sku: "CAS-001",
      name: "Casco Integral Bell",
      category: "Cascos",
      brand: "Bell",
      stock: 2,
      minStock: 8,
      price: 89.99,
      status: "low_stock"
    }
  ];

  return (
    <AppLayout>
      <div className="container-enterprise py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Inventario</h1>
            <p className="text-foreground-secondary">
              Control completo de productos, stock y valorización
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-warning border-warning">
              ⚠️ 18 productos bajo mínimo
            </Badge>
            <Button size="sm" className="bg-primary hover:bg-primary-hover">
              ➕ Nuevo Producto
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-primary">1,247</p>
            <p className="text-sm text-foreground-secondary">Total Productos</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-success">$156,890</p>
            <p className="text-sm text-foreground-secondary">Valor Inventario</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-warning">18</p>
            <p className="text-sm text-foreground-secondary">Stock Crítico</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-info">89%</p>
            <p className="text-sm text-foreground-secondary">Rotación Promedio</p>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="enterprise-card p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="Buscar por SKU, nombre, marca o código de barras..."
              className="enterprise-input flex-1"
            />
            <div className="flex gap-2">
              <select className="enterprise-input">
                <option>Todas las categorías</option>
                <option>Bicicletas</option>
                <option>Motocicletas</option>
                <option>Repuestos</option>
                <option>Accesorios</option>
                <option>Cascos</option>
              </select>
              <select className="enterprise-input">
                <option>Todos los estados</option>
                <option>Stock normal</option>
                <option>Stock bajo</option>
                <option>Sin stock</option>
                <option>Inactivos</option>
              </select>
              <Button>🔍 Filtrar</Button>
            </div>
          </div>
        </Card>

        {/* Products Table */}
        <Card className="enterprise-card">
          <div className="p-6 border-b border-card-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Lista de Productos</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">📥 Importar</Button>
                <Button variant="outline" size="sm">📤 Exportar</Button>
                <Button variant="outline" size="sm">🏷️ Etiquetas</Button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground-secondary">SKU</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Producto</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Categoría</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Stock</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Precio</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Estado</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sampleProducts.map((product) => (
                  <tr key={product.id} className="border-b border-card-border hover:bg-background-secondary/50">
                    <td className="p-4">
                      <span className="font-mono text-sm">{product.sku}</span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-foreground-secondary">{product.brand}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{product.category}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={product.stock <= product.minStock ? "text-destructive font-bold" : "text-foreground"}>
                          {product.stock}
                        </span>
                        <span className="text-xs text-foreground-secondary">
                          (min: {product.minStock})
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">${product.price.toLocaleString()}</span>
                    </td>
                    <td className="p-4">
                      {product.status === "active" && (
                        <Badge className="status-badge status-success">✅ Activo</Badge>
                      )}
                      {product.status === "low_stock" && (
                        <Badge className="status-badge status-warning">⚠️ Stock Bajo</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">👁️</Button>
                        <Button variant="ghost" size="sm">✏️</Button>
                        <Button variant="ghost" size="sm">📋</Button>
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
                Mostrando 3 de 1,247 productos
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>« Anterior</Button>
                <span className="text-sm text-foreground-secondary">Página 1 de 416</span>
                <Button variant="outline" size="sm">Siguiente »</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="font-semibold text-foreground">Entrada de Mercancía</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Registrar nueva mercancía recibida
              </p>
            </div>
          </Card>
          
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-semibold text-foreground">Reportes de Inventario</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Análisis de rotación y valorización
              </p>
            </div>
          </Card>
          
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">🏷️</div>
              <h3 className="font-semibold text-foreground">Gestión de Precios</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Actualización masiva de precios
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}