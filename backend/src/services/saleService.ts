import { PrismaClient, PaymentMethod } from '@prisma/client';
import logger from '../logger';

const prisma = new PrismaClient();

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
          firstName: 'Cliente',
          lastName: 'Genérico',
          documentNumber: 'GENERIC',
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
        paymentMethod: paymentMethod as PaymentMethod,
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
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: product.stock - item.quantity
        }
      });
    }

    return {
      ...sale,
      saleItems
    };
  });

  logger.info('Sale created successfully', { saleId: result.id, saleNumber });

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