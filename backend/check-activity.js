const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentActivity() {
  try {
    // Ver productos más recientes
    const products = await prisma.product.findMany({
      take: 3,
      select: { id: true, name: true, stock: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    });

    console.log('=== PRODUCTOS MÁS RECIENTES ===');
    products.forEach(p => console.log(`${p.name}: ${p.stock} unidades (${p.updatedAt})`));

    // Ver ventas recientes
    const sales = await prisma.sale.findMany({
      take: 3,
      select: { 
        id: true, 
        saleNumber: true, 
        total: true, 
        createdAt: true,
        saleItems: {
          select: {
            quantity: true,
            product: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n=== VENTAS MÁS RECIENTES ===');
    sales.forEach(s => {
      console.log(`Venta ${s.saleNumber}: $${s.total} (${s.createdAt})`);
      s.saleItems.forEach(item => 
        console.log(`  - ${item.product.name}: ${item.quantity} unidades`)
      );
    });    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRecentActivity();
