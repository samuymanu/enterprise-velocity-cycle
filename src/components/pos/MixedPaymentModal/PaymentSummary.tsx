import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PaymentMethod } from './types';
import { formatCurrency, getPaymentIcon, getPaymentLabel, getPaymentColor } from './utils';
import { TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface PaymentSummaryProps {
  total: number;
  payments: PaymentMethod[];
  remainingAmount: number;
  onRemovePayment: (index: number) => void;
  onCompletePayment: () => void;
  onCancel: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  total,
  payments,
  remainingAmount,
  onRemovePayment,
  onCompletePayment,
  onCancel,
  loading = false,
  disabled = false
}) => {
  const paidAmount = total - remainingAmount;
  const progressPercentage = total > 0 ? (paidAmount / total) * 100 : 0;
  const isComplete = remainingAmount <= 0.01;
  const hasPayments = payments.length > 0;

  return (
    <div className="space-y-4">
      {/* Resumen Financiero */}
      <Card className="border-l-4 border-l-green-500 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Resumen de Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Total</div>
              <div className="font-bold text-lg text-gray-900">{formatCurrency(total)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Pagado</div>
              <div className="font-bold text-lg text-green-600">{formatCurrency(paidAmount)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Restante</div>
              <div className={`font-bold text-lg ${isComplete ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(remainingAmount)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Progreso del pago</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
          </div>

          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            isComplete 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            {isComplete ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Pago completo - Listo para procesar</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <span>Falta {formatCurrency(remainingAmount)} para completar</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pagos Aplicados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Pagos Aplicados</span>
            {hasPayments && (
              <Badge variant="secondary" className="text-xs">
                {payments.length} método{payments.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasPayments ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No hay pagos aplicados</p>
              <p className="text-gray-400 text-xs mt-1">Agrega un método de pago para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment, index) => {
                const IconComponent = getPaymentIcon(payment.type);
                return (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm ${getPaymentColor(payment.type)}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {getPaymentLabel(payment.type)}
                        </div>
                        <div className="text-xs opacity-75">
                          {payment.details?.reference && (
                            <span>Ref: {payment.details.reference}</span>
                          )}
                          {payment.details?.wallet && (
                            <span>Wallet: {payment.details.wallet.slice(0, 8)}...</span>
                          )}
                          {payment.details?.customerId && (
                            <span className="ml-2">• Cliente asignado</span>
                          )}
                          {payment.details?.dueDate && (
                            <span className="ml-2">• Vence: {new Date(payment.details.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(payment.amount)}</div>
                        {payment.details?.totalAmount && (
                          <div className="text-xs opacity-75">
                            Total: {formatCurrency(payment.details.totalAmount)}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemovePayment(index)}
                        disabled={disabled || loading}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={onCancel} 
          variant="outline" 
          disabled={loading}
          className="h-12 transition-all duration-300 hover:bg-gray-100 hover:border-gray-400 hover:shadow-md"
        >
          Cancelar
        </Button>
        <Button 
          onClick={onCompletePayment} 
          disabled={!isComplete || loading || !hasPayments}
          className={`h-12 transition-all duration-300 transform ${
            isComplete && hasPayments
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl hover:scale-105 animate-pulse' 
              : 'bg-gray-400 hover:bg-gray-500'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Procesando...
            </div>
          ) : isComplete && hasPayments ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Completar Pago</span>
            </div>
          ) : (
            'Completar Pago'
          )}
        </Button>
      </div>
    </div>
  );
};
