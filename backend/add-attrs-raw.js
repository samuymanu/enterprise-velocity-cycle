import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

async function addAttributes() {
  try {
    // Crear atributo punta diamante
    const attr1 = await prisma.$executeRaw`
      INSERT INTO "product_attribute_values" ("id", "productId", "attributeId", "value", "createdAt", "updatedAt")
      VALUES (${createId()}, ${'cme1tdls60008ug9y2ped98qr'}, ${'cme1t6s3d0000ug9y5zvcmt8t'}, ${'true'}, ${new Date()}, ${new Date()})
    `;
    
    // Crear atributo material
    const attr2 = await prisma.$executeRaw`
      INSERT INTO "product_attribute_values" ("id", "productId", "attributeId", "value", "createdAt", "updatedAt")
      VALUES (${createId()}, ${'cme1tdls60008ug9y2ped98qr'}, ${'cme1t9am10003ug9yy00mj3sc'}, ${'metal'}, ${new Date()}, ${new Date()})
    `;

    console.log('✅ Atributos agregados exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAttributes();
