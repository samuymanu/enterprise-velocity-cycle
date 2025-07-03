import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Crear usuario administrador
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bikeshop.com' },
    update: {},
    create: {
      email: 'admin@bikeshop.com',
      username: 'admin',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKY.bE6C2XJJBRgG', // admin123
      firstName: 'Admin',
      lastName: 'Sistema',
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('✅ Usuario administrador creado:', admin.email);

  // Crear categorías principales
  const bicicletas = await prisma.category.create({
    data: { 
      name: 'Bicicletas', 
      description: 'Bicicletas de todo tipo',
      level: 0,
      path: 'Bicicletas'
    }
  });

  const repuestos = await prisma.category.create({
    data: { 
      name: 'Repuestos', 
      description: 'Repuestos y componentes',
      level: 0,
      path: 'Repuestos'
    }
  });

  const accesorios = await prisma.category.create({
    data: { 
      name: 'Accesorios', 
      description: 'Accesorios de ciclismo',
      level: 0,
      path: 'Accesorios'
    }
  });

  // Crear subcategorías para Bicicletas
  const mountainBike = await prisma.category.create({
    data: {
      name: 'Mountain Bike',
      description: 'Bicicletas para montaña',
      parentId: bicicletas.id,
      level: 1,
      path: 'Bicicletas/Mountain Bike'
    }
  });

  const ruta = await prisma.category.create({
    data: {
      name: 'Ruta',
      description: 'Bicicletas de carretera',
      parentId: bicicletas.id,
      level: 1,
      path: 'Bicicletas/Ruta'
    }
  });

  console.log('✅ Categorías jerárquicas creadas');

  // Crear marcas
  const trek = await prisma.brand.upsert({
    where: { name: 'Trek' },
    update: {},
    create: { name: 'Trek' }
  });

  const specialized = await prisma.brand.upsert({
    where: { name: 'Specialized' },
    update: {},
    create: { name: 'Specialized' }
  });

  console.log('✅ Marcas creadas');

  // Crear productos de ejemplo
  const producto1 = await prisma.product.upsert({
    where: { sku: 'MTB-001' },
    update: {},
    create: {
      sku: 'MTB-001',
      name: 'Trek Mountain Bike X-Caliber',
      description: 'Mountain bike Trek para terrenos exigentes',
      salePrice: 1299.99,
      costPrice: 800.00,
      stock: 5,
      minStock: 2,
      categoryId: mountainBike.id,
      brandId: trek.id,
      status: 'ACTIVE',
      barcode: '1234567890001'
    }
  });

  const producto2 = await prisma.product.upsert({
    where: { sku: 'ROAD-001' },
    update: {},
    create: {
      sku: 'ROAD-001',
      name: 'Specialized Roubaix Elite',
      description: 'Bicicleta de ruta Specialized para competición',
      salePrice: 2199.99,
      costPrice: 1400.00,
      stock: 3,
      minStock: 1,
      categoryId: ruta.id,
      brandId: specialized.id,
      status: 'ACTIVE',
      barcode: '1234567890002'
    }
  });

  console.log('✅ Productos creados');

  // Crear clientes de ejemplo
  const cliente1 = await prisma.customer.upsert({
    where: { documentNumber: '12345678' },
    update: {},
    create: {
      documentNumber: '12345678',
      documentType: 'DNI',
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan.perez@email.com',
      phone: '+1234567890',
      address: 'Calle Principal 123',
      city: 'Ciudad Capital',
      isActive: true,
      customerType: 'INDIVIDUAL'
    }
  });

  console.log('✅ Cliente creado');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('📊 Datos creados:');
  console.log('   👤 1 Usuario administrador');
  console.log('   🏷️ 5 Categorías (3 principales + 2 subcategorías)');
  console.log('   🏭 2 Marcas'); 
  console.log('   📦 2 Productos');
  console.log('   👥 1 Cliente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
