import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateBody, validateParams } from '../middleware/validation';
import { createResourceRateLimit } from '../middleware/rateLimiter';
import { 
  createCategorySchema, 
  updateCategorySchema,
  createSubcategorySchema,
  idParamSchema 
} from '../schemas/validation';

const router = express.Router();
const prisma = new PrismaClient();

// Obtener todas las categorías
router.get('/', async (req: any, res: any) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [
        { level: 'asc' },
        { name: 'asc' }
      ],
      include: {
        parent: true,
        children: true
      }
    });

    res.json({
      success: true,
      categories,
      total: categories.length
    });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las categorías'
    });
  }
});

// Crear nueva categoría
router.post('/', 
  createResourceRateLimit,
  validateBody(createCategorySchema),
  async (req: any, res: any) => {
    try {
      const { name, description, code } = req.body;

      // Generar código automáticamente si no se proporciona
      let categoryCode = code;
      if (!categoryCode) {
        // Generar código de 3 letras basado en el nombre
        categoryCode = name
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .substring(0, 3)
          .padEnd(3, 'X');
        
        // Verificar si el código ya existe y generar uno único
        let counter = 1;
        let originalCode = categoryCode;
        while (await prisma.category.findFirst({ where: { code: categoryCode } })) {
          if (counter < 10) {
            categoryCode = originalCode.substring(0, 2) + counter;
          } else {
            categoryCode = originalCode.substring(0, 1) + String(counter).padStart(2, '0');
          }
          counter++;
          if (counter > 999) {
            throw new Error('No se pudo generar un código único para la categoría');
          }
        }
      }

    const category = await prisma.category.create({
      data: { name, description, code: categoryCode }
    });

    res.status(201).json({
      message: 'Categoría creada exitosamente',
      category
    });
  } catch (error: any) {
    console.error('Error creando categoría:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Categoría duplicada',
        message: 'Ya existe una categoría con ese nombre'
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear la categoría'
    });
  }
});

// Crear subcategoría
router.post('/subcategory', 
  createResourceRateLimit,
  validateBody(createSubcategorySchema),
  async (req: any, res: any) => {
    try {
      const { name, description, parentId } = req.body;

    // Verificar que la categoría padre existe
    const parentCategory = await prisma.category.findUnique({
      where: { id: parentId }
    });

    if (!parentCategory) {
      return res.status(404).json({
        error: 'Categoría padre no encontrada',
        message: 'La categoría padre especificada no existe'
      });
    }

    // Generar un código único para la subcategoría basado en el nombre
    const codeBase = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    let code = codeBase;
    let counter = 1;
    
    // Verificar que el código sea único
    while (true) {
      const existingCategory = await prisma.category.findUnique({
        where: { code }
      });
      
      if (!existingCategory) {
        break;
      }
      
      code = `${codeBase}-${counter}`;
      counter++;
    }

    const subcategory = await prisma.category.create({
      data: { 
        name, 
        description,
        code,
        parentId,
        level: parentCategory.level + 1
      }
    });

    res.status(201).json({
      message: 'Subcategoría creada exitosamente',
      category: subcategory
    });
  } catch (error: any) {
    console.error('Error creando subcategoría:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Subcategoría duplicada',
        message: 'Ya existe una subcategoría con ese nombre'
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear la subcategoría'
    });
  }
});

// Eliminar categoría
router.delete('/:id', 
  validateParams(idParamSchema),
  async (req: any, res: any) => {
    try {
      const { id } = req.params;

    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        products: true
      }
    });

    if (!category) {
      return res.status(404).json({
        error: 'Categoría no encontrada',
        message: 'La categoría especificada no existe'
      });
    }

    // Verificar que no tiene productos asociados
    if (category.products.length > 0) {
      return res.status(400).json({
        error: 'Categoría en uso',
        message: 'No se puede eliminar una categoría que tiene productos asociados'
      });
    }

    // Verificar que no tiene subcategorías
    if (category.children.length > 0) {
      return res.status(400).json({
        error: 'Categoría con subcategorías',
        message: 'No se puede eliminar una categoría que tiene subcategorías. Elimine primero las subcategorías.'
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo eliminar la categoría'
    });
  }
});

export default router;
