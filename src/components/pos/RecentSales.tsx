import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { apiService } from "@/lib/api";
import { Eye, RefreshCw } from "lucide-react";

interface Sale {
  id: string;
  saleNumber: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  customer?: {
    firstName: string;
    lastName: string;
    documentNumber?: string;
  };
  items_detail?: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
  status: string;
}

interface SaleDetailsModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

function SaleDetailsModal({ sale, isOpen, onClose }: SaleDetailsModalProps) {
  if (!isOpen || !sale) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Detalle de Venta
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {sale.saleNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Cliente:</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : 'Cliente General'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Método de Pago:</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {getPaymentMethodLabel(sale.paymentMethod)}
              </p>
              {(sale.paymentMethod === 'MIXED' || sale.paymentMethod === 'mixed') && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  💳 Pago combinado (USD + Bs.S)
                </p>
              )}
              {(sale.paymentMethod === 'SPECIAL' || sale.paymentMethod === 'special') && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  ⭐ Pago especial (condiciones particulares)
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Fecha:</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {new Date(sale.createdAt).toLocaleString('es-VE')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Total:</label>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(sale.total)}
              </p>
            </div>
          </div>

          {/* Items de la venta */}
          {sale.items_detail && sale.items_detail.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Productos Vendidos
              </h3>
              <div className="space-y-2">
                {sale.items_detail.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Cantidad: {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    'CASH_USD': 'Efectivo USD',
    'CASH_VES': 'Efectivo Bs.S',
    'CARD': 'Tarjeta',
    'TRANSFER': 'Transferencia',
    'MIXED': 'Pago Mixto',
    'SPECIAL': 'Pago Especial',
    'cash-usd': 'Efectivo USD',
    'cash-ves': 'Efectivo Bs.S',
    'card': 'Tarjeta',
    'transfer': 'Transferencia',
    'mixed': 'Pago Mixto',
    'special': 'Pago Especial'
  };
  return labels[method] || method;
};

export function RecentSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadRecentSales();
  }, []);

  const loadRecentSales = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando ventas recientes...');

      // Intentar cargar ventas
      let response = await apiService.sales.getRecent(10);
      console.log('📊 Respuesta inicial de ventas:', response);

      // Si falla por autenticación, intentar login automático
      if (!response.success && (
        response.error?.includes('401') ||
        response.error?.includes('Token') ||
        response.error?.includes('autenticación') ||
        response.error?.includes('inválido') ||
        response.error?.includes('expirado') ||
        response.status === 401
      )) {
        console.log('🔐 Error de autenticación detectado, intentando login automático...');
        try {
          const loginResult = await apiService.auth.autoLogin();
          console.log('✅ Login automático exitoso:', loginResult);

          // Reintentar cargar ventas después del login
          console.log('🔄 Reintentando cargar ventas después del login...');
          response = await apiService.sales.getRecent(10);
          console.log('📊 Respuesta después del login:', response);
        } catch (loginError) {
          console.error('❌ Error en login automático:', loginError);
          // Mostrar notificación de error
          console.error('No se pudo autenticar automáticamente. Las ventas podrían no cargarse.');
        }
      }

      if (response.success && response.sales) {
        console.log('✅ Ventas cargadas exitosamente:', response.sales.length, 'ventas');
        setSales(response.sales);
      } else {
        console.warn('⚠️ No se pudieron cargar las ventas:', response);
        setSales([]);
      }
    } catch (error) {
      console.error('❌ Error loading recent sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const openSaleDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setShowModal(true);
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Ventas del Día</h3>
          <Button size="sm" variant="outline" disabled>
            <RefreshCw className="h-4 w-4 animate-spin" />
          </Button>
        </div>
        <div className="text-center text-muted-foreground py-4">
          <p>🔄 Cargando ventas...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Ventas del Día</h3>
          <Button size="sm" variant="outline" onClick={loadRecentSales}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar
          </Button>
        </div>
        
        {sales.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <p>📊 No hay ventas registradas hoy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {sale.customer?.documentNumber || 'S/N'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {getPaymentMethodLabel(sale.paymentMethod)}
                    </Badge>
                    {sale.status && (
                      <Badge variant={sale.status === 'COMPLETED' ? 'default' : 'outline'} className="text-xs">
                        {sale.status}
                      </Badge>
                    )}
                  </div>
                  {sale.customer && (
                    <p className="text-xs text-muted-foreground">
                      {sale.customer.firstName} {sale.customer.lastName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(sale.createdAt).toLocaleString('es-VE', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(sale.total)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openSaleDetails(sale)}
                    className="p-1 h-8 w-8"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SaleDetailsModal
        sale={selectedSale}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedSale(null);
        }}
      />
    </>
  );
}
