import React from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductSearch } from "@/components/pos/ProductSearch";
import { ProductFilters } from "@/components/pos/ProductFilters";
import { ShoppingCart } from "@/components/pos/ShoppingCart";
import { SaleSummary } from "@/components/pos/SaleSummary";
import { PaymentMethods } from "@/components/pos/PaymentMethods";
import { MixedPaymentModal } from "@/components/pos/MixedPaymentModal";
import { SpecialPaymentsModal } from "@/components/pos/SpecialPaymentsModal";
import { apiService } from '@/lib/api';
import { useInventoryStore } from '@/stores/inventoryStore';
import { CustomerActions } from "@/components/pos/CustomerActions";
import { SaleActions } from "@/components/pos/SaleActions";
import { RecentSales } from "@/components/pos/RecentSales";
import { useToast } from '@/hooks/use-toast';
import { StockValidationTester } from "@/components/StockValidationTester";

interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  documentNumber: string;
}

interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
}

export default function POS() {
  const toast = useToast();
  const [filtersCollapsed, setFiltersCollapsed] = React.useState(true);
  // Carrito local simple (por ahora en memoria)
  const [cart, setCart] = React.useState<{ 
    id: string; 
    name: string; 
    sku?: string; 
    brand?: string; 
    quantity: number; 
    price?: number;
    notes?: string;
    priority?: 'low' | 'normal' | 'high';
  }[]>([]);
  const [mixedPaymentModalOpen, setMixedPaymentModalOpen] = React.useState(false);
  const [specialPaymentsModalOpen, setSpecialPaymentsModalOpen] = React.useState(false);
  
  // Estados para cliente y descuento
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [discount, setDiscount] = React.useState<Discount | null>(null);

  // Estados para persistencia y recuperación
  const [pendingSales, setPendingSales] = React.useState<any[]>([]);
  const [currentSaleId, setCurrentSaleId] = React.useState<string | null>(null);

  // Funciones para persistencia del carrito
  const saveCartToStorage = React.useCallback((cartData: typeof cart, customer?: Customer | null, discountData?: Discount | null) => {
    try {
      const cartState = {
        items: cartData,
        customer,
        discount: discountData,
        timestamp: Date.now(),
        saleId: currentSaleId
      };
      localStorage.setItem('pos_cart_state', JSON.stringify(cartState));
      console.log('🛒 Carrito guardado en localStorage');
    } catch (error) {
      console.error('Error guardando carrito:', error);
    }
  }, [currentSaleId]);

  const loadCartFromStorage = React.useCallback(() => {
    try {
      const saved = localStorage.getItem('pos_cart_state');
      if (saved) {
        const cartState = JSON.parse(saved);
        // Verificar si no ha expirado (24 horas)
        const isExpired = Date.now() - cartState.timestamp > 24 * 60 * 60 * 1000;
        
        if (!isExpired && cartState.items?.length > 0) {
          setCart(cartState.items);
          if (cartState.customer) setSelectedCustomer(cartState.customer);
          if (cartState.discount) setDiscount(cartState.discount);
          if (cartState.saleId) setCurrentSaleId(cartState.saleId);
          
          toast.toast({
            title: 'Carrito recuperado',
            description: 'Se ha restaurado el carrito anterior',
            variant: 'default'
          });
          
          console.log('🛒 Carrito cargado desde localStorage');
          return true;
        } else {
          // Limpiar datos expirados
          localStorage.removeItem('pos_cart_state');
        }
      }
    } catch (error) {
      console.error('Error cargando carrito:', error);
    }
    return false;
  }, [toast]);

  // Efecto para guardar carrito automáticamente
  React.useEffect(() => {
    if (cart.length > 0) {
      saveCartToStorage(cart, selectedCustomer, discount);
    }
  }, [cart, selectedCustomer, discount, saveCartToStorage]);

  // Efecto para cargar carrito al iniciar
  React.useEffect(() => {
    loadCartFromStorage();
  }, [loadCartFromStorage]);

  // Función para validar límites de cantidad por producto
  const validateQuantityLimit = (productId: string, requestedQuantity: number): boolean => {
    const inventoryProduct = useInventoryStore.getState().getProductById(productId);
    if (!inventoryProduct) return true; // Si no hay info de inventario, permitir

    const availableStock = inventoryProduct.stock || 0;
    const maxAllowed = availableStock; // Usar stock disponible como límite máximo

    if (requestedQuantity > maxAllowed) {
      toast.toast({
        title: 'Límite de cantidad excedido',
        description: `Máximo permitido: ${maxAllowed} unidades de "${inventoryProduct.name}"`,
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  // Función para recuperar ventas pendientes
  const loadPendingSales = React.useCallback(async () => {
    try {
      // Aquí iría la lógica para cargar ventas pendientes desde el backend
      // Por ahora, simulamos con datos de ejemplo
      const pending = [
        // Ejemplo de ventas pendientes
      ];
      setPendingSales(pending);
    } catch (error) {
      console.error('Error cargando ventas pendientes:', error);
    }
  }, []);

  // Función mejorada para validar stock antes de agregar
  const validateStockBeforeAdd = async (productId: string, additionalQuantity: number = 1): Promise<boolean> => {
    try {
      const inventoryProduct = useInventoryStore.getState().getProductById(productId);
      if (!inventoryProduct) {
        // Intentar recargar inventario
        await useInventoryStore.getState().fetchProducts(true);
        const reloadedProduct = useInventoryStore.getState().getProductById(productId);
        if (!reloadedProduct) {
          toast.toast({
            title: 'Producto no encontrado',
            description: 'No se pudo verificar el stock del producto',
            variant: 'destructive'
          });
          return false;
        }
      }

      const product = inventoryProduct || useInventoryStore.getState().getProductById(productId);
      if (!product) return false;

      const availableStock = product.stock || 0;
      const currentInCart = cart.find(p => p.id === productId)?.quantity || 0;
      const totalRequested = currentInCart + additionalQuantity;

      // Validar límite de cantidad
      if (!validateQuantityLimit(productId, totalRequested)) {
        return false;
      }

      // Validar stock disponible
      if (availableStock < totalRequested) {
        if (availableStock === 0) {
          toast.toast({
            title: 'Producto sin stock',
            description: `El producto "${product.name}" no tiene stock disponible`,
            variant: 'destructive'
          });
          return false;
        } else {
          toast.toast({
            title: 'Stock insuficiente',
            description: `Solo hay ${availableStock} unidades disponibles. Actualmente tienes ${currentInCart} en el carrito`,
            variant: 'destructive'
          });
          return false;
        }
      }

      // Mostrar advertencia si stock está bajo
      if (availableStock <= (product.minStock || 0) && availableStock > 0) {
        toast.toast({
          title: 'Stock bajo',
          description: `Quedan solo ${availableStock} unidades de "${product.name}"`,
          variant: 'default'
        });
      }

      return true;
    } catch (error) {
      console.error('Error validando stock:', error);
      toast.toast({
        title: 'Error de validación',
        description: 'No se pudo verificar el stock disponible',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Inicializar inventory store al cargar el POS
  React.useEffect(() => {
    const initializeInventory = async () => {
      try {
        // Verificar si ya hay productos cargados
        const currentProducts = useInventoryStore.getState().products;
        if (currentProducts.length === 0) {
          console.log('Inicializando inventory store...');
          await useInventoryStore.getState().fetchProducts();
          console.log('Inventory store inicializado correctamente');
        } else {
          console.log('Inventory store ya tiene productos cargados:', currentProducts.length);
        }
      } catch (error) {
        console.error('Error inicializando inventory store:', error);
        toast.toast({
          title: 'Error de inicialización',
          description: 'No se pudieron cargar los productos. Algunos precios podrían no mostrarse correctamente.',
          variant: 'destructive'
        });
      }
    };

    initializeInventory();
  }, []);

  // Función para recargar inventory store manualmente
  const reloadInventory = async () => {
    try {
      console.log('Recargando inventory store manualmente...');
      await useInventoryStore.getState().fetchProducts(true); // force = true
      toast.toast({
        title: 'Inventario recargado',
        description: 'Los productos se han actualizado correctamente.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error recargando inventory:', error);
      toast.toast({
        title: 'Error al recargar',
        description: 'No se pudo actualizar el inventario.',
        variant: 'destructive'
      });
    }
  };

  const handleProductSelect = async (product: any) => {
    console.log('handleProductSelect - Producto recibido:', product);
    console.log('handleProductSelect - Precio inicial:', product?.price ?? product?.salePrice ?? product?.sale_price);

    if (
      product?.isBrand ||
      (typeof product?.id === 'string' && product.id.startsWith('brand:')) ||
      /^Marca:\s*/i.test(product?.name || '') ||
      product?.isCategory ||
      (typeof product?.id === 'string' && product.id.startsWith('category:')) ||
      /^Categor[ií]a:\s*/i.test(product?.name || '')
    ) {
      console.log('Selección detectada como marca o categoría, se ignora para carrito');
      return;
    }

    // VALIDACIÓN DE STOCK EN TIEMPO REAL CON LA NUEVA FUNCIÓN
    const isStockValid = await validateStockBeforeAdd(product.id, 1);
    if (!isStockValid) {
      return;
    }

    // Resolver precio y brand de forma segura
    let price = (product.price ?? product.salePrice ?? product.sale_price) as number | undefined;
    let resolvedBrand: string | undefined = undefined;
    
    const resolveBrand = (p: any) => {
      const b = p?.brand ?? p?.brandName ?? p?.brand_name ?? p?.manufacturer ?? p?.make ?? p?.marca;
      if (!b) return undefined;
      if (typeof b === 'string') return b;
      if (typeof b === 'object') return b?.name ?? b?.label ?? b?.title ?? undefined;
      return String(b);
    };

    console.log('handleProductSelect - Precio después de resolución inicial:', price);

    // If price is missing or zero, try to resolve from inventory store first
    if (!price || price === 0) {
      console.log('handleProductSelect - Precio faltante, intentando resolver desde inventory store...');
      try {
        // Intentar primero con el ID del producto
        let inv = useInventoryStore.getState().getProductById(String(product.id));
        console.log('handleProductSelect - Producto encontrado en store por ID:', inv);

        // Si no se encuentra por ID, intentar con SKU
        if (!inv && product.sku) {
          console.log('handleProductSelect - Buscando por SKU:', product.sku);
          const allProducts = useInventoryStore.getState().products;
          inv = allProducts.find(p => p.sku === product.sku);
          console.log('handleProductSelect - Producto encontrado en store por SKU:', inv);
        }

        if (inv) {
          price = (inv.salePrice ?? (inv as any).price ?? (inv as any).sale_price ?? price ?? 0) as number | undefined;
          resolvedBrand = resolveBrand(inv as any);
          console.log('handleProductSelect - Precio resuelto desde store:', price);
        } else {
          console.log('handleProductSelect - Producto no encontrado en store, intentando API...');
          // Fallback: request product detail from API usando SKU si está disponible
          try {
            let details: any = null;
            if (product.sku) {
              console.log('handleProductSelect - Intentando buscar por SKU en API:', product.sku);
              // Buscar por SKU primero
              const searchResponse = await apiService.products.getAll({ search: product.sku, limit: 1 });
              if (searchResponse.products && searchResponse.products.length > 0) {
                details = searchResponse.products[0];
                console.log('handleProductSelect - Detalles encontrados por búsqueda SKU:', details);
              }
            }
            
            // Si no se encontró por SKU, intentar por ID codificado
            if (!details) {
              console.log('handleProductSelect - Intentando buscar por ID en API:', product.id);
              details = await apiService.products.getById(encodeURIComponent(String(product.id)));
              console.log('handleProductSelect - Detalles encontrados por ID:', details);
            }
            
            if (details) {
              price = (details?.salePrice ?? details?.price ?? details?.sale_price ?? price ?? 0) as number | undefined;
              resolvedBrand = resolveBrand(details);
              console.log('handleProductSelect - Precio resuelto desde API:', price);
            }
          } catch (apiError) {
            console.warn('handleProductSelect - Error en API, intentando búsqueda alternativa:', apiError);
            // Último intento: buscar por nombre del producto
            try {
              const searchResponse = await apiService.products.getAll({ search: product.name, limit: 1 });
              if (searchResponse.products && searchResponse.products.length > 0) {
                const foundProduct = searchResponse.products[0];
                price = (foundProduct?.salePrice ?? foundProduct?.price ?? foundProduct?.sale_price ?? price ?? 0) as number | undefined;
                resolvedBrand = resolveBrand(foundProduct);
                console.log('handleProductSelect - Precio resuelto por búsqueda de nombre:', price);
              }
            } catch (searchError) {
              console.warn('handleProductSelect - Error en búsqueda alternativa:', searchError);
            }
          }
        }
      } catch (err) {
        console.warn('handleProductSelect - Error general resolviendo precio:', err);
      }
    }

    // Si no se obtuvo precio, usar 0 y mostrar warning
    const finalPrice = (price ?? 0) as number;
    if (finalPrice === 0) {
      console.warn('handleProductSelect - ADVERTENCIA: Precio final es 0 para producto:', product.name);
      toast.toast({
        title: 'Precio no disponible',
        description: `El producto "${product.name}" no tiene precio configurado. Se agregará con precio $0.00`,
        variant: 'destructive'
      });
    }

    console.log('handleProductSelect - Precio final:', finalPrice);

    // Finalmente agregar al carrito
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        console.log('handleProductSelect - Producto ya existe, aumentando cantidad');
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      } else {
        console.log('handleProductSelect - Agregando nuevo producto al carrito');
        return [{ id: product.id, name: product.name, sku: product.sku || product.barcode || '', brand: resolvedBrand ?? resolveBrand(product), quantity: 1, price: finalPrice }, ...prev];
      }
    });
  };

  const handleRemove = (id: string) => {
    setCart(prev => prev.filter(p => p.id !== id));
  };

  const handleQuantityChange = async (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemove(id);
      return;
    }

    // VALIDAR LÍMITES DE CANTIDAD ANTES DE CAMBIAR
    if (!validateQuantityLimit(id, newQuantity)) {
      return;
    }

    // VALIDACIÓN DE STOCK MEJORADA
    const isStockValid = await validateStockBeforeAdd(id, newQuantity - (cart.find(p => p.id === id)?.quantity || 0));
    if (!isStockValid) {
      return;
    }

    setCart(prev => prev.map(p => p.id === id ? { ...p, quantity: newQuantity } : p));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    let discountAmount = 0;
    
    if (discount) {
      if (discount.type === 'percentage') {
        discountAmount = subtotal * (discount.value / 100);
      } else {
        discountAmount = discount.value;
      }
    }
    
    return {
      subtotal,
      discountAmount,
      total: subtotal - discountAmount
    };
  };

  const handleClearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(null);
    setCurrentSaleId(null);
    // Limpiar del localStorage
    localStorage.removeItem('pos_cart_state');
    toast.toast({
      title: 'Carrito limpiado',
      description: 'Todos los productos han sido removidos del carrito',
      variant: 'default'
    });
  };

  // Función para confirmar venta exitosa y actualizar estados
  const confirmSaleSuccess = (saleData: any, paymentData: any) => {
    // Limpiar carrito y estados
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(null);
    setCurrentSaleId(null);
    localStorage.removeItem('pos_cart_state');

    // Notificar éxito con detalles
    const saleAmount = saleData.total || paymentData.total;
    toast.toast({
      title: '✅ Venta Completada',
      description: `Venta #${saleData.id || 'N/A'} por ${formatCurrency(saleAmount)} procesada exitosamente`,
      variant: 'default'
    });

    // Log de la venta completada
    console.log('🎉 Venta completada:', {
      saleId: saleData.id,
      customer: selectedCustomer?.firstName || 'Cliente no especificado',
      total: saleAmount,
      items: cart.length,
      paymentMethod: paymentData.paymentMethod
    });
  };

  const handleItemUpdate = (id: string, updates: Partial<{ notes?: string; priority?: 'low' | 'normal' | 'high' }>) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  // Función para recuperar una venta pendiente
  const recoverPendingSale = (saleData: any) => {
    try {
      setCart(saleData.items || []);
      if (saleData.customer) setSelectedCustomer(saleData.customer);
      if (saleData.discount) setDiscount(saleData.discount);
      setCurrentSaleId(saleData.id);

      toast.toast({
        title: 'Venta recuperada',
        description: `Venta pendiente #${saleData.id} restaurada`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error recuperando venta:', error);
      toast.toast({
        title: 'Error',
        description: 'No se pudo recuperar la venta pendiente',
        variant: 'destructive'
      });
    }
  };

  const handlePaymentComplete = async (paymentData: any) => {
    try {
      // Verificar si estamos autenticados, si no, hacer login automático
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No hay token de autenticación, intentando login automático...');
        try {
          await apiService.auth.autoLogin();
          console.log('Login automático exitoso');
        } catch (loginError) {
          console.error('Error en login automático:', loginError);
          toast.toast({
            title: 'Error de autenticación',
            description: 'No se pudo autenticar automáticamente. Verifica la conexión con el servidor.',
            variant: 'destructive'
          });
          return;
        }
      }

      const { total, subtotal, discountAmount } = calculateTotals();

      // Manejar casos especiales de pagos
      let saleTotal = total;
      let saleNotes = discount?.reason ? `Descuento aplicado: ${discount.reason}` : undefined;

      // Si es un apartado, ajustar el total de la venta al inicial pagado
      if (paymentData.isApartado) {
        saleTotal = paymentData.total; // Solo el inicial
        saleNotes = `Apartado - Inicial: $${paymentData.total.toFixed(2)}, Total apartado: $${paymentData.apartadoTotal.toFixed(2)}, Restante: $${paymentData.apartadoRemaining.toFixed(2)}`;
      }

      // Si es un crédito, manejar según el monto pagado
      if (paymentData.paymentMethod === 'credito') {
        if (paymentData.total === 0) {
          saleNotes = `Crédito - Cliente debe: $${total.toFixed(2)} (sin pago inicial)`;
        } else {
          saleNotes = `Crédito - Pagado: $${paymentData.total.toFixed(2)}, Cliente debe: $${(total - paymentData.total).toFixed(2)}`;
        }
      }

      // Usar el nuevo endpoint de ventas
      const saleData = {
        customerId: selectedCustomer?.id || paymentData.customerId || undefined,
        items: paymentData.cartItems.map((item: any) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price || 0
        })),
        total: saleTotal, // Usar el total ajustado
        paymentMethod: paymentData.isApartado ? 'apartado' : (paymentData.paymentMethod || 'special'),
        notes: saleNotes
      };

      console.log('📊 Enviando datos de venta:', saleData);

      // Usar apiService en lugar de fetch directo para mejor consistencia
      const result = await apiService.sales.create(saleData);
      console.log('✅ Venta procesada:', result);

      // Confirmar venta exitosa y actualizar estados
      confirmSaleSuccess(result.sale || result, paymentData);

    } catch (error: any) {
      console.error('❌ Error procesando venta:', error);
      
      // Manejo mejorado de errores
      let errorMessage = 'Error desconocido al procesar la venta';
      
      if (error.message?.includes('stock')) {
        errorMessage = 'Error de stock: Verifica la disponibilidad de productos';
      } else if (error.message?.includes('payment')) {
        errorMessage = 'Error de pago: Verifica el método de pago';
      } else if (error.message?.includes('customer')) {
        errorMessage = 'Error de cliente: Verifica los datos del cliente';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.toast({
        title: '❌ Error en Venta',
        description: errorMessage,
        variant: 'destructive'
      });

      // No limpiar el carrito en caso de error para permitir reintento
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const { total } = calculateTotals();

  return (
    <AppLayout>
      <div className="w-full p-6">
        {/* Header mejorado */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                💳 Punto de Venta
              </h1>
              <p className="text-gray-600 dark:text-gray-300">Sistema de ventas rápido y eficiente</p>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={reloadInventory}
                  className="text-xs"
                >
                  🔄 Recargar Inventario
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <CustomerActions 
                  selectedCustomer={selectedCustomer}
                  onCustomerChange={setSelectedCustomer}
                />
              </div>
              <div className="flex-1 max-w-md">
                <SaleSummary 
                  cartItems={cart} 
                  discount={discount}
                  onDiscountChange={setDiscount}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Interface Principal - Layout reorganizado */}
        <div className="grid grid-cols-12 gap-6">
          {/* Columna izquierda - Filtros y Búsqueda (reducido) */}
          <div className="col-span-3">
            <div className="space-y-4">
              <ProductFilters
                collapsed={filtersCollapsed}
                onCollapse={() => setFiltersCollapsed(true)}
                onExpand={() => setFiltersCollapsed(false)}
              />
              <ProductSearch onProductSelect={handleProductSelect} />
            </div>
          </div>

      {/* Carrito prominente en el centro */}
          <div className="col-span-6">
            <ShoppingCart 
              items={cart} 
              onRemove={handleRemove} 
              onQuantityChange={handleQuantityChange}
              onClearCart={handleClearCart}
              onItemUpdate={handleItemUpdate}
            />
          </div>

          {/* Columna derecha - Métodos de pago y acciones (más ancho) */}
          <div className="col-span-3 space-y-6">
            <PaymentMethods total={total} onQuickPay={async (method, amount) => {
              const { total: calculatedTotal, subtotal, discountAmount } = calculateTotals();
              
              // Construir payload de la venta
              const items = cart.map(it => ({ productId: it.id, quantity: it.quantity, price: it.price || 0 }));

              if (method === 'mixed') {
                // Abrir modal de pago mixto
                setMixedPaymentModalOpen(true);
                return;
              }

              try {
                // Usar apiService para crear venta
                const saleData = {
                  customerId: selectedCustomer?.id || undefined,
                  items,
                  subtotal,
                  discount: discountAmount,
                  total: calculatedTotal,
                  paymentMethod: method,
                  notes: discount?.reason ? `Descuento aplicado: ${discount.reason}` : undefined
                };

                const response = await fetch('/api/sales', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                  },
                  body: JSON.stringify(saleData)
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Error al procesar la venta');
                }

                const result = await response.json();

                // Notificar éxito
                toast.toast({
                  title: 'Venta procesada',
                  description: `Pago ${method} de ${formatCurrency(calculatedTotal)} procesado correctamente`,
                  variant: 'default'
                });

                // Limpiar estados
                setCart([]);
                setSelectedCustomer(null);
                setDiscount(null);
              } catch (err: any) {
                console.error('Error procesando venta rápida', err);
                toast.toast({
                  title: 'Error',
                  description: err.message || 'Error al procesar la venta. Intente nuevamente.',
                  variant: 'destructive'
                });
              }
            }} />
            <div className="space-y-4">
              <SaleActions 
                cartItems={cart} 
                onOpenSpecialPayment={() => setSpecialPaymentsModalOpen(true)}
              />
            </div>
          </div>
        </div>

        {/* Ventas Recientes */}
        <div className="mt-8">
          <RecentSales />
        </div>
      </div>

      {/* Modal de Pago Mixto */}
      <MixedPaymentModal
        open={mixedPaymentModalOpen}
        onOpenChange={setMixedPaymentModalOpen}
        total={total}
        cartItems={cart}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Modal de Pagos Especiales */}
      <SpecialPaymentsModal
        open={specialPaymentsModalOpen}
        onOpenChange={setSpecialPaymentsModalOpen}
        total={total}
        cartItems={cart}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Componente de prueba temporal para validar funcionalidad de stock */}
      <div className="mt-8">
        <StockValidationTester />
      </div>
    </AppLayout>
  );
}