import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, CreditCard, HelpCircle, TrendingUp } from 'lucide-react';
import { validateAmount } from './utils';

interface TraditionalPaymentsProps {
  cashUSDAmount: string;
  setCashUSDAmount: (value: string) => void;
  cashVESAmount: string;
  setCashVESAmount: (value: string) => void;
  cardAmount: string;
  setCardAmount: (value: string) => void;
  onCashUSDPayment: () => void;
  onCashVESPayment: () => void;
  onCardPayment: () => void;
  disabled?: boolean;
}

export const TraditionalPayments: React.FC<TraditionalPaymentsProps> = ({
  cashUSDAmount,
  setCashUSDAmount,
  cashVESAmount,
  setCashVESAmount,
  cardAmount,
  setCardAmount,
  onCashUSDPayment,
  onCashVESPayment,
  onCardPayment,
  disabled = false
}) => {
  const cashUSDValidation = validateAmount(cashUSDAmount);
  const cashVESValidation = validateAmount(cashVESAmount);
  const cardValidation = validateAmount(cardAmount);

  return (
    <TooltipProvider>
      <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>Pagos Tradicionales</span>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Métodos de pago convencionales aceptados</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Efectivo USD */}
        <div className="space-y-2">
          <Label htmlFor="cash-usd" className="text-sm font-medium">
            Efectivo USD
          </Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="cash-usd"
                type="number"
                placeholder="0.00"
                value={cashUSDAmount}
                onChange={(e) => setCashUSDAmount(e.target.value)}
                step="0.01"
                min="0"
                disabled={disabled}
                className={!cashUSDValidation.isValid && cashUSDAmount ? 'border-red-500' : ''}
              />
              {!cashUSDValidation.isValid && cashUSDAmount && (
                <p className="text-xs text-red-600 mt-1">{cashUSDValidation.error}</p>
              )}
            </div>
            <Button 
              onClick={onCashUSDPayment} 
              size="sm" 
              variant="outline"
              disabled={disabled || !cashUSDValidation.isValid}
              className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            >
              + USD
            </Button>
          </div>
        </div>

        {/* Efectivo Bs.S */}
        <div className="space-y-2">
          <Label htmlFor="cash-ves" className="text-sm font-medium">
            Efectivo Bs.S
          </Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="cash-ves"
                type="number"
                placeholder="0.00"
                value={cashVESAmount}
                onChange={(e) => setCashVESAmount(e.target.value)}
                step="0.01"
                min="0"
                disabled={disabled}
                className={!cashVESValidation.isValid && cashVESAmount ? 'border-red-500' : ''}
              />
              {!cashVESValidation.isValid && cashVESAmount && (
                <p className="text-xs text-red-600 mt-1">{cashVESValidation.error}</p>
              )}
            </div>
            <Button 
              onClick={onCashVESPayment} 
              size="sm" 
              variant="outline"
              disabled={disabled || !cashVESValidation.isValid}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              + Bs.S
            </Button>
          </div>
        </div>

        {/* Tarjeta */}
        <div className="space-y-2">
          <Label htmlFor="card" className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Tarjeta de Débito/Crédito
          </Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="card"
                type="number"
                placeholder="0.00"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                step="0.01"
                min="0"
                disabled={disabled}
                className={!cardValidation.isValid && cardAmount ? 'border-red-500' : ''}
              />
              {!cardValidation.isValid && cardAmount && (
                <p className="text-xs text-red-600 mt-1">{cardValidation.error}</p>
              )}
            </div>
            <Button 
              onClick={onCardPayment} 
              size="sm" 
              variant="outline"
              disabled={disabled || !cardValidation.isValid}
              className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
            >
              + Tarjeta
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};
