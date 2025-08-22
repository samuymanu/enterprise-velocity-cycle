import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { searchRateLimit } from '../middleware/rateLimiter';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// GET /api/search/saved - Obtener búsquedas guardadas del usuario
router.get('/saved', searchRateLimit, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, tags, isPublic } = req.query;
    
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (tags) {
      where.tags = {
        has: tags
      };
    }
    
    if (isPublic !== undefined) {
      where.isPublic = isPublic === 'true';
    }

    const [savedSearches, total] = await Promise.all([
      prisma.savedSearch.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { lastUsedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          filters: true,
          tags: true,
          isPublic: true,
          usageCount: true,
          lastUsedAt: true,
          createdAt: true
        }
      }),
      prisma.savedSearch.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        searches: savedSearches,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo búsquedas guardadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/search/saved - Crear nueva búsqueda guardada
router.post('/saved', searchRateLimit, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { name, description, filters, tags = [], isPublic = false } = req.body;

    if (!name || !filters) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y filtros de búsqueda son requeridos'
      });
    }

    // Verificar que no existe una búsqueda con el mismo nombre para el usuario
    const existingSearch = await prisma.savedSearch.findFirst({
      where: {
        userId,
        name
      }
    });

    if (existingSearch) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una búsqueda guardada con ese nombre'
      });
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        name,
        description,
        filters,
        tags,
        isPublic,
        userId,
        usageCount: 0
      },
      select: {
        id: true,
        name: true,
        description: true,
        filters: true,
        tags: true,
        isPublic: true,
        usageCount: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: savedSearch
    });
  } catch (error) {
    console.error('Error creando búsqueda guardada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PUT /api/search/saved/:id - Actualizar búsqueda guardada
router.put('/saved/:id', searchRateLimit, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, filters, tags, isPublic } = req.body;

    // Verificar que la búsqueda existe y pertenece al usuario
    const existingSearch = await prisma.savedSearch.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingSearch) {
      return res.status(404).json({
        success: false,
        message: 'Búsqueda guardada no encontrada'
      });
    }

    const updatedSearch = await prisma.savedSearch.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(filters && { filters }),
        ...(tags && { tags }),
        ...(isPublic !== undefined && { isPublic }),
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        description: true,
        filters: true,
        tags: true,
        isPublic: true,
        usageCount: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: updatedSearch
    });
  } catch (error) {
    console.error('Error actualizando búsqueda guardada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/search/saved/:id - Eliminar búsqueda guardada
router.delete('/saved/:id', searchRateLimit, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verificar que la búsqueda existe y pertenece al usuario
    const existingSearch = await prisma.savedSearch.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingSearch) {
      return res.status(404).json({
        success: false,
        message: 'Búsqueda guardada no encontrada'
      });
    }

    await prisma.savedSearch.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Búsqueda guardada eliminada correctamente'
    });
  } catch (error) {
    console.error('Error eliminando búsqueda guardada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/search/saved/:id/use - Usar búsqueda guardada
router.post('/saved/:id/use', searchRateLimit, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verificar que la búsqueda existe y el usuario tiene acceso
    const savedSearch = await prisma.savedSearch.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isPublic: true }
        ]
      }
    });

    if (!savedSearch) {
      return res.status(404).json({
        success: false,
        message: 'Búsqueda guardada no encontrada'
      });
    }

    // Incrementar contador de uso y actualizar fecha de último uso
    await prisma.savedSearch.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        filters: savedSearch.filters,
        name: savedSearch.name
      }
    });
  } catch (error) {
    console.error('Error usando búsqueda guardada:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/search/history - Obtener historial de búsquedas
router.get('/history', searchRateLimit, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, query, startDate, endDate } = req.query;
    
    const skip = (page - 1) * limit;
    const where: any = { userId };
    
    if (query) {
      where.query = {
        contains: query,
        mode: 'insensitive'
      };
    }
    
    if (startDate || endDate) {
      where.executedAt = {};
      if (startDate) {
        where.executedAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.executedAt.lte = new Date(endDate as string);
      }
    }

    const [searchHistory, total] = await Promise.all([
      prisma.searchHistory.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { executedAt: 'desc' },
        select: {
          id: true,
          query: true,
          filters: true,
          resultCount: true,
          executedAt: true
        }
      }),
      prisma.searchHistory.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        history: searchHistory,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo historial de búsquedas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/search/history - Registrar búsqueda en historial
router.post('/history', searchRateLimit, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { query, filters = {}, resultCount = 0 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query de búsqueda es requerido'
      });
    }

    const historyEntry = await prisma.searchHistory.create({
      data: {
        query,
        filters,
        resultCount,
        userId
      },
      select: {
        id: true,
        query: true,
        filters: true,
        resultCount: true,
        executedAt: true
      }
    });

    res.status(201).json({
      success: true,
      data: historyEntry
    });
  } catch (error) {
    console.error('Error registrando búsqueda en historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/search/history - Limpiar historial de búsquedas
router.delete('/history', searchRateLimit, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { before } = req.query;

    const where: any = { userId };
    
    if (before) {
      where.executedAt = {
        lt: new Date(before as string)
      };
    }

    const deletedCount = await prisma.searchHistory.deleteMany({
      where
    });

    res.json({
      success: true,
      message: `${deletedCount.count} entradas del historial eliminadas`,
      data: { deletedCount: deletedCount.count }
    });
  } catch (error) {
    console.error('Error limpiando historial de búsquedas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/search/analytics/popular - Obtener términos de búsqueda populares
router.get('/analytics/popular', searchRateLimit, async (req: any, res: any) => {
  try {
    const { limit = 10, days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const popularSearches = await prisma.searchHistory.groupBy({
      by: ['query'],
      where: {
        executedAt: {
          gte: daysAgo
        }
      },
      _count: {
        query: true
      },
      orderBy: {
        _count: {
          query: 'desc'
        }
      },
      take: parseInt(limit as string)
    });

    const formattedResults = popularSearches.map(item => ({
      query: item.query,
      count: item._count?.query || 0
    }));

    res.json({
      success: true,
      data: {
        popularSearches: formattedResults,
        period: `${days} días`,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error obteniendo búsquedas populares:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/search/analytics - Registrar analítica de búsqueda
router.post('/analytics', searchRateLimit, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { 
      searchId, 
      action, 
      metadata = {},
      timestamp = new Date()
    } = req.body;

    if (!searchId || !action) {
      return res.status(400).json({
        success: false,
        message: 'searchId y action son requeridos'
      });
    }

    // Por ahora solo registramos en el historial, pero se puede expandir
    // para tener una tabla específica de analytics
    await prisma.searchHistory.create({
      data: {
        query: `${action}:${searchId}`,
        filters: {
          action,
          searchId,
          metadata,
          analytics: true
        },
        resultCount: 0,
        userId
      }
    });

    res.json({
      success: true,
      message: 'Analítica registrada correctamente'
    });
  } catch (error) {
    console.error('Error registrando analítica:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;
