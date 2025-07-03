import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Obtener todas las categorías
router.get('/', async (req: any, res: any) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
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

export default router;
