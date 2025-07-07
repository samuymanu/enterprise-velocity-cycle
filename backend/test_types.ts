import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test para verificar que los tipos de Product funcionen correctamente
const testProduct = {
  sku: 'TEST-001',
  name: 'Test Product',
  description: 'Test Description',
  categoryId: 'test-category',
  brand: 'Test Brand',
  costPrice: 100.00,
  salePrice: 150.00,
  stock: 10,
  minStock: 5,
  barcode: 'test123'
};

// Esta función debería compilar sin errores si los tipos están correctos
async function testCreate() {
  // Solo definición para test de tipos, no ejecutar
  const product = await prisma.product.create({
    data: testProduct
  });
  return product;
}

console.log('Tipos verificados correctamente');
