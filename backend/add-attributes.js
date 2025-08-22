import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addAttributesToBujia() {
  try {
    // ID del producto Bujía
    const productId = 'cme1tdls60008ug9y2ped98qr';
    
    // IDs de los atributos que vimos en el log anterior
    const puntaDiamanteAttrId = 'cme1t6s3d0000ug9y5zvcmt8t';
    const materialAttrId = 'cme1t9am10003ug9yy00mj3sc';

    // Agregar atributo punta diamante (BOOLEAN = true)
    await prisma.attributeValue.create({
      data: {
        productId: productId,
        attributeId: puntaDiamanteAttrId,
        value: 'true'
      }
    });
    console.log('✅ Agregado: punta diamante = true');

    // Agregar atributo material bujía (LIST = metal)
    await prisma.attributeValue.create({
      data: {
        productId: productId,
        attributeId: materialAttrId,
        value: 'metal'
      }
    });
    console.log('✅ Agregado: Material bujía = metal');

    console.log('\n✅ Atributos agregados exitosamente al producto Bujía');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAttributesToBujia();
