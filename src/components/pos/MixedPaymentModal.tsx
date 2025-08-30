import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiService } from '@/lib/api';
import { normalizeApiArray } from '@/lib/normalizeResponse';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign } from 'lucide-react';

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

interface PaymentDetails {
  reference?: string;
  wallet?: string;
  customerId?: string;
  totalAmount?: number;
  dueDate?: string;
  remainingAmount?: number;
}

interface PaymentMethod {
  type: 'cash-usd' | 'cash-ves' | 'card';
  amount: number;
  details?: PaymentDetails;
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

function MixedPaymentModalComponent({ open, onOpenChange, total, cartItems, onPaymentComplete }: MixedPaymentModalProps) {
  const toast = useToast();
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [remainingAmount, setRemainingAmount] = useState(total || 0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados para diferentes tipos de pago
  const [cashUSDAmount, setCashUSDAmount] = useState('');
  const [cashVESAmount, setCashVESAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.customers.getAll();
      const list = normalizeApiArray(response) as Customer[];
      setCustomers(list);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes'
      });
      // No romper el modal por error de clientes
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]); // incluir toast en dependencias para reglas de hooks

  const resetForm = useCallback(() => {
    setPayments([]);
    setCashUSDAmount('');
    setCashVESAmount('');
    setCardAmount('');
    setSelectedCustomer(null);
  }, []);

  useEffect(() => {
    if (open) {
      loadCustomers();
      resetForm();
    }
  }, [open, loadCustomers, resetForm]);

  useEffect(() => {
    const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const newRemainingAmount = Math.max(0, (total || 0) - paidAmount);
    setRemainingAmount(newRemainingAmount);
  }, [payments, total]);

  const addPayment = (type: PaymentMethod['type'], amount: number, details?: PaymentDetails) => {
    if (amount <= 0) return;

    const newPayment: PaymentMethod = { type, amount, details };
    setPayments(prev => [...prev, newPayment]);
  };

  const removePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCashUSDPayment = () => {
    try {
      const amount = parseFloat(cashUSDAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.toast({ title: 'Error', description: 'Monto inválido' });
        return;
      }
      addPayment('cash-usd', amount);
      setCashUSDAmount('');
    } catch (error) {
      console.error('Error adding USD payment:', error);
      toast.toast({ title: 'Error', description: 'Error al agregar pago USD' });
    }
  };

  const handleCashVESPayment = () => {
    try {
      const amount = parseFloat(cashVESAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.toast({ title: 'Error', description: 'Monto inválido' });
        return;
      }
      addPayment('cash-ves', amount);
      setCashVESAmount('');
    } catch (error) {
      console.error('Error adding VES payment:', error);
      toast.toast({ title: 'Error', description: 'Error al agregar pago Bs.S' });
    }
  };

  const handleCardPayment = () => {
    try {
      const amount = parseFloat(cardAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.toast({ title: 'Error', description: 'Monto inválido' });
        return;
      }
      addPayment('card', amount);
      setCardAmount('');
    } catch (error) {
      console.error('Error adding card payment:', error);
      toast.toast({ title: 'Error', description: 'Error al agregar pago con tarjeta' });
    }
  };

  const handleCompletePayment = async () => {
    if ((remainingAmount || 0) > 0.01) {
      toast.toast({
        title: 'Error',
        description: 'El monto total no está completamente cubierto'
      });
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        cartItems: cartItems || [],
        total: total || 0,
        payments: payments || [],
        paymentMethod: 'mixed',
        customerId: selectedCustomer?.id
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

  const formatCurrency = (amount: number, currency = 'USD') => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(safeAmount);
  };

  const formatAmountWithCode = (amount: number, code: string) => {
    return `${code} ${amount.toFixed(2)}`;
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'cash-usd': return <DollarSign className="h-4 w-4" />;
      case 'cash-ves': return <DollarSign className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentLabel = (type: string) => {
    switch (type) {
      case 'cash-usd': return 'Efectivo USD';
      case 'cash-ves': return 'Efectivo Bs.S';
      case 'card': return 'Tarjeta';
      default: return type;
    }
  };

  // Safe customers array to avoid runtime errors when API returns unexpected shapes
  const safeCustomers = Array.isArray(customers) ? customers : [];

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
                {/* Pagos tradicionales */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Pagos Tradicionales</h4>

                  {/* Efectivo USD */}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Monto USD"
                      value={cashUSDAmount}
                      onChange={(e) => setCashUSDAmount(e.target.value)}
                      step="0.01"
                    />
                    <Button onClick={handleCashUSDPayment} size="sm" variant="outline">
                      + USD
                    </Button>
                  </div>

                  {/* Efectivo Bs.S */}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Monto Bs.S"
                      value={cashVESAmount}
                      onChange={(e) => setCashVESAmount(e.target.value)}
                      step="0.01"
                    />
                    <Button onClick={handleCashVESPayment} size="sm" variant="outline">
                      + Bs.S
                    </Button>
                  </div>

                  {/* Tarjeta */}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Monto Tarjeta"
                      value={cardAmount}
                      onChange={(e) => setCardAmount(e.target.value)}
                      step="0.01"
                    />
                    <Button onClick={handleCardPayment} size="sm" variant="outline">
                      + Tarjeta
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Panel derecho - Resumen y pagos aplicados */}
          <div className="space-y-4">
            {/* Resumen de venta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen de Venta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <div className="text-sm text-gray-500">Total</div>
                      <div className="font-bold text-xl">{formatCurrency(total || 0)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Pagado</div>
                      <div className="text-green-600 font-medium">{formatCurrency((total || 0) - (remainingAmount || 0))}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-500">Restante</div>
                      <div className={`font-bold ${((remainingAmount || 0) > 0) ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(remainingAmount || 0)}</div>
                    </div>
                    <div className="text-xs text-gray-400">Asegúrate de cubrir el total antes de completar el pago</div>
                  </div>
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
                  <p className="text-gray-500 text-center py-4">No hay pagos aplicados</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(payment.type)}
                          <span className="text-sm">{getPaymentLabel(payment.type)}</span>
                          {payment.details && (
                            <Badge variant="secondary" className="text-xs">
                              {payment.details.reference || payment.details.wallet || 'Detalles'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removePayment(index)}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Acciones */}
            <div className="flex gap-2">
              <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">Cancelar</Button>
              <Button onClick={handleCompletePayment} disabled={(remainingAmount || 0) > 0.01 || loading} className="flex-1">
                {loading ? 'Procesando...' : 'Completar Pago'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Error Boundary class to catch rendering/runtime errors inside the modal
class MixedPaymentModalErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onClose: () => void;
}, { hasError: boolean; error?: Error }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('Error capturado en MixedPaymentModalErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Dialog open={true} onOpenChange={() => this.props.onClose()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Error en Modal</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <p className="text-red-600 mb-2">Ha ocurrido un error al cargar el modal de pago mixto.</p>
              <p className="text-sm text-gray-600 mb-4">Revisa la consola para más detalles del error.</p>
              <Button onClick={() => this.props.onClose()} className="w-full" variant="outline">Cerrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return this.props.children as any;
  }
}

const MixedPaymentModalWrapper = (props: MixedPaymentModalProps) => {
  // Wrap the functional component in the Error Boundary to handle runtime errors
  return (
    <MixedPaymentModalErrorBoundary onClose={() => props.onOpenChange(false)}>
      <MixedPaymentModalComponent {...props} />
    </MixedPaymentModalErrorBoundary>
  );
};

export { MixedPaymentModalWrapper as MixedPaymentModal };
