import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { inventoryMovementService } from '../services/inventoryMovementService';
import { InventoryMoveType } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import logger from '../logger';

const router = Router();

// Schemas de validación
const createMovementSchema = z.object({
  productId: z.string().min(1, 'Product ID es requerido'),
  type: z.nativeEnum(InventoryMoveType),
  quantity: z.number().int().refine(
    (val) => val !== 0,
    'La cantidad no puede ser 0'
  ),
  reason: z.string().optional()
});

const movementFiltersSchema = z.object({
  productId: z.string().optional(),
  type: z.nativeEnum(InventoryMoveType).optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

const updateStockSchema = z.object({
  quantity: z.number().int(),
  reason: z.string().min(1, 'La razón es requerida para ajustes de stock')
});

// Middleware para validar autenticación (simulado por ahora)
const authenticateUser = authMiddleware;

/**
 * POST /api/inventory-movements
 * Crear un nuevo movimiento de inventario
 */
router.post('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const validation = createMovementSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues
      });
    }

    const {
      productId,
      type,
      quantity,
      reason
    } = validation.data;

    const movement = await inventoryMovementService.createMovement({
      productId,
      type,
      quantity,
      reason,
      userId: req.user?.id || 'anonymous'
    });

    logger.info('Movement created via API', {
      movementId: movement.id,
      productId,
      type,
      quantity,
      userId: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Movimiento creado exitosamente',
      data: movement
    });

  } catch (error) {
    logger.error('Error creating movement via API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/inventory-movements
 * Obtener movimientos con filtros y paginación
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const validation = movementFiltersSchema.safeParse(req.query);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Parámetros de consulta inválidos',
        errors: validation.error.issues
      });
    }

    const {
      productId,
      type,
      userId,
      startDate,
      endDate,
      page,
      limit
    } = validation.data;

    // Convertir fechas si se proporcionan
    const filters = {
      productId,
      type,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit
    };

    const result = await inventoryMovementService.getMovements(filters);

    res.json({
      success: true,
      message: 'Movimientos obtenidos exitosamente',
      data: result
    });

  } catch (error) {
    logger.error('Error fetching movements via API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/inventory-movements/:id
 * Obtener un movimiento específico por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de movimiento es requerido'
      });
    }

    const movement = await inventoryMovementService.getMovementById(id);

    if (!movement) {
      return res.status(404).json({
        success: false,
        message: 'Movimiento no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Movimiento obtenido exitosamente',
      data: movement
    });

  } catch (error) {
    logger.error('Error fetching movement by ID via API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      id: req.params.id
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/inventory-movements/product/:productId
 * Obtener movimientos de un producto específico
 */
router.get('/product/:productId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'ID de producto es requerido'
      });
    }

    const movements = await inventoryMovementService.getMovementsByProduct(productId, limit);

    res.json({
      success: true,
      message: 'Movimientos del producto obtenidos exitosamente',
      data: movements
    });

  } catch (error) {
    logger.error('Error fetching product movements via API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      productId: req.params.productId
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * PUT /api/inventory-movements/product/:productId/stock
 * Ajustar stock de un producto (crea un movimiento de tipo ADJUSTMENT)
 */
router.put('/product/:productId/stock', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const validation = updateStockSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: validation.error.issues
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'ID de producto es requerido'
      });
    }

    const { quantity, reason } = validation.data;

    const movement = await inventoryMovementService.createMovement({
      productId,
      type: 'ADJUSTMENT',
      quantity,
      reason,
      userId: req.user?.id || 'anonymous'
    });

    logger.info('Stock adjusted via API', {
      movementId: movement.id,
      productId,
      quantity,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Stock ajustado exitosamente',
      data: movement
    });

  } catch (error) {
    logger.error('Error adjusting stock via API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      productId: req.params.productId,
      body: req.body
    });

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/inventory-movements/stats/:productId
 * Obtener estadísticas de movimientos
 */
router.get('/stats/:productId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    const stats = await inventoryMovementService.getMovementStats(
      productId || undefined
    );

    res.json({
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching movement stats via API', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: req.query
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;
