import { CreditCard } from "lucide-react";
import { useExchangeRates } from "@/hooks/useExchangeRates";

const formatCurrency = (value: number, currency = 'USD') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch (err) {
    return `${currency} ${value.toFixed(2)}`;
  }
}

const formatCurrencyVES = (value: number) => {
  try {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 0 }).format(value);
  } catch (err) {
    return `Bs.${value.toLocaleString('es-VE')}`;
  }
}

const formatAmountWithCode = (value: number, code: string) => {
  // Intl may not support custom local codes; show code + formatted number
  try {
    return `${code} ${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2 }).format(value)}`;
  } catch (err) {
    return `${code} ${value.toFixed(2)}`;
  }
}

function QuickPayButton({ onClick, bg = 'bg-gray-200', label, bordered = false, textClass = 'text-white' }: { onClick?: () => void; bg?: string; label: string; bordered?: boolean; textClass?: string }) {
  return (
    <button onClick={onClick} className={`${bg} ${bordered ? 'border' : ''} w-full rounded-md py-2 font-medium shadow-sm ${textClass}`}>
      {label}
    </button>
  )
}

export function PaymentMethods({ total = 0, onQuickPay }: { total?: number; onQuickPay?: (method: string, amount?: number) => void }) {
  const { rates } = useExchangeRates();
  const totalInVES = total * rates.bcv;

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Métodos de Pago</h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Quick Payments panel */}
          <div className="mb-4 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gradient-to-b from-green-50 to-white dark:from-green-900/10">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Pagos Rápidos</h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 text-center">Completar venta directamente</p>
            <div className="text-center mb-3">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(total, 'USD')}</div>
              <div className="text-sm text-gray-500">{formatCurrencyVES(totalInVES)}</div>
            </div>
            <div className="space-y-2">
              <QuickPayButton onClick={() => onQuickPay?.('cash-usd', total)} bg="bg-emerald-500" label={`Efectivo USD — ${formatCurrency(total, 'USD')}`} />
              <QuickPayButton onClick={() => onQuickPay?.('cash-ves', totalInVES)} bg="bg-blue-600" label={`Efectivo Bs.S — ${formatCurrencyVES(totalInVES)}`} />
              <QuickPayButton onClick={() => onQuickPay?.('card', totalInVES)} bg="bg-purple-600" label={`Tarjeta Bs.S — ${formatCurrencyVES(totalInVES)}`} />
              <QuickPayButton onClick={() => onQuickPay?.('mixed')} bg="bg-white border" textClass="text-gray-700" label={`Pago Mixto`} bordered />
            </div>
          </div>

          {/* Detailed methods moved to modal for Pago Mixto; quick payments only here */}
        </div>
      </div>
    </div>
  );
}
