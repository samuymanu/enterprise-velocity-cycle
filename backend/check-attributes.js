const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAttributes() {
  try {
    console.log('🔍 Verificando atributos en la base de datos:');
    
    const attributes = await prisma.attribute.findMany({
      include: {
        categoryAttributes: {
          include: {
            category: {
              select: { id: true, name: true }
            }
          }
        },
        _count: {
          select: { productValues: true }
        }
      }
    });
    
    console.log(`\n📋 Total de atributos: ${attributes.length}`);
    
    if (attributes.length > 0) {
      console.log('\n📝 Lista de atributos:');
      attributes.forEach((attr, index) => {
        console.log(`${index + 1}. ${attr.name} (${attr.type})`);
        console.log(`   - ID: ${attr.id}`);
        console.log(`   - Activo: ${attr.isActive}`);
        console.log(`   - Opciones: ${JSON.stringify(attr.options)}`);
        console.log(`   - Categorías: ${attr.categoryAttributes.map(ca => ca.category.name).join(', ')}`);
        console.log(`   - Productos usando este atributo: ${attr._count.productValues}`);
        console.log('');
      });
    } else {
      console.log('❌ No se encontraron atributos en la base de datos');
    }
    
  } catch (error) {
    console.error('❌ Error verificando atributos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttributes();
