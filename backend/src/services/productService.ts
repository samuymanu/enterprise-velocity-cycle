import { PrismaClient, InventoryMoveType, Product, InventoryMove } from '@prisma/client';
import { inventoryMovementService } from './inventoryMovementService';
import { stockValidationService } from './stockValidationService';
import logger from '../logger';

const prisma = new PrismaClient();

/**
 * Parámetros para actualizar stock con movimiento
 */
interface UpdateStockWithMovementParams {
  productId: string;
  type: InventoryMoveType;
  quantity: number;
  reason: string;
  userId: string;
  validateStock?: boolean;
}

/**
 * Resultado de actualización de stock
 */
interface StockUpdateResult {
  success: boolean;
  movement?: InventoryMove;
  previousStock: number;
  newStock: number;
  message: string;
}

/**
 * Métricas de stock de un producto
 */
interface StockMetrics {
  productId: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  stockRotation: number; // Rotaciones por período
  averageUsage: number; // Uso promedio por día
  daysUntilStockout: number; // Días estimados hasta agotarse
  stockValue: number; // Valor total del stock
  lastMovementDate?: Date;
  totalMovements: number;
  movements30Days: number;
  isLowStock: boolean;
  isOverstock: boolean;
  stockLevel: 'CRITICAL' | 'LOW' | 'NORMAL' | 'HIGH' | 'OVERSTOCK';
}

/**
 * Historial de stock de un producto
 */
interface StockHistoryEntry {
  date: Date;
  stock: number;
  movement: {
    id: string;
    type: InventoryMoveType;
    quantity: number;
    reason?: string;
    userId: string;
  };
}

/**
 * Alertas automáticas de stock
 */
interface StockAlert {
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'HIGH_USAGE' | 'NO_MOVEMENT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  productId: string;
  currentStock: number;
  threshold?: number;
  createdAt: Date;
}

/**
 * Servicio mejorado para gestión de productos con enfoque en stock
 */
export class ProductService {

