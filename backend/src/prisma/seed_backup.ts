import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Forza actualización de tipos TypeScript
async function main() {
  console.log('🌱 Iniciando seed de datos (backup)...');

  // Crear usuario administrador por defecto
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bikeshop.com' },
    update: {},
    create: {
      email: 'admin@bikeshop.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'Administrador',
      lastName: 'Sistema',
      role: 'ADMIN'
    }
  });

  console.log('✅ Usuario administrador creado:', admin.email);

  // Crear categorías principales
  const bicicletasCategory = await prisma.category.upsert({
    where: { 
      id: 'bicicletas-main' // Usamos un ID específico
    },
    update: {},
    create: { 
      id: 'bicicletas-main',
      name: 'Bicicletas', 
      description: 'Bicicletas de todo tipo',
      level: 0,
      path: 'Bicicletas'
    }
  });

  const motocicletasCategory = await prisma.category.upsert({
    where: { 
      id: 'motocicletas-main'
    },
    update: {},
    create: { 
      id: 'motocicletas-main',
      name: 'Motocicletas', 
      description: 'Motocicletas y scooters',
      level: 0,
      path: 'Motocicletas'
    }
  });

  const repuestosCategory = await prisma.category.upsert({
    where: { 
      id: 'repuestos-main'
    },
    update: {},
    create: { 
      id: 'repuestos-main',
      name: 'Repuestos', 
      description: 'Repuestos y partes',
      level: 0,
      path: 'Repuestos'
    }
  });

  const accesoriosCategory = await prisma.category.upsert({
    where: { 
      id: 'accesorios-main'
    },
    update: {},
    create: { 
      id: 'accesorios-main',
      name: 'Accesorios', 
      description: 'Accesorios varios',
      level: 0,
      path: 'Accesorios'
    }
  });

  const mainCategories = [bicicletasCategory, motocicletasCategory, repuestosCategory, accesoriosCategory];

  // Crear subcategorías para Bicicletas
  await Promise.all([
      prisma.category.upsert({
        where: { id: 'mountain-bike-sub' },
        update: {},
        create: {
          id: 'mountain-bike-sub',
          name: 'Mountain Bike',
          description: 'Bicicletas para montaña',
          parentId: bicicletasCategory.id,
          level: 1,
          path: 'Bicicletas/Mountain Bike'
        }
      }),
      prisma.category.upsert({
        where: { id: 'ruta-sub' },
        update: {},
        create: {
          id: 'ruta-sub',
          name: 'Ruta',
          description: 'Bicicletas de carretera',
          parentId: bicicletasCategory.id,
          level: 1,
          path: 'Bicicletas/Ruta'
        }
      }),
      prisma.category.upsert({
        where: { id: 'bmx-sub' },
        update: {},
        create: {
          id: 'bmx-sub',
          name: 'BMX',
          description: 'Bicicletas BMX',
          parentId: bicicletasCategory.id,
          level: 1,
          path: 'Bicicletas/BMX'
        }
      }),
      prisma.category.upsert({
        where: { id: 'cauchos-bici-sub' },
        update: {},
        create: {
          id: 'cauchos-bici-sub',
          name: 'Cauchos de Bicicleta',
          description: 'Llantas y cauchos para bicicleta',
          parentId: bicicletasCategory.id,
          level: 1,
          path: 'Bicicletas/Cauchos de Bicicleta'
        }
      })
    ]);

  // Crear subcategorías para Repuestos
  await Promise.all([
      prisma.category.upsert({
        where: { id: 'frenos-sub' },
        update: {},
        create: {
          id: 'frenos-sub',
          name: 'Frenos',
          description: 'Sistemas de frenos y pastillas',
          parentId: repuestosCategory.id,
          level: 1,
          path: 'Repuestos/Frenos'
        }
      }),
      prisma.category.upsert({
        where: { id: 'cadenas-sub' },
        update: {},
        create: {
          id: 'cadenas-sub',
          name: 'Cadenas',
          description: 'Cadenas y transmisión',
          parentId: repuestosCategory.id,
          level: 1,
          path: 'Repuestos/Cadenas'
        }
      })
    ]);

  // Crear subcategorías para Accesorios
  await Promise.all([
      prisma.category.upsert({
        where: { id: 'cascos-sub' },
        update: {},
        create: {
          id: 'cascos-sub',
          name: 'Cascos',
          description: 'Cascos de protección',
          parentId: accesoriosCategory.id,
          level: 1,
          path: 'Accesorios/Cascos'
        }
      }),
      prisma.category.upsert({
        where: { id: 'luces-sub' },
        update: {},
        create: {
          id: 'luces-sub',
          name: 'Luces',
          description: 'Iluminación y luces',
          parentId: accesoriosCategory.id,
          level: 1,
          path: 'Accesorios/Luces'
        }
      })
    ]);

  console.log('✅ Categorías jerárquicas creadas');

  console.log('✅ Marcas configuradas como texto');

  // Obtener categorías para crear productos
  const allCategories = await prisma.category.findMany();
  const bicycleCategory = allCategories.find((c) => c.name === 'Bicicletas');
  const motorcycleCategory = allCategories.find((c) => c.name === 'Motocicletas');
  const mountainBikeCategory = allCategories.find((c) => c.name === 'Mountain Bike');
  const helmetCategory = allCategories.find((c) => c.name === 'Accesorios');
  const repuestosData = allCategories.find((c) => c.name === 'Repuestos');

  if (bicycleCategory && motorcycleCategory && helmetCategory) {
    // Datos de productos con tipos explícitos para evitar problemas de cache de TS
    const productData = [
      {
        sku: 'BIC-001',
        name: 'Bicicleta Mountain Bike Pro',
        description: 'Bicicleta de montaña profesional Trek',
        categoryId: bicycleCategory.id,
        brand: 'Trek',
        costPrice: 800,
        salePrice: 1250,
        stock: 15,
        minStock: 5,
        barcode: '123456789001'
      },
      {
        sku: 'MOT-001',
        name: 'Moto Honda CB600F',
        description: 'Motocicleta Honda CB600F deportiva',
        categoryId: motorcycleCategory.id,
        brand: 'Honda',
        costPrice: 6500,
        salePrice: 8500,
        stock: 3,
        minStock: 2,
        barcode: '123456789002'
      },
      {
        sku: 'CAS-001',
        name: 'Casco Integral Bell',
        description: 'Casco integral Bell con certificación DOT',
        categoryId: helmetCategory.id,
        brand: 'Bell',
        costPrice: 60,
        salePrice: 89.99,
        stock: 2,
        minStock: 8,
        barcode: '123456789003'
      },
      {
        sku: 'ACC-001',
        name: 'Luz LED Delantera',
        description: 'Luz LED alta potencia para bicicleta',
        categoryId: helmetCategory.id,
        brand: 'Bell',
        costPrice: 25,
        salePrice: 39.99,
        stock: 3,
        minStock: 10,
        barcode: '123456789004'
      },
      {
        sku: 'REP-001',
        name: 'Cadena de Bicicleta 10V',
        description: 'Cadena para bicicleta 10 velocidades',
        categoryId: repuestosData?.id || helmetCategory.id,
        brand: 'Trek',
        costPrice: 15,
        salePrice: 29.99,
        stock: 0,
        minStock: 5,
        barcode: '123456789005'
      }
    ];

    const products = await Promise.all(
      productData.map(data =>
        prisma.product.upsert({
          where: { sku: data.sku },
          update: {},
          create: data as any // Casting temporal para evitar problemas de cache de TS
        })
      )
    );

    console.log('✅ Productos de ejemplo creados:', products.length);
  }

  // Crear cliente de ejemplo
  const customer = await prisma.customer.upsert({
    where: { documentNumber: '12345678' },
    update: {},
    create: {
      documentType: 'CI',
      documentNumber: '12345678',
      firstName: 'Juan',
      lastName: 'Pérez',
      customerType: 'INDIVIDUAL',
      email: 'juan.perez@email.com',
      phone: '+58 412-1234567',
      address: 'Av. Principal #123',
      city: 'Caracas',
      state: 'Distrito Capital',
      creditLimit: 1000.00
    }
  });

  console.log('✅ Cliente de ejemplo creado:', customer.firstName);

  // Crear configuraciones del sistema
  const configs = await Promise.all([
    prisma.systemConfig.upsert({
      where: { key: 'company_name' },
      update: {},
      create: {
        key: 'company_name',
        value: 'BikeShop ERP Enterprise',
        description: 'Nombre de la empresa'
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'tax_rate' },
      update: {},
      create: {
        key: 'tax_rate',
        value: '16',
        description: 'Tasa de IVA en porcentaje'
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'currency' },
      update: {},
      create: {
        key: 'currency',
        value: 'USD',
        description: 'Moneda principal del sistema'
      }
    })
  ]);

  console.log('✅ Configuraciones del sistema creadas:', configs.length);

  console.log('🎉 Seed completado exitosamente!');
  console.log('👤 Usuario admin: admin@bikeshop.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
