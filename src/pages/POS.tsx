import React from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductSearch } from "@/components/pos/ProductSearch";
import { ProductFilters } from "@/components/pos/ProductFilters";
import { ShoppingCart } from "@/components/pos/ShoppingCart";
import { SaleSummary } from "@/components/pos/SaleSummary";
import { PaymentMethods } from "@/components/pos/PaymentMethods";
import { MixedPaymentModal } from "@/components/pos/MixedPaymentModal";
import { SpecialPaymentsModal } from "@/components/pos/SpecialPaymentsModal";
import { apiService } from '@/lib/api';
import { CustomerActions } from "@/components/pos/CustomerActions";
import { SaleActions } from "@/components/pos/SaleActions";
import { RecentSales } from "@/components/pos/RecentSales";
import { useToast } from '@/hooks/use-toast';

export default function POS() {
  const toast = useToast();
  const [filtersCollapsed, setFiltersCollapsed] = React.useState(true);
  // Carrito local simple (por ahora en memoria)
  const [cart, setCart] = React.useState<{ id: string; name: string; sku?: string; brand?: string; quantity: number; price?: number }[]>([]);
  const [mixedPaymentModalOpen, setMixedPaymentModalOpen] = React.useState(false);
  const [specialPaymentsModalOpen, setSpecialPaymentsModalOpen] = React.useState(false);

  const handleProductSelect = (product: any) => {
  console.log('handleProductSelect product:', product);
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
  const price = (product.price ?? product.salePrice ?? product.sale_price ?? 0) as number;
  const resolveBrand = (p: any) => {
  const b = p?.brand ?? p?.brandName ?? p?.brand_name ?? p?.manufacturer ?? p?.make ?? p?.marca;
  if (!b) return undefined;
  if (typeof b === 'string') return b;
  if (typeof b === 'object') return b?.name ?? b?.label ?? b?.title ?? undefined;
  return String(b);
  }

  return [{ id: product.id, name: product.name, sku: product.sku || product.barcode || '', brand: resolveBrand(product), quantity: 1, price }, ...prev];
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

  const handlePaymentComplete = async (paymentData: any) => {
    try {
      // Aquí puedes integrar con tu API de ventas
      console.log('Procesando pago mixto:', paymentData);
      
      // Por ahora, solo limpiamos el carrito y mostramos mensaje
      toast.toast({
        title: 'Pago procesado',
        description: `Pago mixto completado por ${formatCurrency(paymentData.total)}`
      });
      
      setCart([]);
    } catch (error) {
      console.error('Error procesando pago:', error);
      toast.toast({
        title: 'Error',
        description: 'Error al procesar el pago'
      });
    }
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
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
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <CustomerActions />
              </div>
              <div className="flex-1 max-w-md">
                <SaleSummary cartItems={cart} />
              </div>
            </div>
          </div>
        </div>

        {/* Interface Principal - Layout reorganizado */}
        <div className="grid grid-cols-12 gap-6">
          {/* Columna izquierda - Filtros y Búsqueda (reducido) */}
          <div className="col-span-3">
            <div className="space-y-4">
              <ProductFilters
                collapsed={filtersCollapsed}
                onCollapse={() => setFiltersCollapsed(true)}
                onExpand={() => setFiltersCollapsed(false)}
              />
              <ProductSearch onProductSelect={handleProductSelect} />
            </div>
          </div>

      {/* Carrito prominente en el centro */}
          <div className="col-span-6">
            <ShoppingCart 
              items={cart} 
              onRemove={handleRemove} 
              onQuantityChange={handleQuantityChange}
              onClearCart={handleClearCart}
            />
          </div>

          {/* Columna derecha - Métodos de pago y acciones (más ancho) */}
          <div className="col-span-3 space-y-6">
            <PaymentMethods total={cart.reduce((s, it) => s + (it.price || 0) * it.quantity, 0)} onQuickPay={async (method, amount) => {
              // Construir payload de la venta
              const items = cart.map(it => ({ productId: it.id, quantity: it.quantity, price: it.price || 0 }));
              const total = cart.reduce((s, it) => s + (it.price || 0) * it.quantity, 0);

              if (method === 'mixed') {
                // Abrir modal de pago mixto
                setMixedPaymentModalOpen(true);
                return;
              }

              try {
                // Preferir apiService.sales.create si existe
                if ((apiService as any).sales && typeof (apiService as any).sales.create === 'function') {
                  await (apiService as any).sales.create({
                    customerId: undefined, // por ahora sin cliente específico
                    items,
                    total,
                    paymentMethod: method
                  });
                } else {
                  // Fallback directo a /sales
                  await (apiService as any).getApiUrl && await fetch(`${(apiService as any).getApiUrl()}/sales`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customerId: undefined, items, total, paymentMethod: method })
                  });
                }

                // Notificar y limpiar carrito
                alert(`Pago ${method} de ${amount} procesado`);
                setCart([]);
              } catch (err: any) {
                console.error('Error procesando venta rápida', err);
                alert('Error al procesar la venta. Intente nuevamente.');
              }
            }} />
            <div className="space-y-4">
              <SaleActions 
                cartItems={cart} 
                onOpenSpecialPayment={() => setSpecialPaymentsModalOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Ventas Recientes */}
        <div className="mt-8">
          <RecentSales />
        </div>
      </div>

      {/* Modal de Pago Mixto */}
      <MixedPaymentModal
        open={mixedPaymentModalOpen}
        onOpenChange={setMixedPaymentModalOpen}
        total={cart.reduce((s, it) => s + (it.price || 0) * it.quantity, 0)}
        cartItems={cart}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Modal de Pagos Especiales */}
      <SpecialPaymentsModal
        open={specialPaymentsModalOpen}
        onOpenChange={setSpecialPaymentsModalOpen}
        total={cart.reduce((s, it) => s + (it.price || 0) * it.quantity, 0)}
        cartItems={cart}
        onPaymentComplete={handlePaymentComplete}
      />
    </AppLayout>
  );
}