  /**
   * Actualizar stock de un producto con movimiento automático
   */
  async updateStockWithMovement(params: UpdateStockWithMovementParams): Promise<StockUpdateResult> {
    const { 
      productId, 
      type, 
      quantity, 
      reason, 
      userId, 
      validateStock = true 
    } = params;

    try {
      // Obtener stock actual
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true, name: true, sku: true }
      });

      if (!product) {
        throw new Error(`Producto con ID ${productId} no encontrado`);
      }

      const previousStock = product.stock;

      // Validar stock si es necesario
      if (validateStock && (type === 'OUT' || type === 'ADJUSTMENT')) {
        const validation = await stockValidationService.validateStockAvailability({
          productId,
          quantityRequested: Math.abs(quantity)
        });

        if (!validation.isAvailable && type === 'OUT') {
          return {
            success: false,
            previousStock,
            newStock: previousStock,
            message: `No se puede realizar el movimiento: ${validation.message}`
          };
        }
      }

      // Crear el movimiento usando el servicio existente
      const movement = await inventoryMovementService.createMovement({
        productId,
        type,
        quantity: Math.abs(quantity), // El servicio maneja la dirección internamente
        reason,
        userId
      });

      // Obtener el nuevo stock
      const updatedProduct = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true }
      });

      const newStock = updatedProduct?.stock || previousStock;

      // Verificar alertas automáticas
      await this.checkStockAlerts(productId);

      logger.info('Stock updated with movement', {
        productId,
        productSku: product.sku,
        type,
        quantity,
        previousStock,
        newStock,
        movementId: movement.id
      });

      return {
        success: true,
        movement,
        previousStock,
        newStock,
        message: `Stock actualizado: ${previousStock} → ${newStock}`
      };

    } catch (error) {
      logger.error('Error updating stock with movement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
        type,
        quantity
      });

      return {
        success: false,
        previousStock: 0,
        newStock: 0,
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener historial de stock de un producto
   */
  async getStockHistory(productId: string, days: number = 30): Promise<StockHistoryEntry[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const movements = await prisma.inventoryMove.findMany({
        where: {
          productId,
          createdAt: {
            gte: startDate
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      // Reconstruir el historial de stock
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true }
      });

      if (!product) {
        throw new Error(`Producto con ID ${productId} no encontrado`);
      }

      let currentStock = product.stock;
      const history: StockHistoryEntry[] = [];

      // Trabajar hacia atrás para reconstruir el historial
      for (let i = movements.length - 1; i >= 0; i--) {
        const movement = movements[i];
        
        // Revertir el movimiento para obtener el stock anterior
        let previousStock = currentStock;
        switch (movement.type) {
          case 'IN':
            previousStock = currentStock - movement.quantity;
            break;
          case 'OUT':
            previousStock = currentStock + movement.quantity;
            break;
          case 'ADJUSTMENT':
            // Para ajustes, necesitamos calcular la diferencia
            previousStock = currentStock - movement.quantity;
            break;
        }

        history.unshift({
          date: movement.createdAt,
          stock: currentStock,
          movement: {
            id: movement.id,
            type: movement.type,
            quantity: movement.quantity,
            reason: movement.reason || undefined,
            userId: movement.userId
          }
        });

        currentStock = previousStock;
      }

      return history;

    } catch (error) {
      logger.error('Error getting stock history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
        days
      });
      throw error;
    }
  }

  /**
   * Calcular métricas de stock de un producto
   */
  async calculateStockMetrics(productId: string): Promise<StockMetrics> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          stock: true,
          minStock: true,
          maxStock: true,
          costPrice: true
        }
      });

      if (!product) {
        throw new Error(`Producto con ID ${productId} no encontrado`);
      }

      // Obtener movimientos de los últimos 90 días
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const movements = await prisma.inventoryMove.findMany({
        where: {
          productId,
          createdAt: {
            gte: startDate
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Movimientos de los últimos 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const movements30Days = movements.filter(m => m.createdAt >= thirtyDaysAgo).length;

      // Calcular uso promedio (salidas por día)
      const outMovements = movements.filter(m => m.type === 'OUT');
      const totalOutQuantity = outMovements.reduce((sum, m) => sum + m.quantity, 0);
      const averageUsage = totalOutQuantity / 90; // Promedio diario en 90 días

      // Calcular días hasta agotarse
      const daysUntilStockout = averageUsage > 0 ? Math.floor(product.stock / averageUsage) : Infinity;

      // Rotación de stock (veces que se renueva el stock)
      const stockRotation = product.stock > 0 ? totalOutQuantity / product.stock : 0;

      // Valor del stock
      const stockValue = product.stock * product.costPrice;

      // Último movimiento
      const lastMovementDate = movements.length > 0 ? movements[0].createdAt : undefined;

      // Determinar nivel de stock
      let stockLevel: 'CRITICAL' | 'LOW' | 'NORMAL' | 'HIGH' | 'OVERSTOCK';
      const isLowStock = product.stock <= product.minStock;
      const isOverstock = product.maxStock ? product.stock > product.maxStock : false;

      if (product.stock === 0) {
        stockLevel = 'CRITICAL';
      } else if (isLowStock) {
        stockLevel = 'LOW';
      } else if (isOverstock) {
        stockLevel = 'OVERSTOCK';
      } else if (product.maxStock && product.stock > product.maxStock * 0.8) {
        stockLevel = 'HIGH';
      } else {
        stockLevel = 'NORMAL';
      }

      return {
        productId,
        currentStock: product.stock,
        minStock: product.minStock,
        maxStock: product.maxStock || undefined,
        stockRotation,
        averageUsage,
        daysUntilStockout: daysUntilStockout === Infinity ? -1 : daysUntilStockout,
        stockValue,
        lastMovementDate,
        totalMovements: movements.length,
        movements30Days,
        isLowStock,
        isOverstock,
        stockLevel
      };

    } catch (error) {
      logger.error('Error calculating stock metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId
      });
      throw error;
    }
  }

  /**
   * Verificar y generar alertas automáticas de stock
   */
  async checkStockAlerts(productId: string): Promise<StockAlert[]> {
    try {
      const metrics = await this.calculateStockMetrics(productId);
      const alerts: StockAlert[] = [];

      // Alerta de stock crítico (sin stock)
      if (metrics.currentStock === 0) {
        alerts.push({
          type: 'OUT_OF_STOCK',
          priority: 'CRITICAL',
          message: `Producto sin stock disponible`,
          productId,
          currentStock: metrics.currentStock,
          createdAt: new Date()
        });
      }
      // Alerta de stock bajo
      else if (metrics.isLowStock) {
        alerts.push({
          type: 'LOW_STOCK',
          priority: 'HIGH',
          message: `Stock por debajo del mínimo (${metrics.minStock})`,
          productId,
          currentStock: metrics.currentStock,
          threshold: metrics.minStock,
          createdAt: new Date()
        });
      }

      // Alerta de sobrestock
      if (metrics.isOverstock) {
        alerts.push({
          type: 'OVERSTOCK',
          priority: 'MEDIUM',
          message: `Stock por encima del máximo (${metrics.maxStock})`,
          productId,
          currentStock: metrics.currentStock,
          threshold: metrics.maxStock,
          createdAt: new Date()
        });
      }

      // Alerta de alto uso (si el uso promedio es muy alto)
      if (metrics.averageUsage > 0 && metrics.daysUntilStockout < 7) {
        alerts.push({
          type: 'HIGH_USAGE',
          priority: 'HIGH',
          message: `Stock se agotará en ${metrics.daysUntilStockout} días con el uso actual`,
          productId,
          currentStock: metrics.currentStock,
          createdAt: new Date()
        });
      }

      // Alerta de falta de movimientos (producto sin actividad)
      if (metrics.movements30Days === 0 && metrics.currentStock > 0) {
        alerts.push({
          type: 'NO_MOVEMENT',
          priority: 'LOW',
          message: `Sin movimientos en los últimos 30 días`,
          productId,
          currentStock: metrics.currentStock,
          createdAt: new Date()
        });
      }

      // Log de alertas generadas
      if (alerts.length > 0) {
        logger.warn('Stock alerts generated', {
          productId,
          alertCount: alerts.length,
          alerts: alerts.map(a => ({ type: a.type, priority: a.priority }))
        });
      }

      return alerts;

    } catch (error) {
      logger.error('Error checking stock alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId
      });
      return [];
    }
  }

  /**
   * Obtener productos que requieren atención
   */
  async getProductsRequiringAttention(): Promise<{
    lowStock: Product[];
    outOfStock: Product[];
    overstock: Product[];
    highUsage: Product[];
    noMovement: Product[];
  }> {
    try {
      // Productos sin stock
      const outOfStock = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          stock: 0
        },
        orderBy: { name: 'asc' }
      });

      // Productos con stock bajo - usando consulta raw por limitaciones de Prisma
      const lowStock = await prisma.$queryRaw<Product[]>`
        SELECT * FROM "Product" 
        WHERE status = 'ACTIVE' 
        AND stock > 0 
        AND stock <= "minStock"
        ORDER BY stock ASC
      `;

      // Productos con sobrestock - usando consulta raw
      const overstock = await prisma.$queryRaw<Product[]>`
        SELECT * FROM "Product" 
        WHERE status = 'ACTIVE' 
        AND "maxStock" IS NOT NULL 
        AND stock > "maxStock"
        ORDER BY stock DESC
      `;

      // Para productos de alto uso y sin movimiento, necesitaríamos consultas más complejas
      // Por ahora, devolvemos arrays vacíos
      const highUsage: Product[] = [];
      const noMovement: Product[] = [];

      return {
        lowStock,
        outOfStock,
        overstock,
        highUsage,
        noMovement
      };

    } catch (error) {
      logger.error('Error getting products requiring attention', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Optimizar niveles de stock basado en historial
   */
  async optimizeStockLevels(productId: string): Promise<{
    recommendedMinStock: number;
    recommendedMaxStock: number;
    reasoning: string;
  }> {
    try {
      const metrics = await this.calculateStockMetrics(productId);
      
      // Cálculo simple basado en uso promedio
      const safetyStock = Math.ceil(metrics.averageUsage * 7); // 7 días de seguridad
      const recommendedMinStock = Math.max(safetyStock, 1);
      const recommendedMaxStock = Math.ceil(metrics.averageUsage * 30); // 30 días de stock

      let reasoning = `Basado en uso promedio de ${metrics.averageUsage.toFixed(1)} unidades/día. `;
      reasoning += `Stock de seguridad: ${safetyStock} unidades (7 días). `;
      reasoning += `Stock máximo para 30 días de operación.`;

      return {
        recommendedMinStock,
        recommendedMaxStock,
        reasoning
      };

    } catch (error) {
      logger.error('Error optimizing stock levels', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId
      });
      throw error;
    }
  }
}

// Exportar instancia singleton
export const productService = new ProductService();
