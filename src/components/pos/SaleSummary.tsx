import { Calculator, TrendingUp, Percent, X } from "lucide-react";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
}

export function SaleSummary({ 
  cartItems = [],
  discount: externalDiscount,
  onDiscountChange
}: { 
  cartItems?: Array<{ price?: number; quantity: number }>;
  discount?: Discount | null;
  onDiscountChange?: (discount: Discount | null) => void;
}) {
  const { rates } = useExchangeRates();
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  
  // Calcular descuento
  let discountAmount = 0;
  if (externalDiscount) {
    if (externalDiscount.type === 'percentage') {
      discountAmount = subtotal * (externalDiscount.value / 100);
    } else {
      discountAmount = externalDiscount.value;
    }
  }
  
  const total = subtotal - discountAmount;

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

  const applyDiscount = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) return;

    // Validar que el descuento no sea mayor al subtotal
    const maxDiscount = discountType === 'percentage' ? 100 : subtotal;
    if (value > maxDiscount) {
      alert(`El descuento no puede ser mayor a ${discountType === 'percentage' ? '100%' : formatCurrencyUSD(subtotal)}`);
      return;
    }

    const newDiscount: Discount = {
      type: discountType,
      value,
      reason: discountReason || undefined
    };

    onDiscountChange?.(newDiscount);
    setShowDiscountInput(false);
    setDiscountValue('');
    setDiscountReason('');
  };

  const removeDiscount = () => {
    onDiscountChange?.(null);
  };

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
          
          {/* Sección de descuento */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-1">
                <span className="text-gray-600 dark:text-gray-400">Descuento:</span>
                {!externalDiscount && !showDiscountInput && (
                  <button
                    onClick={() => setShowDiscountInput(true)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Percent className="h-3 w-3" />
                  </button>
                )}
                {externalDiscount && (
                  <button
                    onClick={removeDiscount}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900 dark:text-white">-{formatCurrencyUSD(discountAmount)}</div>
                <div className="text-gray-500 dark:text-gray-400">-{formatCurrencyVES(convertToVES(discountAmount))}</div>
              </div>
            </div>

            {/* Input de descuento */}
            {showDiscountInput && (
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs space-y-2">
                <div className="flex gap-1">
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="text-xs px-1 py-1 border rounded"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">$</option>
                  </select>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? '10' : '5.00'}
                    className="text-xs flex-1"
                  />
                </div>
                <Input
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="Motivo del descuento (opcional)"
                  className="text-xs"
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={applyDiscount} className="text-xs px-2 py-1">
                    Aplicar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDiscountInput(false)} className="text-xs px-2 py-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Mostrar descuento aplicado */}
            {externalDiscount && (
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {externalDiscount.type === 'percentage' ? `${externalDiscount.value}%` : formatCurrencyUSD(externalDiscount.value)}
                {externalDiscount.reason && ` - ${externalDiscount.reason}`}
              </div>
            )}
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
