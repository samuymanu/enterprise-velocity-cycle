const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateSale() {
  try {
    // Obtener un producto con stock disponible
    const product = await prisma.product.findFirst({
      where: {
        stock: { gt: 0 },
        status: 'ACTIVE'
      },
      select: { id: true, name: true, stock: true, salePrice: true }
    });

    if (!product) {
      console.log('❌ No hay productos con stock disponible');
      return;
    }

    console.log(`📦 Producto seleccionado: ${product.name} (Stock: ${product.stock})`);

    // Obtener un cliente
    const customer = await prisma.customer.findFirst({
      select: { id: true, firstName: true, lastName: true }
    });

    if (!customer) {
      console.log('❌ No hay clientes disponibles');
      return;
    }

    console.log(`👤 Cliente: ${customer.firstName} ${customer.lastName || ''}`);

    // Obtener un usuario
    const user = await prisma.user.findFirst({
      select: { id: true, firstName: true, lastName: true }
    });

    if (!user) {
      console.log('❌ No hay usuarios disponibles');
      return;
    }

    console.log(`👨‍💼 Usuario: ${user.firstName} ${user.lastName}`);

    // Crear una venta simulada
    const saleNumber = `V${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        customerId: customer.id,
        userId: user.id,
        subtotal: product.salePrice,
        tax: product.salePrice * 0.16, // 16% IVA
        total: product.salePrice * 1.16,
        paymentMethod: 'CASH_VES',
        status: 'COMPLETED',
        saleItems: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: product.salePrice,
            total: product.salePrice
          }
        }
      },
      select: {
        id: true,
        saleNumber: true,
        total: true,
        createdAt: true
      }
    });

    // Actualizar el stock del producto
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: { decrement: 1 } }
    });

    // Obtener el stock actualizado
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      select: { name: true, stock: true, updatedAt: true }
    });

    console.log(`✅ Venta creada: ${sale.saleNumber}`);
    console.log(`📊 Stock actualizado: ${updatedProduct.name} → ${updatedProduct.stock} unidades`);
    console.log(`🕒 Timestamp: ${updatedProduct.updatedAt}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

simulateSale();
