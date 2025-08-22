import { productService } from './src/services/productService';
import { inventoryMovementService } from './src/services/inventoryMovementService';
import { stockValidationService } from './src/services/stockValidationService';
import { PrismaClient, InventoryMoveType } from '@prisma/client';

// Crear mock de Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    product: {
      findUnique: jest.fn(),
    },
    inventoryMove: {
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
  InventoryMoveType: {
    IN: 'IN',
    OUT: 'OUT',
    ADJUSTMENT: 'ADJUSTMENT'
  }
}));

// Mocks
jest.mock('./src/services/inventoryMovementService');
jest.mock('./src/services/stockValidationService');
jest.mock('./src/logger');

const mockInventoryMovementService = inventoryMovementService as jest.Mocked<typeof inventoryMovementService>;
const mockStockValidationService = stockValidationService as jest.Mocked<typeof stockValidationService>;

// Obtener la instancia mock de prisma
const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('ProductService - Enhanced Stock Management', () => {
  const testProductId = 'test-product-id';
  const testUserId = 'test-user-id';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mockPrisma.$disconnect();
  });

  describe('updateStockWithMovement', () => {
    it('should update stock successfully with IN movement', async () => {
      // Arrange
      const mockProduct = { stock: 10, name: 'Test Product', sku: 'TEST-001' };
      const mockMovement = {
        id: 'movement-id',
        type: InventoryMoveType.IN,
        quantity: 5,
        reason: 'Test entry'
      };

      jest.spyOn(prisma.product, 'findUnique')
        .mockResolvedValueOnce(mockProduct as any)
        .mockResolvedValueOnce({ stock: 15 } as any);
      
      mockInventoryMovementService.createMovement.mockResolvedValue(mockMovement as any);

      // Act
      const result = await productService.updateStockWithMovement({
        productId: testProductId,
        type: InventoryMoveType.IN,
        quantity: 5,
        reason: 'Test entry',
        userId: testUserId
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.previousStock).toBe(10);
      expect(result.newStock).toBe(15);
      expect(result.movement).toEqual(mockMovement);
      expect(mockInventoryMovementService.createMovement).toHaveBeenCalledWith({
        productId: testProductId,
        type: InventoryMoveType.IN,
        quantity: 5,
        reason: 'Test entry',
        userId: testUserId
      });
    });

    it('should validate stock for OUT movements', async () => {
      // Arrange
      const mockProduct = { stock: 10, name: 'Test Product', sku: 'TEST-001' };
      
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValueOnce(mockProduct as any);
      
      mockStockValidationService.validateStockAvailability.mockResolvedValue({
        isAvailable: false,
        message: 'Insufficient stock',
        availableQuantity: 10,
        requestedQuantity: 15,
        totalStock: 10
      });

      // Act
      const result = await productService.updateStockWithMovement({
        productId: testProductId,
        type: InventoryMoveType.OUT,
        quantity: 15,
        reason: 'Test sale',
        userId: testUserId
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient stock');
      expect(mockStockValidationService.validateStockAvailability).toHaveBeenCalledWith({
        productId: testProductId,
        quantityRequested: 15
      });
    });

    it('should handle product not found', async () => {
      // Arrange
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValueOnce(null);

      // Act
      const result = await productService.updateStockWithMovement({
        productId: 'nonexistent-id',
        type: InventoryMoveType.IN,
        quantity: 5,
        reason: 'Test',
        userId: testUserId
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toContain('no encontrado');
    });
  });

  describe('getStockHistory', () => {
    it('should return stock history for given period', async () => {
      // Arrange
      const mockProduct = { stock: 20 };
      const mockMovements = [
        {
          id: 'mov-1',
          type: InventoryMoveType.IN,
          quantity: 10,
          reason: 'Purchase',
          userId: testUserId,
          createdAt: new Date('2024-01-15'),
          user: { id: testUserId, firstName: 'Test', lastName: 'User' }
        },
        {
          id: 'mov-2',
          type: InventoryMoveType.OUT,
          quantity: 5,
          reason: 'Sale',
          userId: testUserId,
          createdAt: new Date('2024-01-16'),
          user: { id: testUserId, firstName: 'Test', lastName: 'User' }
        }
      ];

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      jest.spyOn(prisma.inventoryMove, 'findMany').mockResolvedValue(mockMovements as any);

      // Act
      const result = await productService.getStockHistory(testProductId, 30);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].movement.type).toBe(InventoryMoveType.IN);
      expect(result[1].movement.type).toBe(InventoryMoveType.OUT);
      expect(prisma.inventoryMove.findMany).toHaveBeenCalledWith({
        where: {
          productId: testProductId,
          createdAt: {
            gte: expect.any(Date)
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
    });

    it('should handle product not found for history', async () => {
      // Arrange
      jest.spyOn(prisma.inventoryMove, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(productService.getStockHistory('nonexistent-id', 30))
        .rejects.toThrow('no encontrado');
    });
  });

  describe('calculateStockMetrics', () => {
    it('should calculate comprehensive stock metrics', async () => {
      // Arrange
      const mockProduct = {
        id: testProductId,
        stock: 25,
        minStock: 10,
        maxStock: 50,
        costPrice: 100
      };

      const mockMovements = [
        {
          type: InventoryMoveType.OUT,
          quantity: 5,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
        },
        {
          type: InventoryMoveType.OUT,
          quantity: 3,
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
        },
        {
          type: InventoryMoveType.IN,
          quantity: 15,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        }
      ];

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      jest.spyOn(prisma.inventoryMove, 'findMany').mockResolvedValue(mockMovements as any);

      // Act
      const result = await productService.calculateStockMetrics(testProductId);

      // Assert
      expect(result.productId).toBe(testProductId);
      expect(result.currentStock).toBe(25);
      expect(result.minStock).toBe(10);
      expect(result.maxStock).toBe(50);
      expect(result.stockValue).toBe(2500); // 25 * 100
      expect(result.isLowStock).toBe(false);
      expect(result.isOverstock).toBe(false);
      expect(result.stockLevel).toBe('NORMAL');
      expect(result.totalMovements).toBe(3);
      expect(result.averageUsage).toBeGreaterThan(0);
    });

    it('should identify low stock condition', async () => {
      // Arrange
      const mockProduct = {
        id: testProductId,
        stock: 5, // Below minStock
        minStock: 10,
        maxStock: 50,
        costPrice: 100
      };

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      jest.spyOn(prisma.inventoryMove, 'findMany').mockResolvedValue([]);

      // Act
      const result = await productService.calculateStockMetrics(testProductId);

      // Assert
      expect(result.isLowStock).toBe(true);
      expect(result.stockLevel).toBe('LOW');
    });

    it('should identify critical stock condition', async () => {
      // Arrange
      const mockProduct = {
        id: testProductId,
        stock: 0,
        minStock: 10,
        maxStock: 50,
        costPrice: 100
      };

      jest.spyOn(prisma.product, 'findUnique').mockResolvedValue(mockProduct as any);
      jest.spyOn(prisma.inventoryMove, 'findMany').mockResolvedValue([]);

      // Act
      const result = await productService.calculateStockMetrics(testProductId);

      // Assert
      expect(result.stockLevel).toBe('CRITICAL');
      expect(result.currentStock).toBe(0);
    });
  });

  describe('checkStockAlerts', () => {
    it('should generate out of stock alert', async () => {
      // Arrange
      const mockMetrics = {
        productId: testProductId,
        currentStock: 0,
        minStock: 10,
        isLowStock: true,
        isOverstock: false,
        movements30Days: 5,
        averageUsage: 2,
        daysUntilStockout: 0
      };

      jest.spyOn(productService, 'calculateStockMetrics').mockResolvedValue(mockMetrics as any);

      // Act
      const alerts = await productService.checkStockAlerts(testProductId);

      // Assert
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('OUT_OF_STOCK');
      expect(alerts[0].priority).toBe('CRITICAL');
    });

    it('should generate low stock alert', async () => {
      // Arrange
      const mockMetrics = {
        productId: testProductId,
        currentStock: 5,
        minStock: 10,
        maxStock: 50,
        isLowStock: true,
        isOverstock: false,
        movements30Days: 5,
        averageUsage: 2,
        daysUntilStockout: 2
      };

      jest.spyOn(productService, 'calculateStockMetrics').mockResolvedValue(mockMetrics as any);

      // Act
      const alerts = await productService.checkStockAlerts(testProductId);

      // Assert
      expect(alerts).toHaveLength(2); // LOW_STOCK + HIGH_USAGE
      expect(alerts.some(a => a.type === 'LOW_STOCK')).toBe(true);
      expect(alerts.some(a => a.type === 'HIGH_USAGE')).toBe(true);
    });

    it('should generate no movement alert', async () => {
      // Arrange
      const mockMetrics = {
        productId: testProductId,
        currentStock: 20,
        minStock: 10,
        isLowStock: false,
        isOverstock: false,
        movements30Days: 0,
        averageUsage: 0,
        daysUntilStockout: -1
      };

      jest.spyOn(productService, 'calculateStockMetrics').mockResolvedValue(mockMetrics as any);

      // Act
      const alerts = await productService.checkStockAlerts(testProductId);

      // Assert
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('NO_MOVEMENT');
      expect(alerts[0].priority).toBe('LOW');
    });
  });

  describe('optimizeStockLevels', () => {
    it('should recommend optimal stock levels based on usage', async () => {
      // Arrange
      const mockMetrics = {
        averageUsage: 2.5, // 2.5 units per day
        productId: testProductId
      };

      jest.spyOn(productService, 'calculateStockMetrics').mockResolvedValue(mockMetrics as any);

      // Act
      const result = await productService.optimizeStockLevels(testProductId);

      // Assert
      expect(result.recommendedMinStock).toBeGreaterThan(0);
      expect(result.recommendedMaxStock).toBeGreaterThan(result.recommendedMinStock);
      expect(result.reasoning).toContain('uso promedio');
      expect(result.reasoning).toContain('2.5 unidades/día');
    });

    it('should handle zero usage products', async () => {
      // Arrange
      const mockMetrics = {
        averageUsage: 0,
        productId: testProductId
      };

      jest.spyOn(productService, 'calculateStockMetrics').mockResolvedValue(mockMetrics as any);

      // Act
      const result = await productService.optimizeStockLevels(testProductId);

      // Assert
      expect(result.recommendedMinStock).toBe(1); // Minimum of 1
      expect(result.recommendedMaxStock).toBeGreaterThan(0);
    });
  });
});
