import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

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

  // Crear categorías por defecto
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Bicicletas' },
      update: {},
      create: { name: 'Bicicletas', description: 'Bicicletas de todo tipo' }
    }),
    prisma.category.upsert({
      where: { name: 'Motocicletas' },
      update: {},
      create: { name: 'Motocicletas', description: 'Motocicletas y scooters' }
    }),
    prisma.category.upsert({
      where: { name: 'Repuestos' },
      update: {},
      create: { name: 'Repuestos', description: 'Repuestos y partes' }
    }),
    prisma.category.upsert({
      where: { name: 'Accesorios' },
      update: {},
      create: { name: 'Accesorios', description: 'Accesorios varios' }
    }),
    prisma.category.upsert({
      where: { name: 'Cascos' },
      update: {},
      create: { name: 'Cascos', description: 'Cascos de protección' }
    })
  ]);

  console.log('✅ Categorías creadas:', categories.length);

  // Crear marcas por defecto
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { name: 'Trek' },
      update: {},
      create: { name: 'Trek' }
    }),
    prisma.brand.upsert({
      where: { name: 'Honda' },
      update: {},
      create: { name: 'Honda' }
    }),
    prisma.brand.upsert({
      where: { name: 'Bell' },
      update: {},
      create: { name: 'Bell' }
    }),
    prisma.brand.upsert({
      where: { name: 'Specialized' },
      update: {},
      create: { name: 'Specialized' }
    }),
    prisma.brand.upsert({
      where: { name: 'Yamaha' },
      update: {},
      create: { name: 'Yamaha' }
    })
  ]);

  console.log('✅ Marcas creadas:', brands.length);

  // Crear productos de ejemplo
  const bicycleCategory = categories.find(c => c.name === 'Bicicletas');
  const motorcycleCategory = categories.find(c => c.name === 'Motocicletas');
  const helmetCategory = categories.find(c => c.name === 'Cascos');
  
  const trekBrand = brands.find(b => b.name === 'Trek');
  const hondaBrand = brands.find(b => b.name === 'Honda');
  const bellBrand = brands.find(b => b.name === 'Bell');

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
