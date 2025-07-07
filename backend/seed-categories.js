// Script simple para crear categorías con códigos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCategories() {
  console.log('🌱 Creando categorías con códigos...');

  try {
    // Eliminar categorías existentes
    await prisma.category.deleteMany({});

    // Crear categorías principales con códigos
    const bicicletas = await prisma.category.create({
      data: {
        name: 'Bicicletas',
        description: 'Bicicletas de todo tipo',
        code: 'BIC',
        level: 0,
        path: 'Bicicletas',
        isActive: true
      }
    });

    const motocicletas = await prisma.category.create({
      data: {
        name: 'Motocicletas',
        description: 'Motocicletas y scooters',
        code: 'MOT',
        level: 0,
        path: 'Motocicletas',
        isActive: true
      }
    });

    const accesorios = await prisma.category.create({
      data: {
        name: 'Accesorios',
        description: 'Accesorios varios',
        code: 'ACC',
        level: 0,
        path: 'Accesorios',
        isActive: true
      }
    });

    const repuestos = await prisma.category.create({
      data: {
        name: 'Repuestos',
        description: 'Repuestos y partes',
        code: 'REP',
        level: 0,
        path: 'Repuestos',
        isActive: true
      }
    });

    // Crear subcategorías
    await prisma.category.createMany({
      data: [
        // Subcategorías de Bicicletas
        {
          name: 'Mountain Bike',
          description: 'Bicicletas para montaña',
          code: 'BIC',
          parentId: bicicletas.id,
          level: 1,
          path: 'Bicicletas/Mountain Bike',
          isActive: true
        },
        {
          name: 'Ruta',
          description: 'Bicicletas de carretera',
          code: 'BIC',
          parentId: bicicletas.id,
          level: 1,
          path: 'Bicicletas/Ruta',
          isActive: true
        },
        {
          name: 'BMX',
          description: 'Bicicletas BMX',
          code: 'BIC',
          parentId: bicicletas.id,
          level: 1,
          path: 'Bicicletas/BMX',
          isActive: true
        },
        // Subcategorías de Accesorios
        {
          name: 'Cascos',
          description: 'Cascos de protección',
          code: 'ACC',
          parentId: accesorios.id,
          level: 1,
          path: 'Accesorios/Cascos',
          isActive: true
        },
        {
          name: 'Luces',
          description: 'Iluminación y luces',
          code: 'ACC',
          parentId: accesorios.id,
          level: 1,
          path: 'Accesorios/Luces',
          isActive: true
        },
        // Subcategorías de Repuestos
        {
          name: 'Cadenas',
          description: 'Cadenas y transmisión',
          code: 'REP',
          parentId: repuestos.id,
          level: 1,
          path: 'Repuestos/Cadenas',
          isActive: true
        },
        {
          name: 'Frenos',
          description: 'Sistemas de frenos y pastillas',
          code: 'REP',
          parentId: repuestos.id,
          level: 1,
          path: 'Repuestos/Frenos',
          isActive: true
        }
      ]
    });

    console.log('✅ Categorías creadas exitosamente');
    console.log('📋 Categorías principales:');
    console.log('   - Bicicletas (BIC)');
    console.log('   - Motocicletas (MOT)');
    console.log('   - Accesorios (ACC)');
    console.log('   - Repuestos (REP)');

  } catch (error) {
    console.error('❌ Error creando categorías:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();