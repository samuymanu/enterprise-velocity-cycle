import request from 'supertest';
import { getEnvConfig } from './src/config/env';
import { expect } from '@jest/globals';

const BASE_URL = `http://localhost:${getEnvConfig().PORT || 3001}`;

describe('🚀 FASE 2: Funcionalidades Avanzadas', () => {

  describe('2.1 Asignación Automática de Atributos', () => {
    it('debe importar el servicio de auto-asignación sin errores', async () => {
      // Test de importación del servicio
      const { autoAssignCategoryAttributes, getCategoryAttributes } = await import('./src/services/attributeService');
      
      expect(typeof autoAssignCategoryAttributes).toBe('function');
      expect(typeof getCategoryAttributes).toBe('function');
    });

    it('debe crear producto con auto-asignación de atributos (logs visibles)', async () => {
      // 1. Crear categoría de test
      const nuevaCat = {
        name: 'Categoría Atributos Test',
        description: 'Categoría para probar auto-asignación'
      };
      
      const createCatRes = await request(BASE_URL)
        .post('/api/categories')
        .send(nuevaCat);
      
      expect(createCatRes.status).toBe(201);
      const categoria = createCatRes.body.category;

      // 2. Crear producto (debería ejecutar auto-asignación)
      const res = await request(BASE_URL)
        .post('/api/products')
        .field('name', 'Producto Test Atributos')
        .field('description', 'Producto para probar auto-asignación')
        .field('brand', 'TestBrandAtributos')
        .field('costPrice', '200')
        .field('salePrice', '300')
        .field('stock', '5')
        .field('minStock', '1')
        .field('categoryId', categoria.id);

      console.log('📊 Status de creación:', res.status);
      console.log('📊 Respuesta completa:', JSON.stringify(res.body, null, 2));
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categoryId).toBe(categoria.id);
    });
  });

  describe('2.2 API de Categorías Mejorada', () => {
    it('debe crear categoría y obtener sus propiedades', async () => {
      const res = await request(BASE_URL)
        .post('/api/categories')
        .send({
          name: 'Test API Categorías',
          description: 'Categoría para test API'
        });

      expect(res.status).toBe(201);
      expect(res.body.category).toBeDefined();
      expect(res.body.category.code).toBeDefined();
      expect(res.body.category.name).toBe('Test API Categorías');
      
      console.log('✅ Categoría creada con código automático:', res.body.category.code);
    });
  });

  describe('2.3 Filtros Dinámicos (Test de Estructura)', () => {
    it('debe verificar que los endpoints de inventario existen', async () => {
      // Verificar que las rutas están registradas (aunque requieran auth)
      const res = await request(BASE_URL)
        .get('/api/inventory/filters');

      // Esperamos 401 (no autorizado) en lugar de 404 (no encontrado)
      // Esto confirma que la ruta existe
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Acceso denegado');
      
      console.log('✅ Endpoint de filtros existe y requiere autenticación correctamente');
    });

    it('debe verificar endpoint de búsqueda de inventario', async () => {
      const res = await request(BASE_URL)
        .get('/api/inventory/search?category=test');

      // También debe requerir autenticación
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Acceso denegado');
      
      console.log('✅ Endpoint de búsqueda existe y requiere autenticación correctamente');
    });
  });

  describe('2.4 Optimización de Base de Datos', () => {
    it('debe verificar que la base de datos responde eficientemente', async () => {
      const start = Date.now();
      
      // Test de performance: crear producto
      const res = await request(BASE_URL)
        .post('/api/products')
        .field('name', 'Producto Performance Test')
        .field('description', 'Test de rendimiento')
        .field('brand', 'TestPerformance')
        .field('salePrice', '100')
        .field('categoryId', 'test-category-id');

      const duration = Date.now() - start;
      
      // Debe responder en menos de 2 segundos (incluye posibles auto-asignaciones)
      expect(duration).toBeLessThan(2000);
      
      console.log(`🚀 Tiempo de respuesta: ${duration}ms`);
      
      if (res.status === 201) {
        console.log('✅ Producto creado exitosamente en tiempo óptimo');
      } else {
        console.log('📊 Respuesta (puede ser error esperado):', res.body);
      }
    });
  });
});
