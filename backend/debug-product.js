import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugProduct() {
  try {
    // Buscar el producto por SKU
    const product = await prisma.product.findFirst({
      where: {
        sku: 'MOT-001'
      },
      include: {
        category: true,
        brand: true,
        attributeValues: {
          include: {
            attribute: true
          }
        }
      }
    });

    console.log('🔍 Producto encontrado:', JSON.stringify(product, null, 2));
    
    if (product && product.attributeValues) {
      console.log('\n📋 Valores de atributos:');
      product.attributeValues.forEach(av => {
        console.log(`- ${av.attribute.name}: ${av.value} (AttrID: ${av.attributeId})`);
      });
    }
    
    // Buscar todos los productos para comparar
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        stock: true,
        costPrice: true,
        salePrice: true
      }
    });
    
    console.log('\n📊 Todos los productos en BD:');
    allProducts.forEach(p => {
      console.log(`${p.sku}: ${p.name} - Stock: ${p.stock}, Precio: $${p.salePrice}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugProduct();
