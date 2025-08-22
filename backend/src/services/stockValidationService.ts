import { PrismaClient } from '@prisma/client';
import logger from '../logger';

const prisma = new PrismaClient();

/**
 * Parámetros para validar disponibilidad de stock
 */
interface StockAvailabilityParams {
  productId: string;
  quantityRequested: number;
}

/**
 * Resultado de validación de stock
 */
interface StockValidationResult {
  isAvailable: boolean;
  availableQuantity: number;
  requestedQuantity: number;
  totalStock: number;
  message: string;
}

/**
 * Información de stock disponible
 */
interface AvailableStockInfo {
  productId: string;
  totalStock: number;
  availableStock: number;
  minStock: number;
  maxStock?: number;
  status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

/**
 * Servicio para validación y gestión de stock
 */
export class StockValidationService {

  /**
   * Validar disponibilidad de stock para una cantidad solicitada
   */
  async validateStockAvailability(params: StockAvailabilityParams): Promise<StockValidationResult> {
    const { productId, quantityRequested } = params;

    try {
      // Obtener información del producto
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          minStock: true,
          maxStock: true,
          status: true
        }
      });

      if (!product) {
        throw new Error(`Producto con ID ${productId} no encontrado`);
      }

      if (product.status !== 'ACTIVE') {
        return {
          isAvailable: false,
          availableQuantity: 0,
          requestedQuantity: quantityRequested,
          totalStock: product.stock,
          message: `Producto ${product.sku} no está activo`
        };
      }

      const availableQuantity = product.stock;
      const isAvailable = availableQuantity >= quantityRequested;

      let message = '';
      if (!isAvailable) {
        message = `Stock insuficiente. Disponible: ${availableQuantity}, Solicitado: ${quantityRequested}`;
      } else if (availableQuantity - quantityRequested < product.minStock) {
        message = `Advertencia: Esta operación dejará el stock por debajo del mínimo (${product.minStock})`;
      } else {
        message = 'Stock disponible';
      }

      logger.info('Stock availability validated', {
        productId,
        productSku: product.sku,
        quantityRequested,
        availableQuantity,
        isAvailable
      });

