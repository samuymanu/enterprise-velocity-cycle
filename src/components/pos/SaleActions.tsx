import { Button } from "@/components/ui/button";
import { ShoppingCart, Bookmark, Trash2 } from "lucide-react";

export function SaleActions({ cartItems = [], onClearCart }: { cartItems?: any[]; onClearCart?: () => void }) {
  const hasItems = cartItems.length > 0;

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Acciones de Venta</h3>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <Button 
            size="lg" 
            className={`w-full h-12 font-semibold transition-all duration-200 ${
              hasItems 
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02]' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
            disabled={!hasItems}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Procesar Venta
          </Button>

          <Button 
            variant="outline" 
            size="lg" 
            className="w-full h-10 border-2 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200"
            disabled={!hasItems}
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Apartar Producto
          </Button>

          {hasItems && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full h-9 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
              onClick={onClearCart}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar Carrito
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
