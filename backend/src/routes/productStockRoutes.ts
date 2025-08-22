import { Router, Request, Response } from 'express';
import { productService } from '../services/productService';
import { InventoryMoveType } from '@prisma/client';
import { auditMiddleware, stockAuditMiddleware, logCriticalOperation } from '../middleware/auditMiddleware';
import logger from '../logger';

const router = Router();

/**
 * GET /api/products-stock/attention
 * Obtener productos que requieren atención
 */
router.get('/attention', async (req: Request, res: Response) => {
  try {
    const products = await productService.getProductsRequiringAttention();

    const summary = {
      outOfStock: products.outOfStock.length,
      lowStock: products.lowStock.length,
      overstock: products.overstock.length,
      highUsage: products.highUsage.length,
      noMovement: products.noMovement.length,
      total: products.outOfStock.length + products.lowStock.length + 
             products.overstock.length + products.highUsage.length + 
             products.noMovement.length
    };

    res.json({
      success: true,
      data: {
        summary,
        products
      }
    });

  } catch (error) {
    logger.error('Error getting products requiring attention', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * POST /api/products-stock/:id/stock/update
 * Actualizar stock de un producto con movimiento automático
 */
router.post('/:id/stock/update', stockAuditMiddleware, auditMiddleware('Product'), async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const { type, quantity, reason, validateStock } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!type || !quantity || !reason) {
      return res.status(400).json({ 
        error: 'Campos requeridos: type, quantity, reason' 
      });
    }

    if (!Object.values(InventoryMoveType).includes(type)) {
      return res.status(400).json({ 
        error: 'Tipo de movimiento inválido',
        validTypes: Object.values(InventoryMoveType)
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ 
        error: 'La cantidad debe ser mayor a 0' 
      });
    }

    const result = await productService.updateStockWithMovement({
      productId,
      type,
      quantity,
      reason,
      userId,
      validateStock: validateStock !== false // Default true
    });

    if (!result.success) {
      return res.status(400).json({ 
        error: result.message,
        details: {
          previousStock: result.previousStock,
          requestedQuantity: quantity,
          movementType: type
        }
      });
    }

    // Log crítico de la operación de stock exitosa
    await logCriticalOperation(
      'Product',
      productId,
      'UPDATE',
      { stock: result.previousStock },
      { stock: result.newStock },
      userId,
      {
        movementType: type,
        quantity,
        reason,
        movementId: result.movement?.id,
        stockDifference: result.newStock - result.previousStock
      }
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        movement: result.movement,
        stockUpdate: {
          previous: result.previousStock,
          current: result.newStock,
          difference: result.newStock - result.previousStock
        }
      }
    });

  } catch (error) {
    logger.error('Error updating stock with movement', {
      error: error instanceof Error ? error.message : 'Unknown error',
      productId: req.params.id,
      body: req.body
    });

    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/products-stock/:id/stock/history
 * Obtener historial de stock de un producto
 */
router.get('/:id/stock/history', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const days = parseInt(req.query.days as string) || 30;

    if (days < 1 || days > 365) {
      return res.status(400).json({ 
        error: 'Los días deben estar entre 1 y 365' 
      });
    }

    const history = await productService.getStockHistory(productId, days);

    res.json({
      success: true,
      data: {
        productId,
        period: `${days} días`,
        entries: history.length,
        history
      }
    });

  } catch (error) {
    logger.error('Error getting stock history', {
      error: error instanceof Error ? error.message : 'Unknown error',
      productId: req.params.id,
      days: req.query.days
    });

    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/products-stock/:id/stock/metrics
 * Obtener métricas de stock de un producto
 */
router.get('/:id/stock/metrics', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;

    const metrics = await productService.calculateStockMetrics(productId);

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Error calculating stock metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      productId: req.params.id
    });

    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/products-stock/:id/stock/alerts
 * Verificar alertas de stock de un producto
 */
router.get('/:id/stock/alerts', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;

    const alerts = await productService.checkStockAlerts(productId);

    res.json({
      success: true,
      data: {
        productId,
        alertCount: alerts.length,
        alerts
      }
    });

  } catch (error) {
    logger.error('Error checking stock alerts', {
      error: error instanceof Error ? error.message : 'Unknown error',
      productId: req.params.id
    });

    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * POST /api/products-stock/:id/stock/optimize
 * Optimizar niveles de stock basado en historial
 */
router.post('/:id/stock/optimize', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;

    const optimization = await productService.optimizeStockLevels(productId);

    res.json({
      success: true,
      data: {
        productId,
        optimization
      }
    });

  } catch (error) {
    logger.error('Error optimizing stock levels', {
      error: error instanceof Error ? error.message : 'Unknown error',
      productId: req.params.id
    });

    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
