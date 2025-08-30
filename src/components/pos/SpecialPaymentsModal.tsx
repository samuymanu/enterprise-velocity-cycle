import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Bitcoin, Package, CreditCardIcon, Star, Zap, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { normalizeApiArray } from '@/lib/normalizeResponse';
import { Customer } from './MixedPaymentModal/types';

interface SpecialPaymentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  cartItems: any[];
  onPaymentComplete: (paymentData: any) => void;
}

export const SpecialPaymentsModal: React.FC<SpecialPaymentsModalProps> = ({
  open,
  onOpenChange,
  total,
  cartItems,
  onPaymentComplete
}) => {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Form states for each payment type
  const [zelleForm, setZelleForm] = useState({
    amount: '',
    reference: '',
    selectedCustomer: null as Customer | null,
    holderFirst: '',
    holderLast: '',
    holderPhone: ''
  });

  const [cryptoForm, setCryptoForm] = useState({
    amount: '',
    wallet: '',
    selectedCustomer: null as Customer | null,
    holderFirst: '',
    holderLast: '',
    holderPhone: ''
  });

  const [apartadoForm, setApartadoForm] = useState({
    initial: '',
    total: '',
    selectedCustomer: null as Customer | null,
    paymentMethod: 'zelle' as 'zelle' | 'cash-usd',
    dueDate: ''
  });

  const [creditoForm, setCreditoForm] = useState({
    amount: '',
    selectedCustomer: null as Customer | null,
    dueDate: ''
  });

  // Load customers
  const loadCustomers = useCallback(async () => {
    try {
      setCustomersLoading(true);
      const response = await apiService.customers.getAll();
      const list = normalizeApiArray(response) as Customer[];
      setCustomers(list);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes'
      });
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      loadCustomers();
      // Reset forms
      setZelleForm({ amount: '', reference: '', selectedCustomer: null, holderFirst: '', holderLast: '', holderPhone: '' });
      setCryptoForm({ amount: '', wallet: '', selectedCustomer: null, holderFirst: '', holderLast: '', holderPhone: '' });
      setApartadoForm({ initial: '', total: '', selectedCustomer: null, paymentMethod: 'zelle', dueDate: '' });
      setCreditoForm({ amount: '', selectedCustomer: null, dueDate: '' });
    }
  }, [open, loadCustomers]);

  const handleZellePayment = async () => {
    try {
      const amount = parseFloat(zelleForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.toast({ title: 'Error', description: 'Monto inválido' });
        return;
      }
      if (!zelleForm.reference.trim()) {
        toast.toast({ title: 'Error', description: 'Referencia de Zelle requerida' });
        return;
      }
      if (!zelleForm.selectedCustomer) {
        toast.toast({ title: 'Error', description: 'Cliente requerido para pago Zelle' });
        return;
      }

      setLoading(true);
      const paymentData = {
        cartItems,
        total,
        payments: [{
          type: 'zelle',
          amount,
          details: {
            reference: zelleForm.reference,
            customerId: zelleForm.selectedCustomer.id,
            holderName: zelleForm.holderFirst || zelleForm.holderLast ? `${zelleForm.holderFirst} ${zelleForm.holderLast}` : undefined,
            holderPhone: zelleForm.holderPhone
          }
        }],
        paymentMethod: 'zelle'
      };

      await onPaymentComplete(paymentData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error processing Zelle payment:', error);
      toast.toast({ title: 'Error', description: 'Error al procesar pago Zelle' });
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoPayment = async () => {
    try {
      const amount = parseFloat(cryptoForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.toast({ title: 'Error', description: 'Monto inválido' });
        return;
      }
      if (!cryptoForm.wallet.trim()) {
        toast.toast({ title: 'Error', description: 'Wallet de crypto requerida' });
        return;
      }
      if (!cryptoForm.selectedCustomer) {
        toast.toast({ title: 'Error', description: 'Cliente requerido para pago crypto' });
        return;
      }

      setLoading(true);
      const paymentData = {
        cartItems,
        total,
        payments: [{
          type: 'crypto',
          amount,
          details: {
            wallet: cryptoForm.wallet,
            customerId: cryptoForm.selectedCustomer.id,
            holderName: cryptoForm.holderFirst || cryptoForm.holderLast ? `${cryptoForm.holderFirst} ${cryptoForm.holderLast}` : undefined,
            holderPhone: cryptoForm.holderPhone
          }
        }],
        paymentMethod: 'crypto'
      };

      await onPaymentComplete(paymentData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error processing crypto payment:', error);
      toast.toast({ title: 'Error', description: 'Error al procesar pago crypto' });
    } finally {
      setLoading(false);
    }
  };

  const handleApartadoPayment = async () => {
    try {
      const initial = parseFloat(apartadoForm.initial);
      const totalApartado = parseFloat(apartadoForm.total);

      if (isNaN(initial) || isNaN(totalApartado) || initial <= 0 || totalApartado <= 0) {
        toast.toast({ title: 'Error', description: 'Montos inválidos' });
        return;
      }
      if (initial < 10) {
        toast.toast({ title: 'Error', description: 'Inicial mínimo $10' });
        return;
      }
      if (!apartadoForm.selectedCustomer) {
        toast.toast({ title: 'Error', description: 'Cliente requerido para apartado' });
        return;
      }
      if (!apartadoForm.dueDate) {
        toast.toast({ title: 'Error', description: 'Fecha de vencimiento requerida' });
        return;
      }

      setLoading(true);
      const paymentData = {
        cartItems,
        total: totalApartado,
        payments: [{
          type: 'apartado',
          amount: initial,
          details: {
            customerId: apartadoForm.selectedCustomer.id,
            totalAmount: totalApartado,
            dueDate: apartadoForm.dueDate,
            remainingAmount: totalApartado - initial,
            paymentMethod: apartadoForm.paymentMethod
          }
        }],
        paymentMethod: 'apartado'
      };

      await onPaymentComplete(paymentData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error processing apartado payment:', error);
      toast.toast({ title: 'Error', description: 'Error al procesar apartado' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreditoPayment = async () => {
    try {
      const amount = parseFloat(creditoForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.toast({ title: 'Error', description: 'Monto inválido' });
        return;
      }
      if (!creditoForm.selectedCustomer) {
        toast.toast({ title: 'Error', description: 'Cliente requerido para crédito' });
        return;
      }
      if (!creditoForm.dueDate) {
        toast.toast({ title: 'Error', description: 'Fecha de vencimiento requerida' });
        return;
      }

      setLoading(true);
      const paymentData = {
        cartItems,
        total,
        payments: [{
          type: 'credito',
          amount,
          details: {
            customerId: creditoForm.selectedCustomer.id,
            dueDate: creditoForm.dueDate
          }
        }],
        paymentMethod: 'credito'
      };

      await onPaymentComplete(paymentData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error processing credito payment:', error);
      toast.toast({ title: 'Error', description: 'Error al procesar crédito' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <DialogHeader className="pb-6 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <Star className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 p-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                <Zap className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Pagos Especiales
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-4">
                <span>💎 Premium</span>
                <span>🔒 Seguro</span>
                <span>⚡ Rápido</span>
                <span>🎯 Personalizado</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(95vh-140px)] p-1">
          {/* Zelle Payment */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Pago Zelle</h3>
              </div>
              <div className="space-y-4">
                {/* Cliente */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente *
                  </Label>
                  <Select
                    value={zelleForm.selectedCustomer?.id || ''}
                    onValueChange={(value) => {
                      const customer = customers.find(c => c.id === value);
                      setZelleForm(prev => ({ ...prev, selectedCustomer: customer || null }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {`${customer.firstName} ${customer.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nombre y Apellido del Titular */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Titular</Label>
                    <Input
                      type="text"
                      value={zelleForm.holderFirst}
                      onChange={(e) => setZelleForm(prev => ({ ...prev, holderFirst: e.target.value }))}
                      placeholder="Nombre"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Apellido Titular</Label>
                    <Input
                      type="text"
                      value={zelleForm.holderLast}
                      onChange={(e) => setZelleForm(prev => ({ ...prev, holderLast: e.target.value }))}
                      placeholder="Apellido"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</Label>
                  <Input
                    type="tel"
                    value={zelleForm.holderPhone}
                    onChange={(e) => setZelleForm(prev => ({ ...prev, holderPhone: e.target.value }))}
                    placeholder="Teléfono del titular"
                    className="w-full"
                  />
                </div>

                {/* Referencia */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Referencia *</Label>
                  <Input
                    type="text"
                    value={zelleForm.reference}
                    onChange={(e) => setZelleForm(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="Referencia de Zelle"
                    className="w-full"
                  />
                </div>

                {/* Monto */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={zelleForm.amount}
                    onChange={(e) => setZelleForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>

                <Button
                  onClick={handleZellePayment}
                  disabled={loading || !zelleForm.selectedCustomer}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Procesar Zelle
                </Button>
              </div>
            </div>
          </div>

          {/* Crypto Payment */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-4">
                <Bitcoin className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Pago Crypto</h3>
              </div>
              <div className="space-y-4">
                {/* Cliente */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente *
                  </Label>
                  <Select
                    value={cryptoForm.selectedCustomer?.id || ''}
                    onValueChange={(value) => {
                      const customer = customers.find(c => c.id === value);
                      setCryptoForm(prev => ({ ...prev, selectedCustomer: customer || null }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {`${customer.firstName} ${customer.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nombre y Apellido del Titular */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre Titular</Label>
                    <Input
                      type="text"
                      value={cryptoForm.holderFirst}
                      onChange={(e) => setCryptoForm(prev => ({ ...prev, holderFirst: e.target.value }))}
                      placeholder="Nombre"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Apellido Titular</Label>
                    <Input
                      type="text"
                      value={cryptoForm.holderLast}
                      onChange={(e) => setCryptoForm(prev => ({ ...prev, holderLast: e.target.value }))}
                      placeholder="Apellido"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</Label>
                  <Input
                    type="tel"
                    value={cryptoForm.holderPhone}
                    onChange={(e) => setCryptoForm(prev => ({ ...prev, holderPhone: e.target.value }))}
                    placeholder="Teléfono del titular"
                    className="w-full"
                  />
                </div>

                {/* Wallet (Referencia) */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Wallet (Referencia) *</Label>
                  <Input
                    type="text"
                    value={cryptoForm.wallet}
                    onChange={(e) => setCryptoForm(prev => ({ ...prev, wallet: e.target.value }))}
                    placeholder="Dirección de wallet"
                    className="w-full"
                  />
                </div>

                {/* Monto */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cryptoForm.amount}
                    onChange={(e) => setCryptoForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>

                <Button
                  onClick={handleCryptoPayment}
                  disabled={loading || !cryptoForm.selectedCustomer}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Procesar Crypto
                </Button>
              </div>
            </div>
          </div>

          {/* Apartado Payment */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Apartado</h3>
              </div>
              <div className="space-y-4">
                {/* Cliente */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente *
                  </Label>
                  <Select
                    value={apartadoForm.selectedCustomer?.id || ''}
                    onValueChange={(value) => {
                      const customer = customers.find(c => c.id === value);
                      setApartadoForm(prev => ({ ...prev, selectedCustomer: customer || null }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {`${customer.firstName} ${customer.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Inicial */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Inicial (Mínimo $10) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={apartadoForm.initial}
                    onChange={(e) => setApartadoForm(prev => ({ ...prev, initial: e.target.value }))}
                    placeholder="10.00"
                    className="w-full"
                  />
                </div>

                {/* Total */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Apartado *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={apartadoForm.total}
                    onChange={(e) => setApartadoForm(prev => ({ ...prev, total: e.target.value }))}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>

                {/* Método de Pago */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Método de Pago *</Label>
                  <Select
                    value={apartadoForm.paymentMethod}
                    onValueChange={(value: 'zelle' | 'cash-usd') => setApartadoForm(prev => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zelle">Zelle</SelectItem>
                      <SelectItem value="cash-usd">Efectivo USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Fecha de Culminación */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Culminación *</Label>
                  <Input
                    type="date"
                    value={apartadoForm.dueDate}
                    onChange={(e) => setApartadoForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full"
                  />
                </div>

                <Button
                  onClick={handleApartadoPayment}
                  disabled={loading || !apartadoForm.selectedCustomer}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Procesar Apartado
                </Button>
              </div>
            </div>
          </div>

          {/* Credito Payment */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-4">
                <CreditCardIcon className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Crédito (Deuda)</h3>
              </div>
              <div className="space-y-4">
                {/* Cliente */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente *
                  </Label>
                  <Select
                    value={creditoForm.selectedCustomer?.id || ''}
                    onValueChange={(value) => {
                      const customer = customers.find(c => c.id === value);
                      setCreditoForm(prev => ({ ...prev, selectedCustomer: customer || null }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {`${customer.firstName} ${customer.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Monto */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={creditoForm.amount}
                    onChange={(e) => setCreditoForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full"
                  />
                </div>

                {/* Fecha de Culminación */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Culminación *</Label>
                  <Input
                    type="date"
                    value={creditoForm.dueDate}
                    onChange={(e) => setCreditoForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full"
                  />
                </div>

                <Button
                  onClick={handleCreditoPayment}
                  disabled={loading || !creditoForm.selectedCustomer}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Procesar Crédito
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};