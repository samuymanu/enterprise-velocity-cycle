import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getEnvConfig } from '../config/env';

const prisma = new PrismaClient();
const env = getEnvConfig();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // Crear usuario administrador por defecto
  const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
  
  const admin = await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: {},
    create: {
      email: env.ADMIN_EMAIL,
      username: 'admin',
      password: hashedPassword,
      firstName: env.ADMIN_FIRST_NAME,
      lastName: env.ADMIN_LAST_NAME,
      role: 'ADMIN'
    }
  });

  console.log('✅ Usuario administrador creado:', admin.email);

  // Crear categorías principales
  const bicicletasCategory = await prisma.category.create({
    data: {
      name: 'Bicicletas',
      description: 'Bicicletas de todo tipo',
      code: 'BIC',
      level: 0,
      path: 'Bicicletas',
    },
  });

  const motocicletasCategory = await prisma.category.create({
    data: {
      name: 'Motocicletas',
      description: 'Motocicletas y scooters',
      code: 'MOT',
      level: 0,
      path: 'Motocicletas',
    },
  });

  const repuestosCategory = await prisma.category.create({
    data: {
      name: 'Repuestos',
      description: 'Repuestos y partes',
      code: 'REP',
      level: 0,
      path: 'Repuestos',
    },
  });

  const accesoriosCategory = await prisma.category.create({
    data: {
      name: 'Accesorios',
      description: 'Accesorios varios',
      code: 'ACC',
      level: 0,
      path: 'Accesorios',
    },
  });

  const mainCategories = [bicicletasCategory, motocicletasCategory, repuestosCategory, accesoriosCategory];

  // Crear subcategorías para Bicicletas
  await Promise.all([
    prisma.category.create({
      data: {
        name: 'Mountain Bike',
        description: 'Bicicletas para montaña',
        code: 'MTB',
        parentId: bicicletasCategory.id,
        level: 1,
        path: 'Bicicletas/Mountain Bike',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Ruta',
        description: 'Bicicletas de carretera',
        code: 'RUT',
        parentId: bicicletasCategory.id,
        level: 1,
        path: 'Bicicletas/Ruta',
      },
    }),
    prisma.category.create({
      data: {
        name: 'BMX',
        description: 'Bicicletas BMX',
        code: 'BMX',
        parentId: bicicletasCategory.id,
        level: 1,
        path: 'Bicicletas/BMX',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Cauchos de Bicicleta',
        description: 'Llantas y cauchos para bicicleta',
        code: 'CAU',
        parentId: bicicletasCategory.id,
        level: 1,
        path: 'Bicicletas/Cauchos de Bicicleta',
      },
    }),
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
          code: 'FRE',
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
          code: 'CAD',
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
          code: 'ACS',
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
          code: 'LUC',
          parentId: accesoriosCategory.id,
          level: 1,
          path: 'Accesorios/Luces'
        }
      })
    ]);

  console.log('✅ Categorías jerárquicas creadas');

  // Crear marcas en la base de datos (si no existen)
  const brandNames = ['Trek', 'Honda', 'Bell', 'Specialized', 'Yamaha'];
  const brandRecords = await Promise.all(
    brandNames.map(name =>
      prisma.brand.upsert({
        where: { name },
        update: {},
        create: { name }
      })
    )
  );
  console.log('✅ Marcas creadas:', brandRecords.map(b => b.name).join(', '));

  // Obtener categorías para crear productos
  const allCategories = await prisma.category.findMany();
  const bicycleCategory = allCategories.find((c: { name: string }) => c.name === 'Bicicletas');
  const motorcycleCategory = allCategories.find((c: { name: string }) => c.name === 'Motocicletas');
  const mountainBikeCategory = allCategories.find((c: { name: string }) => c.name === 'Mountain Bike');
  const helmetCategory = allCategories.find((c: { name: string }) => c.name === 'Accesorios');
  const repuestosData = allCategories.find((c: { name: string }) => c.name === 'Repuestos');

  // Obtener objetos de marca desde la BD
  const trekBrand = brandRecords.find(b => b.name === 'Trek');
  const hondaBrand = brandRecords.find(b => b.name === 'Honda');
  const bellBrand = brandRecords.find(b => b.name === 'Bell');

  if (bicycleCategory && motorcycleCategory && helmetCategory && trekBrand && hondaBrand && bellBrand) {
    const products = await Promise.all([
      prisma.product.upsert({
        where: { sku: 'BIC-001' },
        update: {},
        create: {
          sku: 'BIC-001',
          name: 'Bicicleta Mountain Bike Pro',
          description: 'Bicicleta de montaña profesional Trek',
          categoryId: bicycleCategory.id,
          brandId: trekBrand.id,
          costPrice: 800.00,
          salePrice: 1250.00,
          stock: 15,
          minStock: 5,
          barcode: '123456789001'
        }
      }),
      prisma.product.upsert({
        where: { sku: 'MOT-001' },
        update: {},
        create: {
          sku: 'MOT-001',
          name: 'Moto Honda CB600F',
          description: 'Motocicleta Honda CB600F deportiva',
          categoryId: motorcycleCategory.id,
          brandId: hondaBrand.id,
          costPrice: 6500.00,
          salePrice: 8500.00,
          stock: 3,
          minStock: 2,
          barcode: '123456789002'
        }
      }),
      prisma.product.upsert({
        where: { sku: 'CAS-001' },
        update: {},
        create: {
          sku: 'CAS-001',
          name: 'Casco Integral Bell',
          description: 'Casco integral Bell con certificación DOT',
          categoryId: helmetCategory.id,
          brandId: bellBrand.id,
          costPrice: 60.00,
          salePrice: 89.99,
          stock: 2,
          minStock: 8,
          barcode: '123456789003'
        }
      }),
      // Agregar más productos con diferentes estados de stock
      prisma.product.upsert({
        where: { sku: 'ACC-001' },
        update: {},
        create: {
          sku: 'ACC-001',
          name: 'Luz LED Delantera',
          description: 'Luz LED alta potencia para bicicleta',
          categoryId: helmetCategory.id,
          brandId: bellBrand.id,
          costPrice: 25.00,
          salePrice: 39.99,
          stock: 3,
          minStock: 10,
          barcode: '123456789004'
        }
      }),
      prisma.product.upsert({
        where: { sku: 'REP-001' },
        update: {},
        create: {
          sku: 'REP-001',
          name: 'Cadena de Bicicleta 10V',
          description: 'Cadena para bicicleta 10 velocidades',
          categoryId: repuestosData?.id || helmetCategory.id,
          brandId: trekBrand.id,
          costPrice: 15.00,
          salePrice: 29.99,
          stock: 0,
          minStock: 5,
          barcode: '123456789005'
        }
      })
    ]);

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
      state: 'Distrito Capital'
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
