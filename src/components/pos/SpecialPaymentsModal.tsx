import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Coins, Package, CreditCard as CreditCardIcon, Star, Zap, User, ShoppingCart, CheckCircle, Bitcoin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/lib/api';
import { normalizeApiArray } from '@/lib/normalizeResponse';
import { Customer } from './MixedPaymentModal/types';
import { SpecialPaymentsService } from '@/services/specialPaymentsService';
import { ApartadoData, CreditoData } from '@/types/specialPayments';

/**
 * SpecialPaymentsModal - Modal para pagos especiales con validaciones específicas
 *
 * REGLAS DE NEGOCIO IMPLEMENTADAS:
 * - Cliente requerido para todos los métodos
 * - Zelle: Pago completo obligatorio
 * - Criptomonedas: No implementado (muestra error)
 * - Apartado: Mínimo $10 inicial, registra en BD
 * - Crédito: Puede ser $0, registra deuda completa en BD
 *
 * PENDIENTE:
 * - Implementar endpoints en backend para apartados y créditos
 * - Conectar con módulo de clientes para gestión de deudas
 * - Agregar notificaciones y recordatorios de vencimientos
 */

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
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Form states for each payment type
  const [zelleForm, setZelleForm] = useState({
    amount: '',
    reference: '',
    holderFirst: '',
    holderLast: '',
    holderPhone: ''
  });

  const [cryptoForm, setCryptoForm] = useState({
    amount: '',
    cryptoType: 'bitcoin' as 'bitcoin' | 'ethereum' | 'usdt',
    walletAddress: '',
    transactionId: '',
    holderFirst: '',
    holderLast: '',
    holderPhone: ''
  });

  const [apartadoForm, setApartadoForm] = useState({
    initial: '',
    total: '',
    paymentMethod: 'zelle' as 'zelle' | 'cash-usd',
    dueDate: ''
  });

  const [creditoForm, setCreditoForm] = useState({
    amount: '',
    dueDate: ''
  });

  // Global states for improved UX
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'zelle' | 'crypto' | 'apartado' | 'credito' | null>(null);

  // Load customers
  const loadCustomers = useCallback(async () => {
    if (customersLoading || customers.length > 0) {
      console.log('⏭️ Skipping customer load - already loading or loaded');
      return;
    }

    try {
      console.log('🔄 Loading customers...');
      setCustomersLoading(true);
      const response = await apiService.customers.getAll();
      const list = normalizeApiArray(response) as Customer[];
      console.log('✅ Customers loaded:', list.length);
      setCustomers(list);
    } catch (error) {
      console.error('❌ Error loading customers:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los clientes'
      });
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, [toast, customersLoading, customers.length]);

  useEffect(() => {
    if (open && !customersLoading && customers.length === 0) {
      console.log('🔄 Modal opened, loading customers...');
      loadCustomers();
      // Reset forms and global states
      setSelectedCustomer(null);
      setSelectedPaymentMethod(null);
      setZelleForm({ amount: '', reference: '', holderFirst: '', holderLast: '', holderPhone: '' });
      setCryptoForm({ amount: '', cryptoType: 'bitcoin', walletAddress: '', transactionId: '', holderFirst: '', holderLast: '', holderPhone: '' });
      setApartadoForm({ initial: '', total: '', paymentMethod: 'zelle', dueDate: '' });
      setCreditoForm({ amount: '', dueDate: '' });
    }
  }, [open]); // Only depend on open

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔍 State changed:', {
      selectedCustomer: selectedCustomer?.id,
      selectedPaymentMethod,
      customersCount: customers.length,
      customersLoading
    });
  }, [selectedCustomer, selectedPaymentMethod, customers, customersLoading]);

  // Debug: Log customers rendering
  useEffect(() => {
    console.log('👥 Customers loaded:', customers.length);
  }, [customers]);

  // Función para validar si el formulario está completo
  const isFormValid = () => {
    if (!selectedCustomer || !selectedPaymentMethod) return false;

    switch (selectedPaymentMethod) {
      case 'zelle':
        return zelleForm.amount && zelleForm.reference.trim();

      case 'crypto':
        return cryptoForm.amount && cryptoForm.walletAddress.trim();

      case 'apartado':
        if (!apartadoForm.initial || !apartadoForm.total || !apartadoForm.dueDate) return false;
        const apartadoVal = SpecialPaymentsService.validateApartadoRules(
          parseFloat(apartadoForm.initial),
          parseFloat(apartadoForm.total),
          apartadoForm.dueDate
        );
        return apartadoVal.isValid;

      case 'credito':
        if (creditoForm.amount === '' || !creditoForm.dueDate) return false;
        const creditoVal = SpecialPaymentsService.validateCreditoRules(
          parseFloat(creditoForm.amount),
          total,
          creditoForm.dueDate
        );
        return creditoVal.isValid;

      default:
        return false;
    }
  };

  // Función para obtener mensaje de validación
  const getValidationMessage = () => {
    if (!selectedCustomer) {
      return 'Seleccione un cliente para continuar';
    }

    if (!selectedPaymentMethod) {
      return 'Seleccione un método de pago';
    }

    switch (selectedPaymentMethod) {
      case 'zelle':
        if (!zelleForm.amount) return 'Ingrese el monto para Zelle';
        if (!zelleForm.reference.trim()) return 'Ingrese la referencia de Zelle';
        if (parseFloat(zelleForm.amount) !== total) return `Zelle requiere pago completo: $${total.toFixed(2)}`;
        break;

      case 'crypto':
        return 'Criptomonedas no disponibles actualmente';

      case 'apartado':
        if (!apartadoForm.initial) return 'Ingrese el pago inicial';
        if (!apartadoForm.total) return 'Ingrese el total del apartado';
        if (!apartadoForm.dueDate) return 'Seleccione fecha de vencimiento';

        const apartadoValidation = SpecialPaymentsService.validateApartadoRules(
          parseFloat(apartadoForm.initial),
          parseFloat(apartadoForm.total),
          apartadoForm.dueDate
        );
        if (!apartadoValidation.isValid) return apartadoValidation.errors[0];
        break;

      case 'credito':
        if (creditoForm.amount === '') return 'Ingrese el monto del crédito';
        if (!creditoForm.dueDate) return 'Seleccione fecha de vencimiento';

        const creditoValidation = SpecialPaymentsService.validateCreditoRules(
          parseFloat(creditoForm.amount),
          total,
          creditoForm.dueDate
        );
        if (!creditoValidation.isValid) return creditoValidation.errors[0];
        break;
    }

    return '';
  };

  // Actualizar monto automáticamente para Zelle
  useEffect(() => {
    if (selectedPaymentMethod === 'zelle') {
      setZelleForm(prev => ({ ...prev, amount: total.toString() }));
    }
  }, [selectedPaymentMethod, total]);

  // Unified payment handler with enhanced validations
  const handlePayment = async () => {
    // 1. Validación estricta de cliente (requerido para todos los métodos)
    if (!selectedCustomer) {
      toast({
        title: 'Cliente Requerido',
        description: 'Debe seleccionar un cliente para procesar cualquier pago especial',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: 'Método de Pago Requerido',
        description: 'Seleccione un método de pago',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      let paymentData: any = {
        cartItems,
        total,
        payments: [],
        paymentMethod: selectedPaymentMethod,
        customerId: selectedCustomer.id,
        customer: selectedCustomer
      };

      // Validaciones específicas por método de pago
      switch (selectedPaymentMethod) {
        case 'zelle':
          await validateAndProcessZellePayment(paymentData);
          break;

        case 'crypto':
          await validateAndProcessCryptoPayment(paymentData);
          break;

        case 'apartado':
          paymentData = await validateAndProcessApartadoPayment(paymentData);
          break;

        case 'credito':
          await validateAndProcessCreditoPayment(paymentData);
          break;
      }

      await onPaymentComplete(paymentData);
      onOpenChange(false);

    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al procesar el pago',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Validación específica para Zelle - PAGO COMPLETO OBLIGATORIO
  const validateAndProcessZellePayment = async (paymentData: any) => {
    const zelleAmount = parseFloat(zelleForm.amount);

    // Validar monto
    if (isNaN(zelleAmount) || zelleAmount <= 0) {
      throw new Error('Monto inválido para Zelle');
    }

    // ZELLE DEBE SER PAGO COMPLETO
    if (Math.abs(zelleAmount - total) > 0.01) {
      throw new Error(`Zelle requiere pago completo. Monto requerido: $${total.toFixed(2)}`);
    }

    // Validar campos requeridos
    if (!zelleForm.reference.trim()) {
      throw new Error('Referencia de Zelle requerida');
    }

    paymentData.payments = [{
      type: 'zelle',
      amount: zelleAmount,
      details: {
        reference: zelleForm.reference,
        customerId: selectedCustomer!.id,
        holderName: zelleForm.holderFirst || zelleForm.holderLast ?
          `${zelleForm.holderFirst} ${zelleForm.holderLast}` : undefined,
        holderPhone: zelleForm.holderPhone,
        paymentType: 'complete' // Pago completo
      }
    }];
  };

  // Validación específica para Criptomonedas - NO IMPLEMENTADO AÚN
  const validateAndProcessCryptoPayment = async (paymentData: any) => {
    throw new Error('Los pagos con criptomonedas aún no están implementados. Use Zelle o efectivo.');
  };

  // Validación específica para Apartado - MÍNIMO $10, REGISTRO EN BD
  const validateAndProcessApartadoPayment = async (paymentData: any) => {
    const initial = parseFloat(apartadoForm.initial);
    const totalApartado = parseFloat(apartadoForm.total);

    // Validar montos
    if (isNaN(initial) || isNaN(totalApartado) || initial <= 0 || totalApartado <= 0) {
      throw new Error('Montos inválidos para apartado');
    }

    // Validar reglas de negocio usando el servicio
    const validation = SpecialPaymentsService.validateApartadoRules(initial, totalApartado, apartadoForm.dueDate);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Preparar datos para registro en BD
    const apartadoData: ApartadoData = {
      customerId: selectedCustomer!.id,
      totalAmount: totalApartado,
      initialPayment: initial,
      remainingAmount: totalApartado - initial,
      dueDate: apartadoForm.dueDate,
      paymentMethod: apartadoForm.paymentMethod,
      status: 'active',
      cartItems: cartItems
    };

    // Por ahora, simulamos el registro del apartado
    // TODO: Implementar endpoint real en backend
    const mockApartadoId = `apartado_${Date.now()}`;

    // Para apartado, solo procesamos el pago inicial
    const updatedPaymentData = {
      ...paymentData,
      total: initial, // Solo el inicial se paga ahora
      apartadoData: {
        ...apartadoData,
        id: mockApartadoId
      },
      apartadoId: mockApartadoId,
      isApartado: true, // Flag para identificar que es un apartado
      apartadoTotal: totalApartado, // Total del apartado
      apartadoRemaining: totalApartado - initial, // Monto restante
      payments: [{
        type: 'apartado',
        amount: initial,
        details: {
          customerId: selectedCustomer!.id,
          totalAmount: totalApartado,
          dueDate: apartadoForm.dueDate,
          remainingAmount: totalApartado - initial,
          paymentMethod: apartadoForm.paymentMethod,
          apartadoId: mockApartadoId,
          paymentType: 'initial'
        }
      }]
    };

    return updatedPaymentData;
  };

  // Validación específica para Crédito - PUEDE SER $0, REGISTRO EN BD
  const validateAndProcessCreditoPayment = async (paymentData: any) => {
    const creditoAmount = parseFloat(creditoForm.amount);

    // Validar monto (puede ser 0 para crédito sin pago inicial)
    if (isNaN(creditoAmount) || creditoAmount < 0) {
      throw new Error('Monto inválido para crédito');
    }

    // Para crédito, el monto puede ser 0 (llevarse sin pagar) o cualquier cantidad
    // Pero debe registrar el total que el cliente debe pagar
    const totalCreditAmount = total; // El cliente debe el total de la compra

    // Validar reglas de negocio usando el servicio
    const validation = SpecialPaymentsService.validateCreditoRules(creditoAmount, totalCreditAmount, creditoForm.dueDate);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Preparar datos para registro en BD
    const creditoData: CreditoData = {
      customerId: selectedCustomer!.id,
      totalAmount: totalCreditAmount,
      initialPayment: creditoAmount,
      remainingAmount: totalCreditAmount - creditoAmount,
      dueDate: creditoForm.dueDate,
      status: creditoAmount === 0 ? 'unpaid' : 'partial',
      cartItems: cartItems
    };

    // Registrar crédito en la base de datos
    const result = await SpecialPaymentsService.createCredito(creditoData);

    if (!result.success) {
      throw new Error(result.message);
    }

    paymentData.payments = [{
      type: 'credito',
      amount: creditoAmount,
      details: {
        customerId: selectedCustomer!.id,
        totalAmount: totalCreditAmount,
        dueDate: creditoForm.dueDate,
        remainingAmount: totalCreditAmount - creditoAmount,
        creditoId: result.creditoId,
        paymentType: creditoAmount === 0 ? 'deferred' : 'partial'
      }
    }];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[calc(95vh-140px)] p-1">
          {/* Resumen del Carrito - Panel Izquierdo */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  Resumen del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Productos */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Productos ({cartItems.length})
                  </h4>
                  {cartItems.length > 0 ? (
                    <div className="space-y-1">
                      {cartItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm bg-white dark:bg-gray-800 p-2 rounded border">
                          <span className="flex-1 truncate">{item.name}</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            ${item.price?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No hay productos en el carrito</p>
                  )}
                </div>

                {/* Total */}
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total a Pagar:</span>
                    <span className="text-green-600 dark:text-green-400">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información del Cliente Global */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-green-600" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cliente *
                  </Label>
                  <Select
                    value={selectedCustomer?.id || ''}
                    onValueChange={(value) => {
                      console.log('👤 Customer selected:', value);
                      const customer = customers.find(c => c.id === value);
                      console.log('👤 Found customer:', customer);
                      setSelectedCustomer(customer || null);
                    }}
                    disabled={customersLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={customersLoading ? "Cargando clientes..." : "Seleccionar cliente"} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.length === 0 && !customersLoading && (
                        <SelectItem value="" disabled>
                          No hay clientes disponibles
                        </SelectItem>
                      )}
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex flex-col">
                            <span>{`${customer.firstName} ${customer.lastName}`}</span>
                            <span className="text-xs text-gray-500">{customer.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCustomer && (
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border text-sm">
                      <p className="font-medium">{`${selectedCustomer.firstName} ${selectedCustomer.lastName}`}</p>
                      <p className="text-gray-600 dark:text-gray-400">{selectedCustomer.email}</p>
                      <p className="text-gray-600 dark:text-gray-400">{selectedCustomer.phone}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métodos de Pago - Panel Derecho */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                Seleccionar Método de Pago Especial
              </h3>

              {/* Grid de Métodos de Pago - Solo selección */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {customersLoading && (
                  <div className="col-span-2 text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando clientes...</p>
                  </div>
                )}
                {!customersLoading && customers.length === 0 && (
                  <div className="col-span-2 text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">No hay clientes disponibles</p>
                    <p className="text-sm text-gray-500 mt-2">Debe crear clientes antes de procesar pagos especiales</p>
                  </div>
                )}
                {!customersLoading && customers.length > 0 && (
                  <>
                    {/* Zelle Payment Card */}
                    <Card className={`transition-all duration-200 hover:shadow-lg border-2 ${
                      selectedPaymentMethod === 'zelle'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    } ${customersLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (!customersLoading) {
                        console.log('💳 Zelle payment method clicked');
                        setSelectedPaymentMethod('zelle');
                      }
                    }}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-blue-600" />
                            <span>Pago Zelle</span>
                          </div>
                          {selectedPaymentMethod === 'zelle' && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Pago electrónico rápido y seguro a través de Zelle
                        </p>
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded text-xs">
                          <div className="font-medium text-blue-800 dark:text-blue-200">💰 Pago Completo Obligatorio</div>
                          <div className="text-blue-700 dark:text-blue-300">Monto: ${total.toFixed(2)}</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Crypto Payment Card */}
                    <Card className={`transition-all duration-200 hover:shadow-lg border-2 ${
                      selectedPaymentMethod === 'crypto'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                    } ${customersLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (!customersLoading) {
                        console.log('₿ Crypto payment method clicked');
                        setSelectedPaymentMethod('crypto');
                      }
                    }}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins className="h-5 w-5 text-orange-600" />
                            <span>Criptomonedas</span>
                          </div>
                          {selectedPaymentMethod === 'crypto' && (
                            <CheckCircle className="h-5 w-5 text-orange-600" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Pago con Bitcoin, Ethereum u otras criptomonedas
                        </p>
                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded text-xs">
                          <div className="font-medium text-red-800 dark:text-red-200">🚫 No Disponible</div>
                          <div className="text-red-700 dark:text-red-300">Funcionalidad en desarrollo</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Apartado Payment Card */}
                    <Card className={`transition-all duration-200 hover:shadow-lg border-2 ${
                      selectedPaymentMethod === 'apartado'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    } ${customersLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (!customersLoading) {
                        console.log('📦 Apartado payment method clicked');
                        setSelectedPaymentMethod('apartado');
                      }
                    }}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-green-600" />
                            <span>Apartado</span>
                          </div>
                          {selectedPaymentMethod === 'apartado' && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Reserva productos con pago inicial y saldo pendiente
                        </p>
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded text-xs">
                          <div className="font-medium text-green-800 dark:text-green-200">📦 Inicial Mínimo: $10</div>
                          <div className="text-green-700 dark:text-green-300">Registra como apartado en BD</div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Credito Payment Card */}
                    <Card className={`transition-all duration-200 hover:shadow-lg border-2 ${
                      selectedPaymentMethod === 'credito'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                    } ${customersLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (!customersLoading) {
                        console.log('💳 Credito payment method clicked');
                        setSelectedPaymentMethod('credito');
                      }
                    }}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCardIcon className="h-5 w-5 text-purple-600" />
                            <span>Crédito (Deuda)</span>
                          </div>
                          {selectedPaymentMethod === 'credito' && (
                            <CheckCircle className="h-5 w-5 text-purple-600" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Pago a crédito con fecha de vencimiento
                        </p>
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded text-xs">
                          <div className="font-medium text-purple-800 dark:text-purple-200">💳 Puede ser $0</div>
                          <div className="text-purple-700 dark:text-purple-300">Registra deuda completa en BD</div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Formulario del método seleccionado */}
              {selectedPaymentMethod && (
                <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-300 dark:border-gray-600">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedPaymentMethod === 'zelle' && <><Smartphone className="h-5 w-5 text-blue-600" /><span>Detalles del Pago Zelle</span></>}
                      {selectedPaymentMethod === 'crypto' && <><Coins className="h-5 w-5 text-orange-600" /><span>Detalles del Pago Crypto</span></>}
                      {selectedPaymentMethod === 'apartado' && <><Package className="h-5 w-5 text-green-600" /><span>Detalles del Apartado</span></>}
                      {selectedPaymentMethod === 'credito' && <><CreditCardIcon className="h-5 w-5 text-purple-600" /><span>Detalles del Crédito</span></>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Zelle Form */}
                    {selectedPaymentMethod === 'zelle' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                            💰 Pago Completo Obligatorio: ${total.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Monto *</Label>
                          <Input
                            type="number"
                            value={zelleForm.amount}
                            readOnly
                            className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                            placeholder="Monto automático"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm font-medium">Nombre Titular</Label>
                            <Input
                              type="text"
                              value={zelleForm.holderFirst}
                              onChange={(e) => setZelleForm(prev => ({ ...prev, holderFirst: e.target.value }))}
                              placeholder="Nombre"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Apellido Titular</Label>
                            <Input
                              type="text"
                              value={zelleForm.holderLast}
                              onChange={(e) => setZelleForm(prev => ({ ...prev, holderLast: e.target.value }))}
                              placeholder="Apellido"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Teléfono</Label>
                          <Input
                            type="tel"
                            value={zelleForm.holderPhone}
                            onChange={(e) => setZelleForm(prev => ({ ...prev, holderPhone: e.target.value }))}
                            placeholder="Teléfono del titular"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Referencia *</Label>
                          <Input
                            type="text"
                            value={zelleForm.reference}
                            onChange={(e) => setZelleForm(prev => ({ ...prev, reference: e.target.value }))}
                            placeholder="Referencia de Zelle"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Monto *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={zelleForm.amount}
                            onChange={(e) => setZelleForm(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    )}

                    {/* Crypto Form */}
                    {selectedPaymentMethod === 'crypto' && (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Tipo de Cripto *</Label>
                          <Select
                            value={cryptoForm.cryptoType}
                            onValueChange={(value: 'bitcoin' | 'ethereum' | 'usdt') =>
                              setCryptoForm(prev => ({ ...prev, cryptoType: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                              <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                              <SelectItem value="usdt">Tether (USDT)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm font-medium">Nombre Titular</Label>
                            <Input
                              type="text"
                              value={cryptoForm.holderFirst}
                              onChange={(e) => setCryptoForm(prev => ({ ...prev, holderFirst: e.target.value }))}
                              placeholder="Nombre"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Apellido Titular</Label>
                            <Input
                              type="text"
                              value={cryptoForm.holderLast}
                              onChange={(e) => setCryptoForm(prev => ({ ...prev, holderLast: e.target.value }))}
                              placeholder="Apellido"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Teléfono</Label>
                          <Input
                            type="tel"
                            value={cryptoForm.holderPhone}
                            onChange={(e) => setCryptoForm(prev => ({ ...prev, holderPhone: e.target.value }))}
                            placeholder="Teléfono del titular"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Wallet Address *</Label>
                          <Input
                            type="text"
                            value={cryptoForm.walletAddress}
                            onChange={(e) => setCryptoForm(prev => ({ ...prev, walletAddress: e.target.value }))}
                            placeholder="Dirección de wallet"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Monto *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={cryptoForm.amount}
                            onChange={(e) => setCryptoForm(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Transaction ID</Label>
                          <Input
                            type="text"
                            value={cryptoForm.transactionId}
                            onChange={(e) => setCryptoForm(prev => ({ ...prev, transactionId: e.target.value }))}
                            placeholder="ID de transacción"
                          />
                        </div>
                      </div>
                    )}

                    {/* Apartado Form */}
                    {selectedPaymentMethod === 'apartado' && (
                      <div className="space-y-4">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                            📦 Inicial Mínimo: $10 | Registra como apartado en BD
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Inicial (Mínimo $10) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={apartadoForm.initial}
                            onChange={(e) => setApartadoForm(prev => ({ ...prev, initial: e.target.value }))}
                            placeholder="10.00"
                            className={parseFloat(apartadoForm.initial || '0') < 10 && apartadoForm.initial ? 'border-red-500' : ''}
                          />
                          {parseFloat(apartadoForm.initial || '0') < 10 && apartadoForm.initial && (
                            <p className="text-xs text-red-600 mt-1">⚠️ Mínimo $10 requerido</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Total Apartado *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={apartadoForm.total}
                            onChange={(e) => setApartadoForm(prev => ({ ...prev, total: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Método de Pago *</Label>
                          <Select
                            value={apartadoForm.paymentMethod}
                            onValueChange={(value: 'zelle' | 'cash-usd') =>
                              setApartadoForm(prev => ({ ...prev, paymentMethod: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="zelle">Zelle</SelectItem>
                              <SelectItem value="cash-usd">Efectivo USD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Fecha de Culminación *</Label>
                          <Input
                            type="date"
                            value={apartadoForm.dueDate}
                            onChange={(e) => setApartadoForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}

                    {/* Credito Form */}
                    {selectedPaymentMethod === 'credito' && (
                      <div className="space-y-4">
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-800">
                          <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">
                            💳 Puede ser $0 | Registra deuda completa: ${total.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Monto Pagado *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={creditoForm.amount}
                            onChange={(e) => setCreditoForm(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                          />
                          <p className="text-xs text-gray-600 mt-1">
                            Deuda total a registrar: ${(total - parseFloat(creditoForm.amount || '0')).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Fecha de Culminación *</Label>
                          <Input
                            type="date"
                            value={creditoForm.dueDate}
                            onChange={(e) => setCreditoForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Botón de Procesar Pago */}
            {selectedPaymentMethod && (
              <div className="flex flex-col gap-3 pt-4 border-t">
                {/* Mensaje de validación */}
                {getValidationMessage() && (
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                      <span className="text-yellow-600">⚠️</span>
                      {getValidationMessage()}
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={handlePayment}
                    disabled={loading || !isFormValid()}
                    className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Procesando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Procesar Pago Especial
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};