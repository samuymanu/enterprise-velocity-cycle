import { Calculator, TrendingUp } from "lucide-react";

export function SaleSummary({ cartItems = [] }: { cartItems?: Array<{ price?: number; quantity: number }> }) {
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const discount = 0; // Por ahora sin descuentos
  const taxRate = 0.16; // IVA 16%
  const tax = subtotal * taxRate;
  const total = subtotal - discount + tax;

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    } catch (err) {
      return `$${value.toFixed(2)}`;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resumen de Venta</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Descuento:</span>
            <span className="font-medium text-gray-900 dark:text-white">-{formatCurrency(discount)}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">IVA (16%):</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-gray-200 dark:border-gray-600 pt-2">
            <span className="text-green-700 dark:text-green-400">Total:</span>
            <span className="text-green-700 dark:text-green-400">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {cartItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-center">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {cartItems.length} {cartItems.length === 1 ? 'artículo' : 'artículos'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
