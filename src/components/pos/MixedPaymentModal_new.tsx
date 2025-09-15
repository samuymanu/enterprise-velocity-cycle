import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiService } from '@/lib/api';
import { normalizeApiArray } from '@/lib/normalizeResponse';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign, Trash2 } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  sku?: string;
  brand?: string;
  quantity: number;
  price?: number;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  phone?: string;
  email?: string;
}

interface PaymentMethod {
  type: 'cash-usd' | 'cash-ves' | 'card';
  amount: number;
  id: string; // Para identificar pagos únicamente
}

interface PaymentData {
  cartItems: CartItem[];
  total: number;
  payments: PaymentMethod[];
  paymentMethod: string;
  customerId?: string;
}

interface MixedPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  cartItems: CartItem[];
  onPaymentComplete: (paymentData: PaymentData) => void;
}

function MixedPaymentModal({ open, onOpenChange, total, cartItems, onPaymentComplete }: MixedPaymentModalProps) {
  const { toast } = useToast();
  
  // Estados principales
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Inputs para montos
  const [usdAmount, setUsdAmount] = useState('');
  const [vesAmount, setVesAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');

  // Calcular totales
  const totalPaid = useMemo(() => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  }, [payments]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, total - totalPaid);
  }, [total, totalPaid]);

  const isPaymentComplete = useMemo(() => {
    return remainingAmount <= 0.01;
  }, [remainingAmount]);

  // Cargar clientes al abrir el modal
  const loadCustomers = useCallback(async () => {
    if (!open) return;
    
    try {
      setLoadingCustomers(true);
      const response = await apiService.customers.getAll();
      const customerList = normalizeApiArray(response) as Customer[];
      setCustomers(customerList);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes',
        variant: 'destructive'
      });
    } finally {
      setLoadingCustomers(false);
    }
  }, [open, toast]);

  // Resetear formulario
  const resetForm = useCallback(() => {
    setPayments([]);
    setUsdAmount('');
    setVesAmount('');
    setCardAmount('');
    setSelectedCustomer(null);
  }, []);

  // Efecto para cargar clientes y resetear cuando se abre
  useEffect(() => {
    if (open) {
      loadCustomers();
      resetForm();
    }
  }, [open, loadCustomers, resetForm]);

  // Añadir pago
  const addPayment = useCallback((type: PaymentMethod['type'], amount: number) => {
    if (amount <= 0 || isNaN(amount)) {
      toast({
        title: 'Error',
        description: 'El monto debe ser mayor a 0',
        variant: 'destructive'
      });
      return;
    }

    if (amount > remainingAmount) {
      toast({
        title: 'Error',
        description: 'El monto no puede ser mayor al restante',
        variant: 'destructive'
      });
      return;
    }

    const newPayment: PaymentMethod = {
      type,
      amount,
      id: `${type}-${Date.now()}-${Math.random()}`
    };

    setPayments(prev => [...prev, newPayment]);
  }, [remainingAmount, toast]);

  // Remover pago
  const removePayment = useCallback((id: string) => {
    setPayments(prev => prev.filter(payment => payment.id !== id));
  }, []);

  // Handlers para cada tipo de pago
  const handleAddUSD = useCallback(() => {
    const amount = parseFloat(usdAmount);
    if (!isNaN(amount) && amount > 0) {
      addPayment('cash-usd', amount);
      setUsdAmount('');
    }
  }, [usdAmount, addPayment]);

  const handleAddVES = useCallback(() => {
    const amount = parseFloat(vesAmount);
    if (!isNaN(amount) && amount > 0) {
      addPayment('cash-ves', amount);
      setVesAmount('');
    }
  }, [vesAmount, addPayment]);

  const handleAddCard = useCallback(() => {
    const amount = parseFloat(cardAmount);
    if (!isNaN(amount) && amount > 0) {
      addPayment('card', amount);
      setCardAmount('');
    }
  }, [cardAmount, addPayment]);

  // Completar pago
  const handleCompletePayment = useCallback(async () => {
    if (!isPaymentComplete) {
      toast({
        title: 'Error',
        description: 'Debe completar el pago total antes de procesar',
        variant: 'destructive'
      });
      return;
    }

    if (payments.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe agregar al menos un método de pago',
        variant: 'destructive'
      });
      return;
    }

    try {
      setProcessing(true);

      const paymentData: PaymentData = {
        cartItems: cartItems || [],
        total: total || 0,
        payments: payments,
        paymentMethod: 'mixed',
        customerId: selectedCustomer?.id
      };

      await onPaymentComplete(paymentData);
      onOpenChange(false);
      resetForm();

      toast({
        title: 'Éxito',
        description: 'Pago procesado correctamente',
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Error',
        description: 'Error al procesar el pago',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  }, [isPaymentComplete, payments, cartItems, total, selectedCustomer, onPaymentComplete, onOpenChange, resetForm, toast]);

  // Formatear moneda
  const formatCurrency = useCallback((amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  // Obtener icono y label del tipo de pago
  const getPaymentDisplay = useCallback((type: PaymentMethod['type']) => {
    switch (type) {
      case 'cash-usd':
        return { icon: <DollarSign className="h-4 w-4" />, label: 'Efectivo USD' };
      case 'cash-ves':
        return { icon: <DollarSign className="h-4 w-4" />, label: 'Efectivo Bs.S' };
      case 'card':
        return { icon: <CreditCard className="h-4 w-4" />, label: 'Tarjeta' };
      default:
        return { icon: <DollarSign className="h-4 w-4" />, label: type };
    }
  }, []);

  // Verificar si se puede agregar pago
  const canAddPayment = !processing && total > 0 && remainingAmount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pago Mixto
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo - Métodos de pago */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Métodos de Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {total <= 0 && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Agrega productos al carrito para habilitar los pagos
                    </p>
                  </div>
                )}

                {total > 0 && (
                  <>
                    {/* Efectivo USD */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Efectivo USD</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={usdAmount}
                          onChange={(e) => setUsdAmount(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddUSD()}
                          disabled={!canAddPayment}
                          step="0.01"
                          min="0"
                          max={remainingAmount}
                        />
                        <Button 
                          onClick={handleAddUSD} 
                          disabled={!canAddPayment || !usdAmount || parseFloat(usdAmount) <= 0}
                          size="sm"
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>

                    {/* Efectivo Bolívares */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Efectivo Bs.S</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={vesAmount}
                          onChange={(e) => setVesAmount(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddVES()}
                          disabled={!canAddPayment}
                          step="0.01"
                          min="0"
                          max={remainingAmount}
                        />
                        <Button 
                          onClick={handleAddVES} 
                          disabled={!canAddPayment || !vesAmount || parseFloat(vesAmount) <= 0}
                          size="sm"
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>

                    {/* Tarjeta */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tarjeta</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={cardAmount}
                          onChange={(e) => setCardAmount(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddCard()}
                          disabled={!canAddPayment}
                          step="0.01"
                          min="0"
                          max={remainingAmount}
                        />
                        <Button 
                          onClick={handleAddCard} 
                          disabled={!canAddPayment || !cardAmount || parseFloat(cardAmount) <= 0}
                          size="sm"
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Panel derecho - Resumen */}
          <div className="space-y-4">
            {/* Resumen de venta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen de Venta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="font-bold text-lg">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pagado:</span>
                    <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm text-gray-600">Restante:</span>
                    <span className={`font-bold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(remainingAmount)}
                    </span>
                  </div>
                  {isPaymentComplete && (
                    <div className="text-center p-2 bg-green-50 text-green-700 rounded-lg">
                      ✓ Pago completado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pagos aplicados */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pagos Aplicados</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center p-4 text-gray-500">
                    No hay pagos aplicados
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((payment) => {
                      const { icon, label } = getPaymentDisplay(payment.type);
                      return (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            {icon}
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatCurrency(payment.amount)}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removePayment(payment.id)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="flex-1"
                disabled={processing}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCompletePayment} 
                disabled={!isPaymentComplete || processing || payments.length === 0}
                className="flex-1"
              >
                {processing ? 'Procesando...' : 'Completar Pago'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { MixedPaymentModal };
