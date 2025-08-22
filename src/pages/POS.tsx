import React from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductSearch } from "@/components/pos/ProductSearch";
import { ProductFilters } from "@/components/pos/ProductFilters";
import { ShoppingCart } from "@/components/pos/ShoppingCart";
import { SaleSummary } from "@/components/pos/SaleSummary";
import { PaymentMethods } from "@/components/pos/PaymentMethods";
import { CustomerActions } from "@/components/pos/CustomerActions";
import { SaleActions } from "@/components/pos/SaleActions";
import { RecentSales } from "@/components/pos/RecentSales";

export default function POS() {
  // Carrito local simple (por ahora en memoria)
  const [cart, setCart] = React.useState<{ id: string; name: string; sku?: string; quantity: number; price?: number }[]>([]);

  const handleProductSelect = (product: any) => {
  console.log('handleProductSelect product:', product);
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
  const price = (product.price ?? product.salePrice ?? product.sale_price ?? 0) as number;
  return [{ id: product.id, name: product.name, sku: product.sku || product.barcode || '', quantity: 1, price }, ...prev];
    });
  };

  const handleRemove = (id: string) => {
    setCart(prev => prev.filter(p => p.id !== id));
  };

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemove(id);
      return;
    }
    setCart(prev => prev.map(p => p.id === id ? { ...p, quantity: newQuantity } : p));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  return (
    <AppLayout>
      <div className="w-full p-6">
        {/* Header mejorado */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                💳 Punto de Venta
              </h1>
              <p className="text-gray-600 dark:text-gray-300">Sistema de ventas rápido y eficiente</p>
            </div>
            <div className="flex items-start gap-4">
              <CustomerActions />
              <div className="w-80">
                <SaleSummary cartItems={cart} />
              </div>
            </div>
          </div>
        </div>

        {/* Interface Principal - Layout reorganizado */}
        <div className="grid grid-cols-12 gap-6">
          {/* Columna izquierda - Filtros y Búsqueda (más ancho) */}
          <div className="col-span-4 space-y-4">
            <ProductFilters />
            <ProductSearch onProductSelect={handleProductSelect} />
          </div>

          {/* Carrito prominente en el centro */}
          <div className="col-span-6">
            <ShoppingCart 
              items={cart} 
              onRemove={handleRemove} 
              onQuantityChange={handleQuantityChange}
            />
          </div>

          {/* Columna derecha - Métodos de pago y acciones (más estrecho) */}
          <div className="col-span-2 space-y-6">
            <PaymentMethods />
            <div className="space-y-4">
              <SaleActions cartItems={cart} onClearCart={handleClearCart} />
            </div>
          </div>
        </div>

        {/* Ventas Recientes */}
        <div className="mt-8">
          <RecentSales />
        </div>
      </div>
    </AppLayout>
  );
}