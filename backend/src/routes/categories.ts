import express from 'express';
import { PrismaClient } from '@prisma/client';

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
router.post('/', async (req: any, res: any) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'El nombre de la categoría es requerido'
      });
    }

    const category = await prisma.category.create({
      data: { name, description }
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
router.post('/subcategory', async (req: any, res: any) => {
  try {
    const { name, description, parentId } = req.body;

    if (!name || !parentId) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: 'El nombre y la categoría padre son requeridos'
      });
    }

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

    const subcategory = await prisma.category.create({
      data: { 
        name, 
        description,
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
router.delete('/:id', async (req: any, res: any) => {
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
