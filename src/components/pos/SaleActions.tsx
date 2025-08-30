import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, CreditCard } from "lucide-react";

export function SaleActions({ 
  cartItems = [], 
  onOpenSpecialPayment 
}: { 
  cartItems?: any[]; 
  onOpenSpecialPayment?: () => void;
}) {
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
            variant="outline" 
            size="lg" 
            className="w-full h-10 border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
            disabled={!hasItems}
            onClick={onOpenSpecialPayment}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Pagos Especiales
          </Button>

          {/* Nota: El control de 'Limpiar Carrito' se movió al componente ShoppingCart para estar más cerca del listado */}
        </div>
      </div>
    </div>
  );
}
