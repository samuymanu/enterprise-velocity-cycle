import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { createAttributeSchema, updateAttributeSchema, assignAttributeToCategoriesSchema } from '../schemas/attribute';
import { getCategoryAttributes } from '../services/attributeService';

const router = express.Router();
const prisma = new PrismaClient();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// GET /api/attributes - Obtener todos los atributos
router.get('/', async (req, res) => {
  try {
    const attributes = await prisma.attribute.findMany({
      orderBy: { name: 'asc' },
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

    res.json({
      success: true,
      attributes,
      total: attributes.length
    });
  } catch (error) {
    console.error('Error al obtener atributos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/attributes - Crear nuevo atributo
router.post('/', validateBody(createAttributeSchema), async (req, res) => {
  try {
    const { categoryId, name, type, unit, helpText, isGlobal, dependsOn, minValue, maxValue, regex, options, description, isActive = true } = req.body;

    console.log('🚀 Creating attribute with data:', req.body);

    // Validaciones
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y tipo son requeridos'
      });
    }

    // Verificar que el tipo sea válido
    const validTypes = ['STRING', 'NUMBER', 'BOOLEAN', 'LIST', 'DATE'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de atributo inválido'
      });
    }

    // Si es tipo LIST, verificar que tenga opciones
    if (type === 'LIST' && (!options || !Array.isArray(options) || options.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Los atributos de tipo lista deben tener opciones'
      });
    }

    // Si se proporciona categoryId, verificar que existe
    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId }
      });
      
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'La categoría especificada no existe'
        });
      }
    }

    const attribute = await prisma.attribute.create({
      data: {
        name,
        type,
        unit: unit || undefined,
        isGlobal: !!isGlobal,
        dependsOn: dependsOn || undefined,
        minValue: minValue !== undefined ? Number(minValue) : undefined,
        maxValue: maxValue !== undefined ? Number(maxValue) : undefined,
        regex: regex || undefined,
        options: type === 'LIST' ? options : [],
        description: description || undefined,
        isActive
      }
    });

    console.log('✅ Attribute created:', attribute);

    // Si se proporciona categoryId, asignar automáticamente el atributo a la categoría
    if (categoryId) {
      try {
        await prisma.categoryAttribute.create({
          data: {
            categoryId: categoryId,
            attributeId: attribute.id,
            isRequired: false,
            sortOrder: 0
          }
        });
        console.log('✅ Attribute auto-assigned to category:', categoryId);
      } catch (assignError) {
        console.warn('⚠️ Could not auto-assign attribute to category:', assignError);
        // No fallar la creación del atributo por esto
      }
    }

    res.status(201).json({
      success: true,
      message: 'Atributo creado exitosamente',
      attribute
    });
  } catch (error: any) {
    console.error('Error al crear atributo:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un atributo con ese nombre'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/attributes/:id - Actualizar atributo
router.put('/:id', validateBody(updateAttributeSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, unit, options, description, isActive } = req.body;

    // Verificar que el atributo existe
    const existingAttribute = await prisma.attribute.findUnique({
      where: { id }
    });

    if (!existingAttribute) {
      return res.status(404).json({
        success: false,
        message: 'Atributo no encontrado'
      });
    }

    // Validaciones
    if (name && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es requerido'
      });
    }

    if (type) {
      const validTypes = ['STRING', 'NUMBER', 'BOOLEAN', 'LIST', 'DATE'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de atributo inválido'
        });
      }

      // Si es tipo LIST, verificar que tenga opciones
      if (type === 'LIST' && (!options || !Array.isArray(options) || options.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Los atributos de tipo lista deben tener opciones'
        });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (unit !== undefined) updateData.unit = unit || null;
    if (options !== undefined) updateData.options = type === 'LIST' ? options : [];
    if (description !== undefined) updateData.description = description || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const attribute = await prisma.attribute.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Atributo actualizado exitosamente',
      attribute
    });
  } catch (error: any) {
    console.error('Error al actualizar atributo:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un atributo con ese nombre'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/attributes/:id - Eliminar atributo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el atributo existe
    const existingAttribute = await prisma.attribute.findUnique({
      where: { id },
      include: {
        _count: {
          select: { 
            productValues: true,
            categoryAttributes: true
          }
        }
      }
    });

    if (!existingAttribute) {
      return res.status(404).json({
        success: false,
        message: 'Atributo no encontrado'
      });
    }

    // Verificar si tiene valores de productos asociados
    if (existingAttribute._count.productValues > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el atributo porque tiene productos asociados'
      });
    }

    // Eliminar el atributo (las relaciones se eliminan automáticamente por CASCADE)
    await prisma.attribute.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Atributo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar atributo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/attributes/:id/categories - Asignar atributo a categorías
