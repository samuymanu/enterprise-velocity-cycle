import { ShoppingCart as CartIcon, X, Plus, Minus, Trash2 } from "lucide-react";
import { useExchangeRates } from "@/hooks/useExchangeRates";

type CartItem = {
  id: string;
  name: string;
  sku?: string;
  brand?: string;
  quantity: number;
  price?: number;
};

export function ShoppingCart({ 
  items = [], 
  onRemove, 
  onQuantityChange,
  onClearCart
}: { 
  items?: CartItem[]; 
  onRemove?: (id: string) => void;
  onQuantityChange?: (id: string, quantity: number) => void;
  onClearCart?: () => void;
}) {
  const { rates } = useExchangeRates();
  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const formatCurrencyUSD = (value?: number) => {
    if (value == null) return '';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    } catch (err) {
      return `$${(value || 0).toFixed(2)}`;
    }
  };

  const formatCurrencyVES = (value?: number) => {
    if (value == null) return '';
    try {
      return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 0 }).format(value);
    } catch (err) {
      return `Bs.${(value || 0).toLocaleString('es-VE')}`;
    }
  };

  const convertToVES = (usdAmount: number) => usdAmount * rates.bcv;

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 min-h-[500px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CartIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Carrito de Compras</h3>
            </div>
            {totalItems > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                <CartIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Carrito vacío</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Busca y agrega productos desde el panel de búsqueda para comenzar una venta
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="group bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  {/* Main product row - Horizontal layout */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Product info - Compact */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm flex-1">{item.name}</h4>
                        {item.brand && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-nowrap">
                            {item.brand}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price - Compact */}
                    {typeof item.price === 'number' && (
                      <div className="text-right min-w-[70px] flex-shrink-0">
                        <div className="text-sm font-medium text-green-600 dark:text-green-400">
                          {formatCurrencyUSD(item.price)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrencyVES(convertToVES(item.price))}
                        </div>
                      </div>
                    )}

                    {/* Quantity Controls - Ultra compact */}
                    <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            onQuantityChange?.(item.id, item.quantity - 1);
                          }
                        }}
                        className="px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 text-xs"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 py-1 text-sm font-medium min-w-[1.5rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onQuantityChange?.(item.id, item.quantity + 1)}
                        className="px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Subtotal - Inline */}
                    {typeof item.price === 'number' && (
                      <div className="text-right min-w-[70px] flex-shrink-0 border-l border-gray-200 dark:border-gray-600 pl-2">
                        <div className="text-xs text-gray-600 dark:text-gray-400">Subtotal</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrencyUSD(item.price * item.quantity)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrencyVES(convertToVES(item.price * item.quantity))}
                        </div>
                      </div>
                    )}

                    {/* Remove Button - Minimal */}
                    <button
                      onClick={() => onRemove?.(item.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="Eliminar del carrito"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Total and Clear button */}
        {items.length > 0 && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'} en el carrito
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  Total: {formatCurrencyUSD(total)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrencyVES(convertToVES(total))}
                </div>
              </div>
            </div>
            <div className="mt-1 flex justify-end">
              <button
                onClick={() => onClearCart?.()}
                className="inline-flex items-center px-3 py-2 text-sm font-medium border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Carrito
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
