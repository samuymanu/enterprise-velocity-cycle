import { PrismaClient, PaymentMethod } from '@prisma/client';
import logger from '../logger';

// Importar io de forma dinámica para evitar circular dependencies
let io: any = null;
const loadIo = () => {
  if (io) return io;
  try {
    io = require('../server').io;
  } catch (error) {
    console.warn('No se pudo importar io de server.ts');
  }
  return io;
};
loadIo();

const prisma = new PrismaClient();

// Mapeo de métodos de pago del frontend al formato de Prisma
const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  'cash-ves': PaymentMethod.CASH_VES,
  'cash-usd': PaymentMethod.CASH_USD,
  'card': PaymentMethod.CARD,
  'transfer': PaymentMethod.TRANSFER,
  'mixed': PaymentMethod.MIXED,
  'apartado': 'APARTADO' as PaymentMethod,
  'credito': 'CREDITO' as PaymentMethod,
  // También aceptar los valores en mayúsculas por si acaso
  'CASH_VES': PaymentMethod.CASH_VES,
  'CASH_USD': PaymentMethod.CASH_USD,
  'CARD': PaymentMethod.CARD,
  'TRANSFER': PaymentMethod.TRANSFER,
  'MIXED': PaymentMethod.MIXED,
  'APARTADO': 'APARTADO' as PaymentMethod,
  'CREDITO': 'CREDITO' as PaymentMethod
};

export interface CreateSaleParams {
  customerId?: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentMethod: string;
  notes?: string;
}

export async function createSaleService(params: CreateSaleParams) {
  const { customerId, userId, items, total, paymentMethod, notes } = params;

  logger.info('Creating sale', { customerId, userId, itemCount: items.length, total, paymentMethod });

  // Mapear el método de pago al formato de Prisma
  const mappedPaymentMethod = PAYMENT_METHOD_MAP[paymentMethod];
  if (!mappedPaymentMethod) {
    throw new Error(`Método de pago inválido: ${paymentMethod}. Valores válidos: ${Object.keys(PAYMENT_METHOD_MAP).join(', ')}`);
  }

  // Validar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true }
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Si no hay customerId, buscar o crear cliente genérico
  let finalCustomerId = customerId;
  if (!customerId) {
    // Buscar cliente genérico
    let genericCustomer = await prisma.customer.findFirst({
      where: { documentNumber: 'GENERIC' }
    });

    if (!genericCustomer) {
      // Crear cliente genérico si no existe
      genericCustomer = await prisma.customer.create({
        data: {
          documentType: 'CI',
          documentNumber: 'GENERIC',
          firstName: 'Cliente',
          lastName: 'Genérico',
          customerType: 'INDIVIDUAL',
          phone: '',
          email: 'generic@enterprise.com'
        }
      });
    }
    finalCustomerId = genericCustomer.id;
  } else {
    // Validar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: finalCustomerId },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!customer) {
      throw new Error('Cliente no encontrado');
    }
  }

  // Generar número de venta único
  const saleNumber = await generateSaleNumber();

  // Calcular subtotal y tax (por ahora tax = 0)
  const subtotal = total;
  const tax = 0;
  const discount = 0;

  // Usar transacción para asegurar consistencia
  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear la venta
    const sale = await tx.sale.create({
      data: {
        saleNumber,
        customerId: finalCustomerId!,
        userId,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod: mappedPaymentMethod,
        notes
      }
    });

    // 2. Crear los items de la venta y descontar inventario
    const saleItems = [];
    for (const item of items) {
      // Verificar stock disponible
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, stock: true, sku: true }
      });

      if (!product) {
        throw new Error(`Producto ${item.productId} no encontrado`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`);
      }

      // Crear item de venta
      const saleItem = await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity
        }
      });

      saleItems.push(saleItem);

      // Crear movimiento de inventario (OUT)
      await tx.inventoryMove.create({
        data: {
          productId: item.productId,
          type: 'OUT',
          quantity: item.quantity,
          reason: `Sale ${saleNumber}`,
          userId
        }
      });

      // Actualizar stock del producto
      logger.info(`Updating stock for product ${item.productId}: ${product.stock} - ${item.quantity} = ${product.stock - item.quantity}`);
      const newStock = product.stock - item.quantity;
      
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: newStock
        }
      });
      
      logger.info(`Stock updated successfully for product ${item.productId}`);

      // Emitir evento WebSocket para actualización en tiempo real
    if (loadIo()) {
        try {
      io.to('inventory').emit('inventory:stock-updated', {
            productId: item.productId,
            productName: product.name,
            newStock: newStock,
            reason: `Sale ${saleNumber}`,
            timestamp: new Date().toISOString()
          });
          
          console.log(`📡 WebSocket: Stock actualizado para ${product.name} (${product.sku}): ${newStock}`);
        } catch (error) {
          console.error('Error emitiendo evento WebSocket:', error);
        }
      }
    }

    return {
      ...sale,
      saleItems
    };
  });

  logger.info('Sale created successfully', { saleId: result.id, saleNumber });

  // Emitir evento de venta completada
  if (loadIo()) {
    try {
      io.to('sales').emit('sales:completed', {
        saleId: result.id,
        saleNumber: result.saleNumber,
        total: result.total,
        items: items,
        timestamp: new Date().toISOString()
      });
      
      console.log(`📡 WebSocket: Venta completada ${result.saleNumber}`);
    } catch (error) {
      console.error('Error emitiendo evento de venta:', error);
    }
  }

  return result;
}

async function generateSaleNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  // Contar ventas del día
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const salesCount = await prisma.sale.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lt: endOfDay
      }
    }
  });

  const sequence = String(salesCount + 1).padStart(4, '0');
  return `V${year}${month}${day}${sequence}`;
}