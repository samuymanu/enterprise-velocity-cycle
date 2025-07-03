import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/brands - Obtener todas las marcas
router.get('/', async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      brands,
      total: brands.length
    });
  } catch (error) {
    console.error('Error obteniendo marcas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al obtener las marcas'
    });
  }
});

// POST /api/brands - Crear nueva marca
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        message: 'El nombre de la marca es requerido'
      });
    }

    const brand = await prisma.brand.create({
      data: { name }
    });

    res.status(201).json({
      success: true,
      brand,
      message: 'Marca creada exitosamente'
    });
  } catch (error: any) {
    console.error('Error creando marca:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Marca duplicada',
        message: 'Ya existe una marca con ese nombre'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al crear la marca'
    });
  }
});

// DELETE /api/brands/:id - Eliminar marca
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la marca existe
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        products: true
      }
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: 'Marca no encontrada',
        message: 'La marca especificada no existe'
      });
    }

    // Verificar que no tiene productos asociados
    if (brand.products.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Marca en uso',
        message: 'No se puede eliminar una marca que tiene productos asociados'
      });
    }

    await prisma.brand.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Marca eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando marca:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al eliminar la marca'
    });
  }
});

export default router;
