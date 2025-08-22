import request from 'supertest';
import { getEnvConfig } from './src/config/env';
import { expect } from '@jest/globals';

const BASE_URL = `http://localhost:${getEnvConfig().PORT || 3001}`;

describe('API de Productos', () => {
  it('debe rechazar producto inválido', async () => {
    try {
      const res = await request(BASE_URL)
        .post('/api/products')
        .send({ name: '' });
      expect(res.status).toBeGreaterThanOrEqual(400);
    } catch (error) {
      console.error('Error en test "debe rechazar producto inválido":', error);
      throw error;
    }
  });

  it('debe crear producto válido', async () => {
    try {
      // Obtener una categoría válida o crear una si no existe
      let catRes = await request(BASE_URL).get('/api/categories');
      let categorias = catRes.body;
      let categoriaValida = Array.isArray(categorias) && categorias.length > 0 ? categorias[0] : null;
      if (!categoriaValida) {
        // Crear una categoría real
        const nuevaCat = {
          name: 'Categoría Test Jest',
          description: 'Categoría creada por test'
        };
        const createCatRes = await request(BASE_URL)
          .post('/api/categories')
          .send(nuevaCat);
        console.log('Respuesta creación categoría:', createCatRes.status, createCatRes.body);
        if (![200,201].includes(createCatRes.status)) {
          throw new Error(`Error creando categoría: status ${createCatRes.status}, body: ${JSON.stringify(createCatRes.body)}`);
        }
        categoriaValida = createCatRes.body?.category || createCatRes.body;
        if (!categoriaValida || !categoriaValida.id) throw new Error('No se pudo crear una categoría para test');
      }

      const res = await request(BASE_URL)
        .post('/api/products')
        .field('name', 'Test Jest')
        .field('description', 'Producto test')
        .field('brand', 'TestBrand')
        .field('costPrice', '100')
        .field('salePrice', '150')
        .field('stock', '10')
        .field('minStock', '1')
        .field('categoryId', categoriaValida.id);
      console.log('Respuesta creación producto:', res.status, res.body);
      if (![200,201].includes(res.status)) {
        throw new Error(`Error creando producto: status ${res.status}, body: ${JSON.stringify(res.body)}`);
      }
    } catch (error) {
      console.error('Error en test "debe crear producto válido":', error);
      throw error;
    }
  });
});