router.post('/:id/categories', validateBody(assignAttributeToCategoriesSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryIds, isRequired = false } = req.body;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de categorías'
      });
    }

    // Verificar que el atributo existe
    const attribute = await prisma.attribute.findUnique({
      where: { id }
    });

    if (!attribute) {
      return res.status(404).json({
        success: false,
        message: 'Atributo no encontrado'
      });
    }

    // Verificar que las categorías existen
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } }
    });

    if (categories.length !== categoryIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Una o más categorías no existen'
      });
    }

    // Crear las relaciones (ignorar si ya existen)
    const assignments = await Promise.all(
      categoryIds.map(async (categoryId: string) => {
        return prisma.categoryAttribute.upsert({
          where: {
            categoryId_attributeId: {
              categoryId,
              attributeId: id
            }
          },
          create: {
            categoryId,
            attributeId: id,
            isRequired
          },
          update: {
            isRequired
          }
        });
      })
    );

    res.json({
      success: true,
      message: 'Atributo asignado a categorías exitosamente',
      assignments
    });
  } catch (error) {
    console.error('Error al asignar atributo a categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/attributes/:id/categories/:categoryId - Desasignar atributo de categoría
router.delete('/:id/categories/:categoryId', async (req, res) => {
  try {
    const { id, categoryId } = req.params;

    const assignment = await prisma.categoryAttribute.findUnique({
      where: {
        categoryId_attributeId: {
          categoryId,
          attributeId: id
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Asignación no encontrada'
      });
    }

    await prisma.categoryAttribute.delete({
      where: {
        categoryId_attributeId: {
          categoryId,
          attributeId: id
        }
      }
    });

    res.json({
      success: true,
      message: 'Atributo desasignado de categoría exitosamente'
    });
  } catch (error) {
    console.error('Error al desasignar atributo de categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/attributes/category/:categoryId - Obtener atributos de una categoría (mejorado con herencia)
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { type } = req.query; // Filtro opcional por tipo de atributo

    // Usar el servicio mejorado que incluye herencia
    const categoryAttributes = await getCategoryAttributes(categoryId);

    // Filtrar por tipo si se especifica
    let filteredAttributes = categoryAttributes;
    if (type) {
      filteredAttributes = categoryAttributes.filter(
        ca => ca.attribute.type === String(type).toUpperCase()
      );
    }

    // Formatear respuesta con información adicional
    const formattedAttributes = filteredAttributes.map(ca => ({
      id: ca.attribute.id,
      name: ca.attribute.name,
      type: ca.attribute.type,
      unit: ca.attribute.unit,
      helpText: ca.attribute.helpText,
      isGlobal: ca.attribute.isGlobal,
      isRequired: ca.isRequired,
      sortOrder: ca.sortOrder,
      dependsOn: ca.attribute.dependsOn,
      minValue: ca.attribute.minValue,
      maxValue: ca.attribute.maxValue,
      regex: ca.attribute.regex,
      options: ca.attribute.options,
      description: ca.attribute.description,
      isActive: ca.attribute.isActive,
      // Información adicional del contexto de categoría
      categoryAssignment: {
        categoryId: ca.categoryId,
        isRequired: ca.isRequired,
        sortOrder: ca.sortOrder,
        isInherited: ca.categoryId !== categoryId // Indica si viene de categoría padre
      }
    }));

    // Estadísticas adicionales
    const stats = {
      total: formattedAttributes.length,
      required: formattedAttributes.filter(a => a.isRequired).length,
      optional: formattedAttributes.filter(a => !a.isRequired).length,
      inherited: formattedAttributes.filter(a => a.categoryAssignment.isInherited).length,
      byType: formattedAttributes.reduce((acc, attr) => {
        acc[attr.type] = (acc[attr.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    res.json({
      success: true,
      categoryId,
      attributes: formattedAttributes,
      stats
    });
  } catch (error) {
    console.error('Error al obtener atributos de categoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;