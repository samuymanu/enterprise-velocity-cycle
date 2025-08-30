import { Calculator, TrendingUp } from "lucide-react";
import { useExchangeRates } from "@/hooks/useExchangeRates";

export function SaleSummary({ cartItems = [] }: { cartItems?: Array<{ price?: number; quantity: number }> }) {
  const { rates } = useExchangeRates();

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const discount = 0; // Por ahora sin descuentos
  const total = subtotal - discount;

  // Usar la tasa BCV del sistema de configuración
  const exchangeRate = rates.bcv;

  const formatCurrencyUSD = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    } catch (err) {
      return `$${value.toFixed(2)}`;
    }
  };

  const formatCurrencyVES = (value: number) => {
    try {
      return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 0 }).format(value);
    } catch (err) {
      return `Bs.${(value).toLocaleString('es-VE')}`;
    }
  };

  const convertToVES = (usdAmount: number) => usdAmount * exchangeRate;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resumen de Venta</h3>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Columna izquierda: Subtotal y Descuento */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <div className="text-right">
              <div className="font-medium text-gray-900 dark:text-white">{formatCurrencyUSD(subtotal)}</div>
              <div className="text-gray-500 dark:text-gray-400">{formatCurrencyVES(convertToVES(subtotal))}</div>
            </div>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Descuento:</span>
            <div className="text-right">
              <div className="font-medium text-gray-900 dark:text-white">-{formatCurrencyUSD(discount)}</div>
              <div className="text-gray-500 dark:text-gray-400">-{formatCurrencyVES(convertToVES(discount))}</div>
            </div>
          </div>
        </div>

        {/* Columna derecha: Total - Más espacio */}
        <div className="flex flex-col justify-center items-end border-l border-gray-200 dark:border-gray-600 pl-6">
          <div className="text-right space-y-1">
            <div className="text-sm font-bold text-green-700 dark:text-green-400">Total:</div>
            <div className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrencyUSD(total)}</div>
            <div className="text-base text-green-600 dark:text-green-400">{formatCurrencyVES(convertToVES(total))}</div>
          </div>
        </div>
      </div>

      {cartItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Tasa: {exchangeRate} Bs/USD
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {cartItems.length} {cartItems.length === 1 ? 'artículo' : 'artículos'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
