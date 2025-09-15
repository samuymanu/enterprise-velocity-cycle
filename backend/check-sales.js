const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSales() {
  try {
    console.log('🔍 Verificando ventas en la base de datos...');

    // Verificar todas las ventas
    const allSales = await prisma.sale.findMany({
      include: {
        customer: true,
        saleItems: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Total de ventas encontradas: ${allSales.length}`);

    if (allSales.length > 0) {
      console.log('\n📋 Últimas 5 ventas:');
      allSales.slice(0, 5).forEach((sale, index) => {
        console.log(`${index + 1}. ID: ${sale.id}`);
        console.log(`   Número: ${sale.saleNumber}`);
        console.log(`   Total: $${sale.total}`);
        console.log(`   Método de pago: ${sale.paymentMethod}`);
        console.log(`   Estado: ${sale.status}`);
        console.log(`   Cliente: ${sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : 'N/A'}`);
        console.log(`   Fecha: ${sale.createdAt}`);
        console.log(`   Items: ${sale.saleItems.length}`);
        console.log('---');
      });
    }

    // Verificar ventas de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        customer: true,
        saleItems: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n📅 Ventas de hoy: ${todaySales.length}`);

    if (todaySales.length > 0) {
      console.log('\n📋 Ventas de hoy detalladas:');
      todaySales.forEach((sale, index) => {
        console.log(`${index + 1}. ${sale.saleNumber} - $${sale.total} - ${sale.paymentMethod} - ${sale.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSales();
