const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('Creando datos de prueba...');

    // Verificar si existe un usuario
    let testUser = await prisma.user.findFirst();
    if (!testUser) {
      // Crear usuario de prueba
      testUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@test.com',
          password: '$2b$10$hashedpassword', // Password hasheado
          firstName: 'Admin',
          lastName: 'Test',
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('Usuario de prueba creado:', testUser.id);
    }

    // Primero, verificar si ya existe un cliente de prueba
    let testCustomer = await prisma.customer.findFirst({
      where: { documentNumber: '12345678' }
    });

    if (!testCustomer) {
      // Crear cliente de prueba
      testCustomer = await prisma.customer.create({
        data: {
          documentType: 'CI',
          documentNumber: '12345678',
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan.perez@email.com',
          phone: '04141234567',
          address: 'Calle Principal 123',
          city: 'Caracas',
          state: 'Distrito Capital',
          country: 'Venezuela',
          customerType: 'INDIVIDUAL',
          isActive: true
        }
      });
      console.log('Cliente de prueba creado:', testCustomer.id);
    }

    // Crear una venta de prueba
    const testSale = await prisma.sale.create({
      data: {
        saleNumber: 'VENTA-' + Date.now(),
        customerId: testCustomer.id,
        userId: testUser.id,
        subtotal: 1500.00,
        tax: 0.00,
        discount: 0.00,
        total: 1500.00,
        paymentMethod: 'CASH_VES',
        status: 'COMPLETED',
        notes: 'Venta de bicicleta de prueba'
      }
    });
    console.log('Venta de prueba creada:', testSale.id);

    // Crear o encontrar categorías
    let bikeCategory = await prisma.category.findFirst({
      where: { name: 'Bicicletas' }
    });

    if (!bikeCategory) {
      bikeCategory = await prisma.category.create({
        data: {
          name: 'Bicicletas',
          description: 'Categoría de bicicletas',
          isActive: true
        }
      });
    }

    let accessoriesCategory = await prisma.category.findFirst({
      where: { name: 'Accesorios' }
    });

    if (!accessoriesCategory) {
      accessoriesCategory = await prisma.category.create({
        data: {
          name: 'Accesorios',
          description: 'Categoría de accesorios',
          isActive: true
        }
      });
    }

    // Crear producto para la venta
    const testProduct = await prisma.product.create({
      data: {
        sku: 'BIC-MONT-XTR-' + Date.now(),
        name: 'Bicicleta Montaña XTR Pro',
        description: 'Bicicleta de montaña profesional',
        salePrice: 1500.00,
        costPrice: 1200.00,
        stock: 10,
        status: 'ACTIVE',
        category: {
          connect: { id: bikeCategory.id }
        }
      }
    });

    // Crear item de venta
    await prisma.saleItem.create({
      data: {
        saleId: testSale.id,
        productId: testProduct.id,
        quantity: 1,
        unitPrice: 1500.00,
        total: 1500.00
      }
    });

    // Crear apartado (Layaway)
    const testLayaway = await prisma.layaway.create({
      data: {
        customerId: testCustomer.id,
        saleId: testSale.id,
        amount: 1500.00,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días desde ahora
        status: 'ACTIVO',
        notes: 'Apartado de bicicleta de montaña - Primera cuota pendiente'
      }
    });
    console.log('Apartado creado:', testLayaway.id);

    // Crear algunos abonos (LayawayPayment)
    const payments = [
      {
        layawayId: testLayaway.id,
        amount: 500.00,
        method: 'CASH_VES',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 días atrás
        notes: 'Primer abono - Efectivo'
      },
      {
        layawayId: testLayaway.id,
        amount: 300.00,
        method: 'TRANSFER',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
        notes: 'Segundo abono - Transferencia bancaria'
      }
    ];

    for (const payment of payments) {
      await prisma.layawayPayment.create({
        data: payment
      });
    }

    console.log('Abonos creados exitosamente');

    // Crear otro apartado completado para mostrar diferentes estados
    const testSale2 = await prisma.sale.create({
      data: {
        saleNumber: 'VENTA2-' + Date.now(),
        customerId: testCustomer.id,
        userId: testUser.id,
        subtotal: 800.00,
        tax: 0.00,
        discount: 0.00,
        total: 800.00,
        paymentMethod: 'CASH_VES',
        status: 'COMPLETED',
        notes: 'Venta de casco de prueba'
      }
    });

    const testProduct2 = await prisma.product.create({
      data: {
        sku: 'CASCO-PRO-' + Date.now(),
        name: 'Casco Profesional Pro',
        description: 'Casco de ciclismo profesional',
        salePrice: 800.00,
        costPrice: 600.00,
        stock: 15,
        status: 'ACTIVE',
        category: {
          connect: { id: accessoriesCategory.id }
        }
      }
    });

    await prisma.saleItem.create({
      data: {
        saleId: testSale2.id,
        productId: testProduct2.id,
        quantity: 1,
        unitPrice: 800.00,
        total: 800.00
      }
    });

    const testLayaway2 = await prisma.layaway.create({
      data: {
        customerId: testCustomer.id,
        saleId: testSale2.id,
        amount: 800.00,
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 días atrás (vencido)
        status: 'COMPLETADO',
        notes: 'Apartado de casco - Completado'
      }
    });

    // Abonos para el segundo apartado
    await prisma.layawayPayment.create({
      data: {
        layawayId: testLayaway2.id,
        amount: 800.00,
        method: 'CARD',
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        notes: 'Pago completo - Tarjeta'
      }
    });

    console.log('Segundo apartado completado creado');

    console.log('\n✅ Datos de prueba creados exitosamente!');
    console.log(`Cliente ID: ${testCustomer.id}`);
    console.log(`Apartado 1 ID: ${testLayaway.id}`);
    console.log(`Apartado 2 ID: ${testLayaway2.id}`);

  } catch (error) {
    console.error('Error creando datos de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
