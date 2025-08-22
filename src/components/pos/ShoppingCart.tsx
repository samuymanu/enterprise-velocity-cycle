import { ShoppingCart as CartIcon, X, Plus, Minus } from "lucide-react";

type CartItem = {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  price?: number;
};

export function ShoppingCart({ 
  items = [], 
  onRemove, 
  onQuantityChange 
}: { 
  items?: CartItem[]; 
  onRemove?: (id: string) => void;
  onQuantityChange?: (id: string, quantity: number) => void;
}) {
  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const formatCurrency = (value?: number) => {
    if (value == null) return '';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    } catch (err) {
      return `$${(value || 0).toFixed(2)}`;
    }
  };

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
        <div className="flex-1 p-4">
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
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="group bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">{item.name}</h4>
                      {item.sku && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span className="inline-block bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                            SKU: {item.sku}
                          </span>
                        </p>
                      )}
                      {typeof item.price === 'number' && (
                        <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">
                          {formatCurrency(item.price)} c/u
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {/* Quantity Controls */}
                      <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              onQuantityChange?.(item.id, item.quantity - 1);
                            }
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 py-1 text-sm font-medium min-w-[2.5rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onQuantityChange?.(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button 
                        onClick={() => onRemove?.(item.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar del carrito"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                      {typeof item.price === 'number' && (
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Total */}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'} en el carrito
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  Total: {formatCurrency(total)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
