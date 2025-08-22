import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Servicio para manejo automático de atributos
 */

/**
 * 1. Obtener categoryId del producto
 * 2. Buscar atributos asignados a esa categoría
 * 3. Auto-asignar atributos obligatorios
 * 4. Validar valores de atributos según tipo
 * 5. Guardar en ProductAttributeValue
 */
export async function autoAssignCategoryAttributes(
  productId: string, 
  categoryId: string, 
  providedAttributes: Array<{ attributeId: string, value: string }> = []
) {
  console.log(`🔧 Iniciando auto-asignación de atributos para producto ${productId}, categoría ${categoryId}`);

  // 1. Obtener atributos de la categoría (incluye herencia de categoría padre)
  const categoryWithAttributes = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      categoryAttributes: {
        include: {
          attribute: true
        },
        orderBy: { sortOrder: 'asc' }
      },
      parent: {
        include: {
          categoryAttributes: {
            include: {
              attribute: true
            }
          }
        }
      }
    }
  });

  if (!categoryWithAttributes) {
    throw new Error(`Categoría ${categoryId} no encontrada`);
  }

  // 2. Combinar atributos de categoría actual + categoría padre (herencia)
  let allCategoryAttributes = [...(categoryWithAttributes.categoryAttributes || [])];
  
  // Agregar atributos heredados de la categoría padre si existe
  if (categoryWithAttributes.parent?.categoryAttributes) {
    const parentAttributes = categoryWithAttributes.parent.categoryAttributes.filter(
      parentAttr => !allCategoryAttributes.some(attr => attr.attributeId === parentAttr.attributeId)
    );
    allCategoryAttributes = [...allCategoryAttributes, ...parentAttributes];
  }

  console.log(`📋 Encontrados ${allCategoryAttributes.length} atributos para la categoría`);

  // 3. Procesar cada atributo de la categoría
  const attributesToSave: Array<{ attributeId: string, value: string }> = [];
  const validationErrors: string[] = [];

  for (const categoryAttribute of allCategoryAttributes) {
    const attribute = categoryAttribute.attribute;
    const providedAttr = providedAttributes.find(p => p.attributeId === attribute.id);

    // 4. Validar atributos obligatorios
    if (categoryAttribute.isRequired && !providedAttr) {
      // Auto-generar valor por defecto para atributos obligatorios
      const defaultValue = generateDefaultValue(attribute);
      if (defaultValue !== null) {
        attributesToSave.push({
          attributeId: attribute.id,
          value: defaultValue
        });
        console.log(`✅ Auto-asignado valor por defecto '${defaultValue}' para atributo obligatorio '${attribute.name}'`);
      } else {
        validationErrors.push(`Atributo obligatorio '${attribute.name}' no proporcionado y sin valor por defecto`);
      }
      continue;
    }

    // 5. Validar valores proporcionados
    if (providedAttr) {
      const validationResult = validateAttributeValue(attribute, providedAttr.value);
      if (validationResult.isValid) {
        attributesToSave.push(providedAttr);
        console.log(`✅ Validado atributo '${attribute.name}' con valor '${providedAttr.value}'`);
      } else {
        validationErrors.push(`${attribute.name}: ${validationResult.error}`);
      }
    }
  }

  // 6. Verificar errores de validación
  if (validationErrors.length > 0) {
    throw new Error(`Errores de validación de atributos: ${validationErrors.join(', ')}`);
  }

  // 7. Guardar atributos en ProductAttributeValue
  console.log(`💾 Guardando ${attributesToSave.length} atributos...`);
  for (const attr of attributesToSave) {
    await prisma.productAttributeValue.upsert({
      where: {
        productId_attributeId: {
          productId: productId,
          attributeId: attr.attributeId
        }
      },
      update: {
        value: attr.value
      },
      create: {
        productId: productId,
        attributeId: attr.attributeId,
        value: attr.value
      }
    });
  }

  console.log(`🎉 Auto-asignación completada exitosamente para ${attributesToSave.length} atributos`);
  return attributesToSave;
}

/**
 * Generar valor por defecto para atributos obligatorios
 */
function generateDefaultValue(attribute: any): string | null {
  switch (attribute.type) {
    case 'STRING':
      return attribute.options && attribute.options.length > 0 ? attribute.options[0] : 'Sin especificar';
    
    case 'NUMBER':
      if (attribute.minValue !== null) {
        return String(attribute.minValue);
      }
      return '0';
    
    case 'BOOLEAN':
      return 'false';
    
    case 'LIST':
      return attribute.options && attribute.options.length > 0 ? attribute.options[0] : null;
    
    case 'DATE':
      return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    default:
      return null;
  }
}

/**
 * Validar valor de atributo según su tipo
 */
function validateAttributeValue(attribute: any, value: string): { isValid: boolean, error?: string } {
  // 1. Validar según tipo
  switch (attribute.type) {
    case 'NUMBER':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return { isValid: false, error: 'Debe ser un número válido' };
      }
      
      // Validar rango
      if (attribute.minValue !== null && numValue < attribute.minValue) {
        return { isValid: false, error: `Debe ser mayor o igual a ${attribute.minValue}` };
      }
      if (attribute.maxValue !== null && numValue > attribute.maxValue) {
        return { isValid: false, error: `Debe ser menor o igual a ${attribute.maxValue}` };
      }
      break;

    case 'STRING':
      // Validar regex si existe
      if (attribute.regex) {
        const regex = new RegExp(attribute.regex);
        if (!regex.test(value)) {
          return { isValid: false, error: 'Formato inválido según la expresión regular definida' };
        }
      }
      break;

    case 'BOOLEAN':
      if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
        return { isValid: false, error: 'Debe ser true/false o 1/0' };
      }
      break;

    case 'LIST':
      if (attribute.options && !attribute.options.includes(value)) {
        return { isValid: false, error: `Debe ser una de las opciones: ${attribute.options.join(', ')}` };
      }
      break;

    case 'DATE':
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        return { isValid: false, error: 'Debe ser una fecha válida (YYYY-MM-DD)' };
      }
      break;
  }

  return { isValid: true };
}

/**
 * Buscar atributos asignados a una categoría (incluye herencia)
 */
export async function getCategoryAttributes(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      categoryAttributes: {
        include: {
          attribute: true
        },
        orderBy: { sortOrder: 'asc' }
      },
      parent: {
        include: {
          categoryAttributes: {
            include: {
              attribute: true
            }
          }
        }
      }
    }
  });

  if (!category) {
    return [];
  }

  // Combinar atributos propios + heredados
  let allAttributes = [...(category.categoryAttributes || [])];
  
  if (category.parent?.categoryAttributes) {
    const parentAttributes = category.parent.categoryAttributes.filter(
      parentAttr => !allAttributes.some(attr => attr.attributeId === parentAttr.attributeId)
    );
    allAttributes = [...allAttributes, ...parentAttributes];
  }

  return allAttributes;
}
