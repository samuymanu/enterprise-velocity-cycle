import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiService } from '@/lib/api';
import { normalizeApiArray } from '@/lib/normalizeResponse';
import { useToast } from '@/hooks/use-toast';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { CreditCard, DollarSign, Banknote, CheckCircle, Trash2, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from './MixedPaymentModal/utils';

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
  const { rates } = useExchangeRates();
  
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

  // Tasa de cambio del sistema
  const exchangeRate = rates.bcv;

  // Funciones de conversión
  const convertUSDtoVES = useCallback((usd: number) => usd * exchangeRate, [exchangeRate]);
  const convertVEStoUSD = useCallback((ves: number) => ves / exchangeRate, [exchangeRate]);

  // Calcular totales en USD (todo se normaliza a USD)
  const totalPaid = useMemo(() => {
    return payments.reduce((sum, payment) => {
      if (payment.type === 'cash-ves') {
        // Convertir Bs.S a USD
        return sum + convertVEStoUSD(payment.amount);
      }
      // USD y tarjeta se cuentan directamente
      return sum + payment.amount;
    }, 0);
  }, [payments, convertVEStoUSD]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, total - totalPaid);
  }, [total, totalPaid]);

  const isPaymentComplete = useMemo(() => {
    return remainingAmount <= 0.01;
  }, [remainingAmount]);

  // Cargar clientes al abrir el modal
  const loadCustomers = useCallback(async () => {
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
  }, [toast]);

  // Resetear formulario
  const resetForm = useCallback(() => {
    setPayments([]);
    setUsdAmount('');
    setVesAmount('');
    setCardAmount('');
    setSelectedCustomer(null);
  }, []);

  // Efecto para cargar clientes y resetear cuando se abre (solo una vez por apertura)
  useEffect(() => {
    if (open) {
      resetForm();
      loadCustomers();
    }
  }, [open]); // Solo depende de 'open', no de las funciones

  // Formatear moneda
  // (Eliminado: declaración duplicada de formatCurrency)

  // (Eliminado: declaración duplicada de formatCurrency)

  // Usamos la función `formatCurrency` centralizada importada desde ./MixedPaymentModal/utils

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

    // Convertir el monto a USD para validación consistente
    let amountInUSD = amount;
    if (type === 'cash-ves') {
      amountInUSD = convertVEStoUSD(amount);
    }

    if (amountInUSD > remainingAmount) {
      const remainingInCurrency = type === 'cash-ves'
        ? convertUSDtoVES(remainingAmount)
        : remainingAmount;

      toast({
        title: 'Error',
        description: `El monto no puede ser mayor al restante. Máximo: ${formatCurrency(remainingInCurrency, type === 'cash-ves' ? 'VES' : 'USD')}`,
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
  }, [remainingAmount, toast, convertVEStoUSD, convertUSDtoVES]);

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
  // La función `formatCurrency` ya está declarada más arriba (una sola declaración para todo el módulo).
  // Formatear conversión de monedas
  const formatWithConversion = useCallback((amount: number, fromCurrency: 'USD' | 'VES') => {
    if (fromCurrency === 'USD') {
      const vesAmount = convertUSDtoVES(amount);
      return {
        primary: formatCurrency(amount, 'USD'),
        secondary: formatCurrency(vesAmount, 'VES')
      };
    } else {
      const usdAmount = convertVEStoUSD(amount);
      return {
        primary: formatCurrency(amount, 'VES'),
        secondary: formatCurrency(usdAmount, 'USD')
      };
    }
  }, [convertUSDtoVES, convertVEStoUSD]);

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
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Métodos de Pago
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Selecciona cómo deseas recibir el pago. Puedes combinar diferentes métodos.
                </p>
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
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <label className="text-sm font-medium">Efectivo en Dólares (USD)</label>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            placeholder="Ingresa el monto en USD"
                            value={usdAmount}
                            onChange={(e) => setUsdAmount(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddUSD()}
                            disabled={processing}
                            step="0.01"
                            min="0"
                            className="text-lg"
                          />
                          {usdAmount && parseFloat(usdAmount) > 0 && (
                            <div className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 rounded">
                              💡 Este monto equivale a <strong>{formatCurrency(convertUSDtoVES(parseFloat(usdAmount)), 'VES')}</strong> en bolívares
                            </div>
                          )}
                        </div>
                        <Button 
                          onClick={handleAddUSD} 
                          disabled={processing || !usdAmount || parseFloat(usdAmount) <= 0 || remainingAmount <= 0}
                          size="sm"
                          className="px-6"
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>

                    {/* Efectivo Bolívares */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-yellow-600" />
                        <label className="text-sm font-medium">Efectivo en Bolívares (Bs.S)</label>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            placeholder="Ingresa el monto en Bs.S"
                            value={vesAmount}
                            onChange={(e) => setVesAmount(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddVES()}
                            disabled={processing}
                            step="0.01"
                            min="0"
                            className="text-lg"
                          />
                          {vesAmount && parseFloat(vesAmount) > 0 && (
                            <div className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 rounded">
                              💡 Este monto equivale a <strong>{formatCurrency(convertVEStoUSD(parseFloat(vesAmount)), 'USD')}</strong> en dólares
                            </div>
                          )}
                        </div>
                        <Button 
                          onClick={handleAddVES} 
                          disabled={processing || !vesAmount || parseFloat(vesAmount) <= 0 || remainingAmount <= 0}
                          size="sm"
                          className="px-6"
                        >
                          Agregar
                        </Button>
                      </div>
                    </div>

                    {/* Tarjeta */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <label className="text-sm font-medium">Pago con Tarjeta (USD)</label>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            type="number"
                            placeholder="Ingresa el monto de la tarjeta"
                            value={cardAmount}
                            onChange={(e) => setCardAmount(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddCard()}
                            disabled={processing}
                            step="0.01"
                            min="0"
                            className="text-lg"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Los pagos con tarjeta se procesan en dólares
                          </div>
                        </div>
                        <Button 
                          onClick={handleAddCard} 
                          disabled={processing || !cardAmount || parseFloat(cardAmount) <= 0 || remainingAmount <= 0}
                          size="sm"
                          className="px-6"
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
                <div className="space-y-4">
                  {/* Total de la venta */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700">Total de la Venta:</span>
                      <div className="text-right">
                        <div className="font-bold text-lg text-blue-900">{formatCurrency(total, 'USD')}</div>
                        <div className="text-xs text-blue-600">
                          Equivale a {formatCurrency(convertUSDtoVES(total), 'VES')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total pagado */}
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700">Total Pagado:</span>
                      <div className="text-right">
                        <div className="font-bold text-lg text-green-800">{formatCurrency(totalPaid, 'USD')}</div>
                        <div className="text-xs text-green-600">
                          Equivale a {formatCurrency(convertUSDtoVES(totalPaid), 'VES')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Falta por pagar */}
                  {remainingAmount > 0 ? (
                    <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-red-700 mb-2">Falta por Pagar:</div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-2 bg-white rounded border">
                            <div className="text-xs text-gray-500 mb-1">Puedes pagar con USD:</div>
                            <div className="font-bold text-lg text-red-600">
                              {formatCurrency(remainingAmount, 'USD')}
                            </div>
                          </div>
                          
                          <div className="text-center p-2 bg-white rounded border">
                            <div className="text-xs text-gray-500 mb-1">O puedes pagar con Bs.S:</div>
                            <div className="font-bold text-lg text-red-600">
                              {formatCurrency(convertUSDtoVES(remainingAmount), 'VES')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-center text-gray-500 mt-2">
                          Tasa BCV: {formatCurrency(exchangeRate, 'VES')} por USD
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                      <div className="text-center">
                        <div className="text-2xl mb-2">✅</div>
                        <div className="text-green-700 font-medium">¡Pago Completado!</div>
                        <div className="text-xs text-green-600 mt-1">
                          La venta ha sido pagada en su totalidad
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pagos aplicados */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Pagos Aplicados
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {payments.length === 0 
                    ? "Aún no se han aplicado pagos" 
                    : `${payments.length} pago${payments.length > 1 ? 's' : ''} aplicado${payments.length > 1 ? 's' : ''}`
                  }
                </p>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-4xl mb-2">💳</div>
                    <p className="text-sm text-gray-600 font-medium">No hay pagos aplicados</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Agrega un pago usando los métodos de la izquierda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => {
                      const { icon, label } = getPaymentDisplay(payment.type);
                      return (
                        <div key={payment.id} className="bg-white border rounded-lg p-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-50 rounded-full">
                                {icon}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{label}</div>
                                <div className="text-lg font-bold text-gray-900">
                                  {formatCurrency(payment.amount, payment.type === 'cash-ves' ? 'VES' : 'USD')}
                                </div>
                                <div className="text-xs text-blue-600">
                                  {payment.type === 'cash-usd' ? 
                                    `Equivale a ${formatCurrency(convertUSDtoVES(payment.amount), 'VES')}` :
                                    payment.type === 'cash-ves' ?
                                    `Equivale a ${formatCurrency(convertVEStoUSD(payment.amount), 'USD')}` :
                                    'Procesado en dólares'
                                  }
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removePayment(payment.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
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
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                className="flex-1 h-12"
                disabled={processing}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCompletePayment} 
                disabled={!isPaymentComplete || processing || payments.length === 0}
                className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {processing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Procesando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Completar Pago
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { MixedPaymentModal };
