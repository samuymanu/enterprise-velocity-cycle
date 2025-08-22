import { CreateMovementParams } from './inventoryMovementService';
import { InventoryMoveType } from '@prisma/client';

// Mock del logger
jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock completo de Prisma Client
const mockPrisma = {
  product: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  user: {
    findUnique: jest.fn()
  },
  inventoryMove: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    findFirst: jest.fn()
  },
  $transaction: jest.fn()
};

// Mock de @prisma/client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
  InventoryMoveType: {
    IN: 'IN',
    OUT: 'OUT',
    ADJUSTMENT: 'ADJUSTMENT',
    TRANSFER: 'TRANSFER'
  }
}));

// Importar el servicio después de los mocks
import { inventoryMovementService } from './inventoryMovementService';

describe('InventoryMovementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('🎯 Happy Path Scenarios', () => {
    
    test('1. Should create IN movement successfully', async () => {
      // Arrange
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        sku: 'SKU-001',
        stock: 10
      };

      const mockUser = {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe'
      };

      const mockMovement = {
        id: 'movement-1',
        productId: 'product-1',
        type: 'IN' as InventoryMoveType,
        quantity: 5,
        reason: 'Stock replenishment',
        userId: 'user-1',
        createdAt: new Date(),
        product: mockProduct,
        user: mockUser
      };

      const params: CreateMovementParams = {
        productId: 'product-1',
        type: 'IN',
        quantity: 5,
        reason: 'Stock replenishment',
        userId: 'user-1'
      };

      // Mock Prisma calls
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockResolvedValue(mockMovement);

      // Act
      const result = await inventoryMovementService.createMovement(params);

      // Assert
      expect(result).toEqual(mockMovement);
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        select: { id: true, name: true, sku: true, stock: true }
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true, firstName: true, lastName: true, username: true }
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    test('2. Should create OUT movement successfully', async () => {
      // Arrange
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        sku: 'SKU-001',
        stock: 20
      };

      const mockUser = {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe'
      };

      const mockMovement = {
        id: 'movement-2',
        productId: 'product-1',
        type: 'OUT' as InventoryMoveType,
        quantity: 8,
        reason: 'Sale',
        userId: 'user-1',
        createdAt: new Date(),
        product: mockProduct,
        user: mockUser
      };

      const params: CreateMovementParams = {
        productId: 'product-1',
        type: 'OUT',
        quantity: 8,
        reason: 'Sale',
        userId: 'user-1'
      };

      // Mock Prisma calls
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockResolvedValue(mockMovement);

      // Act
      const result = await inventoryMovementService.createMovement(params);

      // Assert
      expect(result).toEqual(mockMovement);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    test('3. Should create ADJUSTMENT movement successfully', async () => {
      // Arrange
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        sku: 'SKU-001',
        stock: 15
      };

      const mockUser = {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe'
      };

      const mockMovement = {
        id: 'movement-3',
        productId: 'product-1',
        type: 'ADJUSTMENT' as InventoryMoveType,
        quantity: 3,
        reason: 'Inventory correction',
        userId: 'user-1',
        createdAt: new Date(),
        product: mockProduct,
        user: mockUser
      };

      const params: CreateMovementParams = {
        productId: 'product-1',
        type: 'ADJUSTMENT',
        quantity: 3,
        reason: 'Inventory correction',
        userId: 'user-1'
      };

      // Mock Prisma calls
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockResolvedValue(mockMovement);

      // Act
      const result = await inventoryMovementService.createMovement(params);

      // Assert
      expect(result).toEqual(mockMovement);
    });

    test('4. Should get movements with filters successfully', async () => {
      // Arrange
      const mockMovements = [
        {
          id: 'movement-1',
          productId: 'product-1',
          type: 'IN' as InventoryMoveType,
          quantity: 5,
          reason: 'Stock replenishment',
          userId: 'user-1',
          createdAt: new Date(),
          product: { id: 'product-1', name: 'Test Product', sku: 'SKU-001', stock: 15 },
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe', username: 'johndoe' }
        }
      ];

      const mockResponse = {
        movements: mockMovements,
        totalCount: 1,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false,
        hasPrevPage: false
      };

      // Mock Prisma calls
      mockPrisma.inventoryMove.findMany.mockResolvedValue(mockMovements);
      mockPrisma.inventoryMove.count.mockResolvedValue(1);

      // Act
      const result = await inventoryMovementService.getMovements({
        productId: 'product-1',
        page: 1,
        limit: 10
      });

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockPrisma.inventoryMove.findMany).toHaveBeenCalledWith({
        where: { productId: 'product-1' },
        include: {
          product: {
            select: { id: true, name: true, sku: true, stock: true }
          },
          user: {
            select: { id: true, firstName: true, lastName: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10
      });
    });

    test('5. Should get movement by ID successfully', async () => {
      // Arrange
      const mockMovement = {
        id: 'movement-1',
        productId: 'product-1',
        type: 'IN' as InventoryMoveType,
        quantity: 5,
        reason: 'Stock replenishment',
        userId: 'user-1',
        createdAt: new Date(),
        product: { id: 'product-1', name: 'Test Product', sku: 'SKU-001', stock: 15 },
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', username: 'johndoe' }
      };

      // Mock Prisma call
      mockPrisma.inventoryMove.findUnique.mockResolvedValue(mockMovement);

      // Act
      const result = await inventoryMovementService.getMovementById('movement-1');

      // Assert
      expect(result).toEqual(mockMovement);
      expect(mockPrisma.inventoryMove.findUnique).toHaveBeenCalledWith({
        where: { id: 'movement-1' },
        include: {
          product: {
            select: { id: true, name: true, sku: true, stock: true }
          },
          user: {
            select: { id: true, firstName: true, lastName: true, username: true }
          }
        }
      });
    });
  });

  describe('❌ Error Scenarios', () => {
    
    test('1. Should throw error when product not found', async () => {
      // Arrange
      const params: CreateMovementParams = {
        productId: 'non-existent-product',
        type: 'IN',
        quantity: 5,
        reason: 'Test',
        userId: 'user-1'
      };

      // Mock Prisma call
      mockPrisma.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(inventoryMovementService.createMovement(params))
        .rejects
        .toThrow('Producto con ID non-existent-product no encontrado');
    });

    test('2. Should throw error when user not found', async () => {
      // Arrange
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        sku: 'SKU-001',
        stock: 10
      };

      const params: CreateMovementParams = {
        productId: 'product-1',
        type: 'IN',
        quantity: 5,
        reason: 'Test',
        userId: 'non-existent-user'
      };

      // Mock Prisma calls
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(inventoryMovementService.createMovement(params))
        .rejects
        .toThrow('Usuario con ID non-existent-user no encontrado');
    });

    test('3. Should throw error when insufficient stock for OUT movement', async () => {
      // Arrange
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        sku: 'SKU-001',
        stock: 2 // Stock insuficiente
      };

      const mockUser = {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe'
      };

      const params: CreateMovementParams = {
        productId: 'product-1',
        type: 'OUT',
        quantity: 5, // Mayor al stock disponible
        reason: 'Sale',
        userId: 'user-1'
      };

      // Mock Prisma calls
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(inventoryMovementService.createMovement(params))
        .rejects
        .toThrow('Stock insuficiente. Stock actual: 2, Cantidad solicitada: 5');
    });
  });

  describe('🔄 Edge Cases', () => {
    
    test('1. Should throw error for zero quantity', async () => {
      // Arrange
      const params: CreateMovementParams = {
        productId: 'product-1',
        type: 'IN',
        quantity: 0, // Cantidad inválida
        reason: 'Test',
        userId: 'user-1'
      };

      // Act & Assert
      await expect(inventoryMovementService.createMovement(params))
        .rejects
        .toThrow('La cantidad debe ser mayor a 0');
    });

    test('2. Should throw error for negative quantity', async () => {
      // Arrange
      const params: CreateMovementParams = {
        productId: 'product-1',
        type: 'IN',
        quantity: -5, // Cantidad negativa
        reason: 'Test',
        userId: 'user-1'
      };

      // Act & Assert
      await expect(inventoryMovementService.createMovement(params))
        .rejects
        .toThrow('La cantidad debe ser mayor a 0');
    });
  });

  describe('⚡ Performance Tests', () => {
    
    test('1. Should complete createMovement within acceptable time', async () => {
      // Arrange
      const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        sku: 'SKU-001',
        stock: 10
      };

      const mockUser = {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe'
      };

      const mockMovement = {
        id: 'movement-1',
        productId: 'product-1',
        type: 'IN' as InventoryMoveType,
        quantity: 5,
        reason: 'Performance test',
        userId: 'user-1',
        createdAt: new Date(),
        product: mockProduct,
        user: mockUser
      };

      const params: CreateMovementParams = {
        productId: 'product-1',
        type: 'IN',
        quantity: 5,
        reason: 'Performance test',
        userId: 'user-1'
      };

      // Mock Prisma calls
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockResolvedValue(mockMovement);

      // Act
      const startTime = Date.now();
      await inventoryMovementService.createMovement(params);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert - Debe completarse en menos de 100ms (en mocks será mucho más rápido)
      expect(duration).toBeLessThan(100);
    });

    test('2. Should handle multiple movements efficiently', async () => {
      // Arrange
      const mockMovements = Array.from({ length: 50 }, (_, i) => ({
        id: `movement-${i}`,
        productId: 'product-1',
        type: 'IN' as InventoryMoveType,
        quantity: 5,
        reason: `Movement ${i}`,
        userId: 'user-1',
        createdAt: new Date(),
        product: { id: 'product-1', name: 'Test Product', sku: 'SKU-001', stock: 15 },
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', username: 'johndoe' }
      }));

      // Mock Prisma calls
      mockPrisma.inventoryMove.findMany.mockResolvedValue(mockMovements);
      mockPrisma.inventoryMove.count.mockResolvedValue(50);

      // Act
      const startTime = Date.now();
      const result = await inventoryMovementService.getMovements({ limit: 50 });
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(result.movements).toHaveLength(50);
      expect(duration).toBeLessThan(50); // Debe ser muy rápido con mocks
    });
  });

  describe('📊 Movement Stats', () => {
    
    test('Should get movement statistics successfully', async () => {
      // Arrange
      const mockStatsData = [
        { type: 'IN' as InventoryMoveType, _count: { type: 10 } },
        { type: 'OUT' as InventoryMoveType, _count: { type: 5 } },
        { type: 'ADJUSTMENT' as InventoryMoveType, _count: { type: 2 } }
      ];

      const mockLastMovement = { createdAt: new Date() };

      // Mock Prisma calls
      mockPrisma.inventoryMove.count.mockResolvedValue(17);
      mockPrisma.inventoryMove.groupBy.mockResolvedValue(mockStatsData);
      mockPrisma.inventoryMove.findFirst.mockResolvedValue(mockLastMovement);

      // Act
      const result = await inventoryMovementService.getMovementStats('product-1');

      // Assert
      expect(result.totalMovements).toBe(17);
      expect(result.movementsByType.IN).toBe(10);
      expect(result.movementsByType.OUT).toBe(5);
      expect(result.movementsByType.ADJUSTMENT).toBe(2);
      expect(result.movementsByType.TRANSFER).toBe(0);
      expect(result.lastMovement).toEqual(mockLastMovement.createdAt);
    });
  });
});