      return {
        isAvailable,
        availableQuantity,
        requestedQuantity: quantityRequested,
        totalStock: product.stock,
        message
      };

    } catch (error) {
      logger.error('Error validating stock availability', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
        quantityRequested
      });
      throw error;
    }
  }

  /**
   * Obtener información detallada de stock disponible
   */
  async getAvailableStock(productId: string): Promise<AvailableStockInfo> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          minStock: true,
          maxStock: true,
          status: true
        }
      });

      if (!product) {
        throw new Error(`Producto con ID ${productId} no encontrado`);
      }

      const availableStock = product.stock;

      // Determinar estado
      let status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
      if (availableStock <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (availableStock <= product.minStock) {
        status = 'LOW_STOCK';
      } else {
        status = 'AVAILABLE';
      }

      return {
        productId,
        totalStock: product.stock,
        availableStock,
        minStock: product.minStock,
        maxStock: product.maxStock || undefined,
        status
      };

    } catch (error) {
      logger.error('Error getting available stock info', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId
      });
      throw error;
    }
  }

  /**
   * Validar operaciones concurrentes de stock usando transacciones
   */
  async validateConcurrentOperation(productId: string, quantity: number): Promise<boolean> {
    try {
      // Usar una transacción para verificar y bloquear
      const result = await prisma.$transaction(async (tx) => {
        // Obtener el stock actual con lock
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { stock: true }
        });

        if (!product) {
          throw new Error(`Producto ${productId} no encontrado`);
        }

        // Validar que hay suficiente stock
        return product.stock >= quantity;
      });

      return result;

    } catch (error) {
      logger.error('Error validating concurrent operation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
        quantity
      });
      return false;
    }
  }

  /**
   * Verificar si un producto está en stock bajo
   */
  async isLowStock(productId: string): Promise<boolean> {
    try {
      const stockInfo = await this.getAvailableStock(productId);
      return stockInfo.status === 'LOW_STOCK' || stockInfo.status === 'OUT_OF_STOCK';
    } catch (error) {
      logger.error('Error checking low stock', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId
      });
      return false;
    }
  }

  /**
   * Obtener productos con stock bajo
   */
  async getLowStockProducts(): Promise<AvailableStockInfo[]> {
    try {
      const products = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          stock: {
            lte: prisma.product.fields.minStock
          }
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          minStock: true,
          maxStock: true,
          status: true
        },
        orderBy: {
          stock: 'asc'
        }
      });

      return products.map(product => ({
        productId: product.id,
        totalStock: product.stock,
        availableStock: product.stock,
        minStock: product.minStock,
        maxStock: product.maxStock || undefined,
        status: product.stock <= 0 ? 'OUT_OF_STOCK' as const : 'LOW_STOCK' as const
      }));

    } catch (error) {
      logger.error('Error getting low stock products', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Reservar stock para una operación
   */
  async reserveStock(productId: string, quantity: number, userId: string, reason: string = 'Stock reservation'): Promise<{
    reservationId: string;
    success: boolean;
    message: string;
  }> {
    try {
      // Validar disponibilidad primero
      const validation = await this.validateStockAvailability({
        productId,
        quantityRequested: quantity
      });

      if (!validation.isAvailable) {
        return {
          reservationId: '',
          success: false,
          message: validation.message
        };
      }

      // Crear reserva en transacción
      const reservation = await prisma.$transaction(async (tx) => {
        // Verificar stock nuevamente dentro de la transacción
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { stock: true, name: true }
        });

        if (!product || product.stock < quantity) {
          throw new Error('Stock insuficiente para crear reserva');
        }

        // Crear la reserva
        const newReservation = await tx.stockReservation.create({
          data: {
            productId,
            quantity,
            reservedBy: userId,
            reason,
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
          }
        });

        return newReservation;
      });

      logger.info('Stock reserved successfully', {
        reservationId: reservation.id,
        productId,
        quantity,
        userId
      });

      return {
        reservationId: reservation.id,
        success: true,
        message: `Stock reservado: ${quantity} unidades`
      };

    } catch (error) {
      logger.error('Error reserving stock', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
        quantity,
        userId
      });

      return {
        reservationId: '',
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Liberar reserva de stock
   */
  async releaseStock(reservationId: string, consume: boolean = false): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Encontrar la reserva
        const reservation = await tx.stockReservation.findUnique({
          where: { id: reservationId },
          include: { product: true }
        });

        if (!reservation) {
          throw new Error(`Reserva ${reservationId} no encontrada`);
        }

        if (reservation.status !== 'ACTIVE') {
          throw new Error(`Reserva ${reservationId} no está activa`);
        }

        // Si consume = true, convertir reserva en movimiento de salida
        if (consume) {
          // Actualizar stock del producto
          await tx.product.update({
            where: { id: reservation.productId },
            data: { stock: { decrement: reservation.quantity } }
          });

          // Marcar reserva como consumida
          await tx.stockReservation.update({
            where: { id: reservationId },
            data: { 
              status: 'CONSUMED'
            }
          });

          logger.info('Stock reservation consumed', {
            reservationId,
            productId: reservation.productId,
            quantity: reservation.quantity
          });

          return {
            success: true,
            message: `Reserva consumida: ${reservation.quantity} unidades del producto ${reservation.product.name}`
          };
        } else {
          // Solo liberar la reserva sin consumir
          await tx.stockReservation.update({
            where: { id: reservationId },
            data: { 
              status: 'RELEASED'
            }
          });

          logger.info('Stock reservation released', {
            reservationId,
            productId: reservation.productId,
            quantity: reservation.quantity
          });

          return {
            success: true,
            message: `Reserva liberada: ${reservation.quantity} unidades del producto ${reservation.product.name}`
          };
        }
      });

      return result;

    } catch (error) {
      logger.error('Error releasing stock reservation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reservationId,
        consume
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener reservas activas de un producto
   */
  async getActiveReservations(productId: string): Promise<{
    totalReserved: number;
    reservations: Array<{
      id: string;
      quantity: number;
      userId: string;
      reason: string;
      createdAt: Date;
      expiresAt: Date;
    }>;
  }> {
    try {
      const reservations = await prisma.stockReservation.findMany({
        where: {
          productId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      const totalReserved = reservations.reduce((sum, r) => sum + r.quantity, 0);

      return {
        totalReserved,
        reservations: reservations.map(r => ({
          id: r.id,
          quantity: r.quantity,
          userId: r.reservedBy,
          reason: r.reason || '',
          createdAt: r.createdAt,
          expiresAt: r.expiresAt || new Date()
        }))
      };

    } catch (error) {
      logger.error('Error getting active reservations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId
      });
      
      return {
        totalReserved: 0,
        reservations: []
      };
    }
  }

  /**
   * Validar múltiples productos para una operación
   */
  async validateMultipleProducts(items: { productId: string; quantity: number }[]): Promise<{
    isValid: boolean;
    validations: Array<StockValidationResult & { productId: string }>;
    errors: string[];
  }> {
    try {
      const validations: Array<StockValidationResult & { productId: string }> = [];
      const errors: string[] = [];

      for (const item of items) {
        try {
          const validation = await this.validateStockAvailability({
            productId: item.productId,
            quantityRequested: item.quantity
          });

          validations.push({
            ...validation,
            productId: item.productId
          });

          if (!validation.isAvailable) {
            errors.push(`${item.productId}: ${validation.message}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          errors.push(`${item.productId}: ${errorMessage}`);
          validations.push({
            productId: item.productId,
            isAvailable: false,
            availableQuantity: 0,
            requestedQuantity: item.quantity,
            totalStock: 0,
            message: errorMessage
          });
        }
      }

      const isValid = errors.length === 0;

      return {
        isValid,
        validations,
        errors
      };

    } catch (error) {
      logger.error('Error validating multiple products', {
        error: error instanceof Error ? error.message : 'Unknown error',
        itemCount: items.length
      });
      throw error;
    }
  }
}

// Exportar instancia singleton
export const stockValidationService = new StockValidationService();
