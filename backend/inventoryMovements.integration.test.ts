import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { getEnvConfig } from './src/config/env';
import { generateTestJWT } from './test-helpers/jwt';

const prisma = new PrismaClient();
const BASE_URL = `http://localhost:${getEnvConfig().PORT || 3001}`;

// JWT token válido para tests
let TEST_JWT: string;

describe('Inventory Movements Integration Tests', () => {
  let testProductId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Crear un producto de prueba
    try {
      const product = await prisma.product.create({
        data: {
          name: 'Test Product for Movements',
          sku: `TEST-MOVEMENT-${Date.now()}`,
          salePrice: 100.00,
          costPrice: 50.00,
          stock: 10,
          minStock: 2,
          description: 'Product for integration testing',
          status: 'ACTIVE',
          categoryId: null
        }
      });
      testProductId = product.id;
      console.log('Created test product:', testProductId);

      // Crear un usuario de prueba si no existe
      const existingUser = await prisma.user.findFirst({
        where: { email: 'test@test.com' }
      });

      if (!existingUser) {
        const user = await prisma.user.create({
          data: {
            email: 'test@test.com',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            role: 'ADMIN',
            password: 'hashedpassword',
            isActive: true
          }
        });
        testUserId = user.id;
      } else {
        testUserId = existingUser.id;
      }
      console.log('Using test user:', testUserId);

      // Generar JWT válido para el usuario que existe
      TEST_JWT = generateTestJWT(testUserId, 'test@test.com', 'ADMIN');

    } catch (error) {
      console.error('Setup error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    try {
      await prisma.inventoryMove.deleteMany({
        where: { productId: testProductId }
      });
      await prisma.product.delete({
        where: { id: testProductId }
      });
      console.log('Cleaned up test data');
    } catch (error) {
      console.error('Cleanup error:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('POST /api/inventory-movements', () => {
    it('should create an inventory movement successfully', async () => {
      const movementData = {
        productId: testProductId,
        type: 'IN',
        quantity: 5,
        reason: 'Restock for integration test',
        notes: 'Created during integration testing'
      };

      const response = await request(BASE_URL)
        .post('/api/inventory-movements')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .send(movementData);

      console.log('Create movement response:', response.status, response.body);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('IN');
      expect(response.body.data.quantity).toBe(5);
      expect(response.body.data.productId).toBe(testProductId);

      // Verificar que el stock del producto se actualizó
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProductId }
      });
      expect(updatedProduct?.stock).toBe(15); // 10 inicial + 5 de movimiento
    });

    it('should fail to create movement without authentication', async () => {
      const movementData = {
        productId: testProductId,
        type: 'OUT',
        quantity: 2,
        reason: 'Test without auth'
      };

      const response = await request(BASE_URL)
        .post('/api/inventory-movements')
        .send(movementData);

      expect(response.status).toBe(401);
    });

    it('should fail to create movement with invalid data', async () => {
      const invalidData = {
        productId: 'invalid-uuid',
        type: 'INVALID_TYPE',
        quantity: -1,
        reason: ''
      };

      const response = await request(BASE_URL)
        .post('/api/inventory-movements')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should create OUT movement and update stock correctly', async () => {
      const movementData = {
        productId: testProductId,
        type: 'OUT',
        quantity: 3,
        reason: 'Sale integration test',
        notes: 'Testing stock reduction'
      };

      const response = await request(BASE_URL)
        .post('/api/inventory-movements')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .send(movementData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('OUT');

      // Verificar que el stock se redujo correctamente
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProductId }
      });
      expect(updatedProduct?.stock).toBe(12); // 15 anterior - 3 de este movimiento
    });

    it('should create ADJUSTMENT movement', async () => {
      const movementData = {
        productId: testProductId,
        type: 'ADJUSTMENT',
        quantity: -2,
        reason: 'Inventory adjustment',
        notes: 'Correcting discrepancy'
      };

      const response = await request(BASE_URL)
        .post('/api/inventory-movements')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .send(movementData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('ADJUSTMENT');

      // Verificar ajuste de stock
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProductId }
      });
      expect(updatedProduct?.stock).toBe(10); // 12 anterior - 2 de ajuste
    });
  });

  describe('GET /api/inventory-movements', () => {
    it('should get all inventory movements with pagination', async () => {
      const response = await request(BASE_URL)
        .get('/api/inventory-movements')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('movements');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('currentPage');
      expect(Array.isArray(response.body.data.movements)).toBe(true);
    });

    it('should filter movements by product', async () => {
      const response = await request(BASE_URL)
        .get('/api/inventory-movements')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .query({ productId: testProductId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Todos los movimientos deben ser del producto de prueba
      response.body.data.movements.forEach((movement: any) => {
        expect(movement.productId).toBe(testProductId);
      });
    });

    it('should filter movements by type', async () => {
      const response = await request(BASE_URL)
        .get('/api/inventory-movements')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .query({ type: 'IN' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Todos los movimientos deben ser de tipo IN
      response.body.data.movements.forEach((movement: any) => {
        expect(movement.type).toBe('IN');
      });
    });

    it('should fail to get movements without authentication', async () => {
      const response = await request(BASE_URL)
        .get('/api/inventory-movements');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/inventory-movements/product/:productId', () => {
    it('should get movements for specific product', async () => {
      const response = await request(BASE_URL)
        .get(`/api/inventory-movements/product/${testProductId}`)
        .set('Authorization', `Bearer ${TEST_JWT}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verificar que todos los movimientos son del producto correcto
      response.body.data.forEach((movement: any) => {
        expect(movement.productId).toBe(testProductId);
      });
    });

    it('should return empty array for product with no movements', async () => {
      // Crear un producto temporal sin movimientos
      const tempProduct = await prisma.product.create({
        data: {
          name: 'Temp Product No Movements',
          sku: `TEMP-NO-MOVES-${Date.now()}`,
          salePrice: 50.00,
          costPrice: 25.00,
          stock: 5,
          minStock: 1,
          description: 'Temporary product',
          status: 'ACTIVE',
          categoryId: null
        }
      });

      const response = await request(BASE_URL)
        .get(`/api/inventory-movements/product/${tempProduct.id}`)
        .set('Authorization', `Bearer ${TEST_JWT}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);

      // Limpiar producto temporal
      await prisma.product.delete({ where: { id: tempProduct.id } });
    });
  });

  describe('GET /api/inventory-movements/stats/:productId', () => {
    it('should get movement statistics for product', async () => {
      const response = await request(BASE_URL)
        .get(`/api/inventory-movements/stats/${testProductId}`)
        .set('Authorization', `Bearer ${TEST_JWT}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalIn');
      expect(response.body.data).toHaveProperty('totalOut');
      expect(response.body.data).toHaveProperty('totalAdjustments');
      expect(response.body.data).toHaveProperty('netChange');
      expect(response.body.data).toHaveProperty('movementCount');
      
      // Verificar tipos de datos
      expect(typeof response.body.data.totalIn).toBe('number');
      expect(typeof response.body.data.totalOut).toBe('number');
      expect(typeof response.body.data.totalAdjustments).toBe('number');
      expect(typeof response.body.data.netChange).toBe('number');
      expect(typeof response.body.data.movementCount).toBe('number');
    });
  });

  describe('End-to-End Workflow Test', () => {
    it('should complete a full inventory movement workflow', async () => {
      // 1. Obtener stock inicial
      const initialProduct = await prisma.product.findUnique({
        where: { id: testProductId }
      });
      const initialStock = initialProduct?.stock || 0;

      // 2. Crear movimiento de entrada
      const inMovement = await request(BASE_URL)
        .post('/api/inventory-movements')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .send({
          productId: testProductId,
          type: 'IN',
          quantity: 20,
          reason: 'E2E Test Restock'
        });

      expect(inMovement.status).toBe(201);

      // 3. Verificar stock actualizado
      const afterInProduct = await prisma.product.findUnique({
        where: { id: testProductId }
      });
      expect(afterInProduct?.stock).toBe(initialStock + 20);

      // 4. Crear movimiento de salida
      const outMovement = await request(BASE_URL)
        .post('/api/inventory-movements')
        .set('Authorization', `Bearer ${TEST_JWT}`)
        .send({
          productId: testProductId,
          type: 'OUT',
          quantity: 15,
          reason: 'E2E Test Sale'
        });

      expect(outMovement.status).toBe(201);

      // 5. Verificar stock final
      const finalProduct = await prisma.product.findUnique({
        where: { id: testProductId }
      });
      expect(finalProduct?.stock).toBe(initialStock + 20 - 15);

      // 6. Verificar estadísticas
      const stats = await request(BASE_URL)
        .get(`/api/inventory-movements/stats/${testProductId}`)
        .set('Authorization', `Bearer ${TEST_JWT}`);

      expect(stats.status).toBe(200);
      expect(stats.body.data.movementCount).toBeGreaterThanOrEqual(2);

      // 7. Verificar historial
      const history = await request(BASE_URL)
        .get(`/api/inventory-movements/product/${testProductId}`)
        .set('Authorization', `Bearer ${TEST_JWT}`);

      expect(history.status).toBe(200);
      expect(history.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });
});
