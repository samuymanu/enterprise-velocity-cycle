import { Button } from "@/components/ui/button";
import { CreditCard, DollarSign, Smartphone, Bitcoin, Check } from "lucide-react";
import { useState } from "react";

export function PaymentMethods() {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const paymentMethods = [
    { id: 'cash-ves', name: 'Efectivo VES', icon: DollarSign, color: 'green', bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800', textColor: 'text-green-700 dark:text-green-300' },
    { id: 'cash-usd', name: 'Efectivo USD', icon: DollarSign, color: 'emerald', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-200 dark:border-emerald-800', textColor: 'text-emerald-700 dark:text-emerald-300' },
    { id: 'card', name: 'Tarjeta', icon: CreditCard, color: 'blue', bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800', textColor: 'text-blue-700 dark:text-blue-300' },
    { id: 'zelle', name: 'Zelle', icon: Smartphone, color: 'purple', bgColor: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-200 dark:border-purple-800', textColor: 'text-purple-700 dark:text-purple-300' },
    { id: 'crypto', name: 'Crypto', icon: Bitcoin, color: 'orange', bgColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-200 dark:border-orange-800', textColor: 'text-orange-700 dark:text-orange-300' },
  ];

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
          <div className="space-y-2">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(isSelected ? null : method.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 group ${
                    isSelected
                      ? `${method.bgColor} ${method.borderColor} shadow-sm`
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md ${isSelected ? method.bgColor : 'bg-gray-100 dark:bg-gray-600'}`}>
                      <Icon className={`h-4 w-4 ${isSelected ? method.textColor : 'text-gray-600 dark:text-gray-300'}`} />
                    </div>
                    <span className={`font-medium text-sm ${isSelected ? method.textColor : 'text-gray-700 dark:text-gray-300'}`}>
                      {method.name}
                    </span>
                  </div>
                  
                  {isSelected && (
                    <div className={`p-1 rounded-full ${method.bgColor}`}>
                      <Check className={`h-3 w-3 ${method.textColor}`} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedMethod && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                Método seleccionado: <span className="font-medium">{paymentMethods.find(m => m.id === selectedMethod)?.name}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
