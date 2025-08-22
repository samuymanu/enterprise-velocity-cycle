import { PrismaClient, InventoryMove, InventoryMoveType, Prisma } from '@prisma/client';
import logger from '../logger';

const prisma = new PrismaClient();

/**
 * Interface para los parámetros de creación de movimiento
 */
export interface CreateMovementParams {
  productId: string;
  type: InventoryMoveType;
  quantity: number;
  reason?: string;
  userId: string;
}

/**
 * Interface para filtros de consulta de movimientos
 */
export interface MovementFilters {
  productId?: string;
  type?: InventoryMoveType;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Interface para respuesta paginada
 */
export interface PaginatedMovements {
  movements: InventoryMoveWithRelations[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Tipo para movimiento con relaciones
 */
export type InventoryMoveWithRelations = InventoryMove & {
  product: {
    id: string;
    name: string;
    sku: string;
    stock: number;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
};

/**
 * Servicio para gestión de movimientos de inventario
 */
export class InventoryMovementService {
  
  /**
   * Crear un nuevo movimiento de inventario
   */
  async createMovement(params: CreateMovementParams): Promise<InventoryMoveWithRelations> {
    const { productId, type, quantity, reason, userId } = params;

    logger.info(`Creating inventory movement: ${type} for product ${productId}`, {
      productId,
      type,
      quantity,
      userId
    });

    // Validar que la cantidad no sea cero
    if (quantity === 0) {
      throw new Error('La cantidad no puede ser 0');
    }

    // Para movimientos IN y OUT, la cantidad debe ser positiva
    // Para ADJUSTMENT, puede ser negativa o positiva
    if ((type === 'IN' || type === 'OUT') && quantity <= 0) {
      throw new Error('La cantidad debe ser mayor a 0 para movimientos IN y OUT');
    }

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, stock: true }
    });

    if (!product) {
      throw new Error(`Producto con ID ${productId} no encontrado`);
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, username: true }
    });

    if (!user) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }

    // Para movimientos de salida y ajustes negativos, verificar stock disponible
    if (type === 'OUT' || (type === 'ADJUSTMENT' && quantity < 0)) {
      const quantityToReduce = type === 'OUT' ? quantity : Math.abs(quantity);
      if (product.stock < quantityToReduce) {
        throw new Error(`Stock insuficiente. Stock actual: ${product.stock}, Cantidad solicitada: ${quantityToReduce}`);
      }
    }

    // Calcular el nuevo stock
    let stockChange = 0;
    switch (type) {
      case 'IN':
        stockChange = quantity;
        break;
      case 'OUT':
        stockChange = -quantity;
        break;
      case 'ADJUSTMENT':
        // Para ajustes, la cantidad puede ser positiva o negativa
        stockChange = quantity;
        break;
      case 'TRANSFER':
        // Los transfers requieren lógica especial, por ahora solo registramos
        stockChange = 0;
        break;
    }

    const newStock = product.stock + stockChange;

    try {
      // Usar transacción para asegurar consistencia
      const result = await prisma.$transaction(async (tx) => {
        // Crear el movimiento
        const movement = await tx.inventoryMove.create({
          data: {
            productId,
            type,
            quantity: Math.abs(quantity), // Almacenar siempre como positivo
            reason,
            userId
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                stock: true
              }
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true
              }
            }
          }
        });

        // Actualizar el stock del producto (solo si no es TRANSFER)
        if (type !== 'TRANSFER') {
          await tx.product.update({
            where: { id: productId },
            data: { stock: Math.max(0, newStock) } // Evitar stock negativo
          });
        }

        return movement;
      });

      logger.info(`Inventory movement created successfully`, {
        movementId: result.id,
        productId,
        type,
        oldStock: product.stock,
        newStock: product.stock + stockChange
      });

      return result;

    } catch (error) {
      logger.error('Error creating inventory movement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId,
        type,
        quantity,
        userId
      });
      throw error;
    }
  }

  /**
   * Obtener movimientos con filtros y paginación
   */
  async getMovements(filters: MovementFilters = {}): Promise<PaginatedMovements> {
    const {
      productId,
      type,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = filters;

    // Construir filtros de consulta
    const where: Prisma.InventoryMoveWhereInput = {};

    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const offset = (page - 1) * limit;

    try {
      // Obtener movimientos y conteo total en paralelo
      const [movements, totalCount] = await Promise.all([
        prisma.inventoryMove.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                stock: true
              }
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.inventoryMove.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        movements,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };

    } catch (error) {
      logger.error('Error fetching inventory movements', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters
      });
      throw error;
    }
  }

  /**
   * Obtener movimientos de un producto específico
   */
  async getMovementsByProduct(productId: string, limit = 20): Promise<InventoryMoveWithRelations[]> {
    try {
      const movements = await prisma.inventoryMove.findMany({
        where: { productId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              stock: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return movements;

    } catch (error) {
      logger.error('Error fetching movements by product', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId
      });
      throw error;
    }
  }

  /**
   * Obtener un movimiento específico por ID
   */
  async getMovementById(id: string): Promise<InventoryMoveWithRelations | null> {
    try {
      const movement = await prisma.inventoryMove.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              stock: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      });

      return movement;

    } catch (error) {
      logger.error('Error fetching movement by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de movimientos
   */
  async getMovementStats(productId?: string): Promise<{
    totalIn: number;
    totalOut: number;
    totalAdjustments: number;
    netChange: number;
    movementCount: number;
    totalMovements: number;
    movementsByType: Record<InventoryMoveType, number>;
    lastMovement?: Date;
  }> {
    try {
      const where: Prisma.InventoryMoveWhereInput = productId ? { productId } : {};

      const [totalMovements, movementsByType, lastMovement, rawMovements] = await Promise.all([
        prisma.inventoryMove.count({ where }),
        prisma.inventoryMove.groupBy({
          by: ['type'],
          where,
          _count: { type: true }
        }),
        prisma.inventoryMove.findFirst({
          where,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }),
        prisma.inventoryMove.findMany({
          where,
          select: { type: true, quantity: true }
        })
      ]);

      // Convertir el resultado de groupBy a un objeto más fácil de usar
      const typeStats: Record<InventoryMoveType, number> = {
        IN: 0,
        OUT: 0,
        ADJUSTMENT: 0,
        TRANSFER: 0
      };

      movementsByType.forEach(item => {
        typeStats[item.type] = item._count.type;
      });

      // Calcular totales para compatibilidad con tests
      let totalIn = 0;
      let totalOut = 0;
      let totalAdjustments = 0;

      rawMovements.forEach(movement => {
        switch (movement.type) {
          case 'IN':
            totalIn += movement.quantity;
            break;
          case 'OUT':
            totalOut += movement.quantity;
            break;
          case 'ADJUSTMENT':
            totalAdjustments += Math.abs(movement.quantity);
            break;
        }
      });

      const netChange = totalIn - totalOut;

      return {
        totalIn,
        totalOut,
        totalAdjustments,
        netChange,
        movementCount: totalMovements,
        totalMovements,
        movementsByType: typeStats,
        lastMovement: lastMovement?.createdAt
      };

    } catch (error) {
      logger.error('Error fetching movement stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId
      });
      throw error;
    }
  }
}

// Exportar instancia singleton
export const inventoryMovementService = new InventoryMovementService();
