import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { TraditionalPayments } from './TraditionalPayments';
import { PaymentSummary } from './PaymentSummary';
import { 
  MixedPaymentModalProps, 
  PaymentMethod, 
  PaymentData, 
  PaymentFormState,
  PaymentDetails 
} from './types';

const initialFormState: PaymentFormState = {
  // Traditional payments
  cashUSDAmount: '',
  cashVESAmount: '',
  cardAmount: ''
};

export const MixedPaymentModal: React.FC<MixedPaymentModalProps> = ({ 
  open, 
  onOpenChange, 
  total, 
  cartItems, 
  onPaymentComplete 
}) => {
  const toast = useToast();
  
  // State management
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [remainingAmountState, setRemainingAmountState] = useState(total || 0);
  const [loading, setLoading] = useState(false);
  const [formState, setFormState] = useState<PaymentFormState>(initialFormState);

  // Reset form with animation states
  const resetForm = useCallback(() => {
    setFormState(initialFormState);
    setPayments([]);
  }, []);

  // Effects
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  // Update remaining amount when payments change
  useEffect(() => {
    const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const newRemainingAmount = Math.max(0, (total || 0) - paidAmount);
    setRemainingAmountState(newRemainingAmount);
  }, [payments, total]);

  // Payment management with validation
  const addPayment = useCallback((type: PaymentMethod['type'], amount: number, details?: PaymentDetails) => {
    if (amount <= 0) {
      toast.toast({ 
        title: 'Error', 
        description: 'El monto debe ser mayor a 0',
        variant: 'destructive'
      });
      return;
    }

    if (amount > remainingAmountState + 0.01) {
      toast.toast({ 
        title: 'Advertencia', 
        description: `El monto excede lo pendiente por ${((amount - remainingAmountState)).toFixed(2)}`,
        variant: 'destructive'
      });
      return;
    }

    const newPayment: PaymentMethod = { type, amount, details };
    setPayments(prev => [...prev, newPayment]);
    
    toast.toast({ 
      title: 'Pago agregado', 
      description: `${amount.toFixed(2)} USD agregado exitosamente`,
      variant: 'default'
    });
  }, [remainingAmountState, toast]);

  const removePayment = useCallback((index: number) => {
    const payment = payments[index];
    setPayments(prev => prev.filter((_, i) => i !== index));
    
    toast.toast({ 
      title: 'Pago removido', 
      description: `${payment?.amount?.toFixed(2) || '0.00'} USD removido`,
      variant: 'default'
    });
  }, [payments, toast]);

  // Traditional payment handlers
  const handleCashUSDPayment = () => {
    try {
      const amount = parseFloat(formState.cashUSDAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.toast({ title: 'Error', description: 'Monto inválido' });
        return;
      }
      addPayment('cash-usd', amount);
      setFormState(prev => ({ ...prev, cashUSDAmount: '' }));
    } catch (error) {
      console.error('Error adding USD payment:', error);
      toast.toast({ title: 'Error', description: 'Error al agregar pago USD' });
    }
  };

  const handleCashVESPayment = () => {
    try {
      const amount = parseFloat(formState.cashVESAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.toast({ title: 'Error', description: 'Monto inválido' });
        return;
      }
      addPayment('cash-ves', amount);
      setFormState(prev => ({ ...prev, cashVESAmount: '' }));
    } catch (error) {
      console.error('Error adding VES payment:', error);
      toast.toast({ title: 'Error', description: 'Error al agregar pago Bs.S' });
    }
  };

  const handleCardPayment = () => {
    try {
      const amount = parseFloat(formState.cardAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.toast({ title: 'Error', description: 'Monto inválido' });
        return;
      }
      addPayment('card', amount);
      setFormState(prev => ({ ...prev, cardAmount: '' }));
    } catch (error) {
      console.error('Error adding card payment:', error);
      toast.toast({ title: 'Error', description: 'Error al agregar pago con tarjeta' });
    }
  };

  const handleCompletePayment = async () => {
    if (remainingAmountState > 0.01) {
      toast.toast({
        title: 'Error',
        description: 'El monto total no está completamente cubierto'
      });
      return;
    }

    setLoading(true);
    try {
      const paymentData: PaymentData = {
        cartItems: cartItems || [],
        total: total || 0,
        payments: payments || [],
        paymentMethod: 'mixed'
      };

      await onPaymentComplete(paymentData);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error completing payment:', error);
      toast.toast({
        title: 'Error',
        description: 'Error al procesar el pago'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-7xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"
        aria-describedby="payment-modal-description"
      >
        <div id="payment-modal-description" className="sr-only">
          Sistema de pagos mixtos tradicionales. Permite procesar múltiples métodos de pago tradicionales para una sola transacción.
        </div>
        <DialogHeader className="pb-6 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <CreditCard className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 p-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Sistema de Pagos Mixtos Tradicionales
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-4">
                  <span>💰 Multi-método</span>
                  <span>� Efectivo</span>
                  <span>💳 Tarjeta</span>
                  <span>📊 Profesional</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total a pagar</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('es-VE', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2
                }).format(total || 0)}
              </div>
              <div className="text-xs text-gray-400">
                {payments.length} método{payments.length !== 1 ? 's' : ''} aplicado{payments.length !== 1 ? 's' : ''}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(95vh-140px)] p-1">
          {/* Columna 1: Pagos Tradicionales */}
          <div className="space-y-4 lg:col-span-1">
            <TraditionalPayments
              cashUSDAmount={formState.cashUSDAmount}
              setCashUSDAmount={(value) => setFormState(prev => ({ ...prev, cashUSDAmount: value }))}
              cashVESAmount={formState.cashVESAmount}
              setCashVESAmount={(value) => setFormState(prev => ({ ...prev, cashVESAmount: value }))}
              cardAmount={formState.cardAmount}
              setCardAmount={(value) => setFormState(prev => ({ ...prev, cardAmount: value }))}
              onCashUSDPayment={handleCashUSDPayment}
              onCashVESPayment={handleCashVESPayment}
              onCardPayment={handleCardPayment}
              disabled={loading}
            />
          </div>

          {/* Columna 2: Resumen */}
          <div className="space-y-4 lg:col-span-1">
            <PaymentSummary
              total={total}
              payments={payments}
              remainingAmount={remainingAmountState}
              onRemovePayment={removePayment}
              onCompletePayment={handleCompletePayment}
              onCancel={() => onOpenChange(false)}
              loading={loading}
              disabled={loading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
