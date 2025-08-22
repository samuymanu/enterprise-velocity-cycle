const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDelete() {
  try {
    console.log('🔍 Productos antes de la eliminación:');
    const productsBefore = await prisma.product.findMany({
      select: { id: true, name: true, status: true }
    });
    console.log(productsBefore);

    // Simular eliminación del primer producto
    if (productsBefore.length > 0) {
      const productToDelete = productsBefore[0];
      console.log(`\n⚠️ Eliminando producto: ${productToDelete.name} (ID: ${productToDelete.id})`);
      
      const updatedProduct = await prisma.product.update({
        where: { id: productToDelete.id },
        data: { status: 'INACTIVE' }
      });
      
      console.log('✅ Producto marcado como INACTIVE:', updatedProduct);
      
      console.log('\n🔍 Productos después de la eliminación:');
      const productsAfter = await prisma.product.findMany({
        select: { id: true, name: true, status: true }
      });
      console.log(productsAfter);
      
      console.log('\n🟢 Solo productos ACTIVE:');
      const activeProducts = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, status: true }
      });
      console.log(activeProducts);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDelete();
