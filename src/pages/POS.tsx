import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function POS() {
  return (
    <AppLayout>
      <div className="container-enterprise py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Punto de Venta</h1>
            <p className="text-foreground-secondary">
              Sistema de ventas rápido y eficiente
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-success border-success">
              🟢 Caja Abierta
            </Badge>
            <Button size="sm" className="bg-primary hover:bg-primary-hover">
              💰 Cerrar Caja
            </Button>
          </div>
        </div>

        {/* POS Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Search & Cart */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="enterprise-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Búsqueda de Productos</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    id="pos-product-search"
                    name="pos-product-search"
                    type="text" 
                    placeholder="Buscar por código, nombre o escanear código de barras..."
                    className="enterprise-input flex-1"
                  />
                  <Button>🔍 Buscar</Button>
                </div>
                
                {/* Quick Categories */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">🚲 Bicicletas</Button>
                  <Button variant="outline" size="sm">🏍️ Motos</Button>
                  <Button variant="outline" size="sm">⚙️ Repuestos</Button>
                  <Button variant="outline" size="sm">🛡️ Accesorios</Button>
                  <Button variant="outline" size="sm">⛑️ Cascos</Button>
                </div>
              </div>
            </Card>

            {/* Shopping Cart */}
            <Card className="enterprise-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Carrito de Compras</h3>
              <div className="space-y-4">
                <div className="text-center text-foreground-secondary py-8">
                  <p>🛒 Carrito vacío</p>
                  <p className="text-sm mt-2">Busca y agrega productos para comenzar una venta</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sale Summary & Payment */}
          <div className="space-y-6">
            <Card className="enterprise-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Resumen de Venta</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Subtotal:</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Descuento:</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">IVA (16%):</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">$0.00</span>
                </div>
              </div>
            </Card>

            <Card className="enterprise-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Métodos de Pago</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                  💵 Efectivo VES
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  💸 Efectivo USD
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  💳 Tarjeta de Crédito/Débito
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  🏦 Transferencia Bancaria
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  💰 Zelle
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  ₿ USDT/Crypto
                </Button>
              </div>
            </Card>

            <Card className="enterprise-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Cliente</h3>
              <div className="space-y-3">
                <input 
                  id="pos-customer-search"
                  name="pos-customer-search"
                  type="text" 
                  placeholder="Buscar cliente por documento o nombre..."
                  className="enterprise-input w-full"
                />
                <Button variant="outline" className="w-full">
                  👤 Cliente General
                </Button>
                <Button variant="outline" className="w-full">
                  ➕ Nuevo Cliente
                </Button>
              </div>
            </Card>

            <div className="space-y-2">
              <Button 
                size="lg" 
                className="w-full bg-success hover:bg-success/90 text-success-foreground"
                disabled
              >
                ✅ Procesar Venta
              </Button>
              <Button variant="outline" size="lg" className="w-full">
                🏪 Apartar Producto
              </Button>
            </div>
          </div>
        </div>

        {/* Recent Sales */}
        <Card className="enterprise-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Ventas del Día</h3>
          <div className="text-center text-foreground-secondary py-4">
            <p>📊 No hay ventas registradas hoy</p>
            <p className="text-sm mt-2">Las ventas aparecerán aquí una vez que proceses la primera transacción</p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}