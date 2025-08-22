import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBujiaProduct() {
  try {
    // Buscar el producto Bujía
    const product = await prisma.product.findFirst({
      where: { sku: 'MOT-001' }
    });

    if (!product) {
      console.log('❌ Producto Bujía no encontrado');
      return;
    }

    console.log('🔍 Producto encontrado antes de actualizar:', {
      id: product.id,
      name: product.name,
      stock: product.stock,
      salePrice: product.salePrice
    });

    // Actualizar con valores correctos
    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: {
        stock: 5, // El stock que debería tener
        salePrice: 5, // Confirmar el precio
        // Agregar cualquier otro campo que necesite corrección
      }
    });

    console.log('✅ Producto actualizado:', {
      id: updatedProduct.id,
      name: updatedProduct.name,
      stock: updatedProduct.stock,
      salePrice: updatedProduct.salePrice
    });

    // Ahora vamos a agregar los atributos que faltaban
    // Primero, buscar los atributos de la categoría Motocicletas
    const category = await prisma.category.findFirst({
      where: { name: 'Motocicletas' },
      include: {
        categoryAttributes: {
          include: {
            attribute: true
          }
        }
      }
    });

    if (category && category.categoryAttributes) {
      console.log('\n🔍 Atributos disponibles para Motocicletas:');
      category.categoryAttributes.forEach(ca => {
        console.log(`- ${ca.attribute.name} (ID: ${ca.attributeId}, Tipo: ${ca.attribute.type})`);
        if (ca.attribute.options && ca.attribute.options.length > 0) {
          console.log(`  Opciones: ${ca.attribute.options.join(', ')}`);
        }
      });

      // Buscar atributos específicos para agregar
      const puntaDiamanteAttr = category.categoryAttributes.find(ca => 
        ca.attribute.name.toLowerCase().includes('punta') || 
        ca.attribute.name.toLowerCase().includes('diamante')
      );
      
      const materialAttr = category.categoryAttributes.find(ca => 
        ca.attribute.name.toLowerCase().includes('material')
      );

      if (puntaDiamanteAttr) {
        // Buscar si ya existe el valor
        const existing = await prisma.attributeValue.findFirst({
          where: {
            productId: product.id,
            attributeId: puntaDiamanteAttr.attributeId
          }
        });

        if (existing) {
          // Actualizar
          await prisma.attributeValue.update({
            where: { id: existing.id },
            data: {
              value: puntaDiamanteAttr.attribute.type === 'BOOLEAN' ? 'true' : 'Sí'
            }
          });
        } else {
          // Crear nuevo
          await prisma.attributeValue.create({
            data: {
              productId: product.id,
              attributeId: puntaDiamanteAttr.attributeId,
              value: puntaDiamanteAttr.attribute.type === 'BOOLEAN' ? 'true' : 'Sí'
            }
          });
        }
        console.log(`✅ Agregado atributo: ${puntaDiamanteAttr.attribute.name}`);
      }

      if (materialAttr) {
        // Buscar una opción de material que contenga "bujía" o similar
        const materialOptions = materialAttr.attribute.options || [];
        const selectedMaterial = materialOptions.find(opt => 
          opt.toLowerCase().includes('bujía') || 
          opt.toLowerCase().includes('cerámica') ||
          opt.toLowerCase().includes('metal')
        ) || materialOptions[0] || 'Material estándar';

        // Buscar si ya existe el valor
        const existing = await prisma.attributeValue.findFirst({
          where: {
            productId: product.id,
            attributeId: materialAttr.attributeId
          }
        });

        if (existing) {
          // Actualizar
          await prisma.attributeValue.update({
            where: { id: existing.id },
            data: {
              value: selectedMaterial
            }
          });
        } else {
          // Crear nuevo
          await prisma.attributeValue.create({
            data: {
              productId: product.id,
              attributeId: materialAttr.attributeId,
              value: selectedMaterial
            }
          });
        }
        console.log(`✅ Agregado atributo: ${materialAttr.attribute.name} = ${selectedMaterial}`);
      }
    }

    console.log('\n✅ Producto Bujía corregido exitosamente');

  } catch (error) {
    console.error('❌ Error al corregir producto:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBujiaProduct();
