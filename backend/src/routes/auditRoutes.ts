import { Router, Request, Response } from 'express';
import { auditService } from '../middleware/auditMiddleware';
import logger from '../logger';

const router = Router();

/**
 * GET /api/audit/entity/:entityType/:entityId
 * Obtener historial de auditoría para una entidad específica
 */
router.get('/entity/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    if (limit > 500) {
      return res.status(400).json({
        error: 'El límite máximo es 500 registros'
      });
    }

    const auditHistory = await auditService.getAuditHistory(entityType, entityId, limit);

    res.json({
      success: true,
      data: {
        entityType,
        entityId,
        totalRecords: auditHistory.length,
        limit,
        history: auditHistory
      }
    });

  } catch (error) {
    logger.error('Error getting audit history', {
      error: error instanceof Error ? error.message : 'Unknown error',
      entityType: req.params.entityType,
      entityId: req.params.entityId
    });

    res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/audit/stats
 * Obtener estadísticas de auditoría
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Validar fechas si se proporcionan
    if (startDate && isNaN(startDate.getTime())) {
      return res.status(400).json({
        error: 'Fecha de inicio inválida'
      });
    }

    if (endDate && isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: 'Fecha de fin inválida'
      });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        error: 'La fecha de inicio debe ser anterior a la fecha de fin'
      });
    }

    const stats = await auditService.getAuditStats(userId, startDate, endDate);

    res.json({
      success: true,
      data: {
        period: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          userId
        },
        statistics: stats
      }
    });

  } catch (error) {
    logger.error('Error getting audit stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: req.query
    });

    res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/audit/product/:productId/stock-changes
 * Obtener cambios específicos de stock para un producto
 */
router.get('/product/:productId/stock-changes', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    // Obtener historial de auditoría específico para stock
    const auditHistory = await auditService.getAuditHistory('Product', productId, limit);
    
    // Filtrar solo cambios de stock
    const stockChanges = auditHistory.filter(entry => 
      entry.operation === 'UPDATE' && 
      entry.beforeState?.stock !== undefined && 
      entry.afterState?.stock !== undefined &&
      entry.beforeState.stock !== entry.afterState.stock
    );

    // Enriquecer con información adicional
    const enrichedChanges = stockChanges.map(change => ({
      id: change.id,
      timestamp: change.createdAt,
      userId: change.userId,
      stockBefore: change.beforeState.stock,
      stockAfter: change.afterState.stock,
      difference: change.afterState.stock - change.beforeState.stock,
      metadata: change.metadata,
      ipAddress: change.ipAddress
    }));

    res.json({
      success: true,
      data: {
        productId,
        totalChanges: enrichedChanges.length,
        stockChanges: enrichedChanges
      }
    });

  } catch (error) {
    logger.error('Error getting product stock changes', {
      error: error instanceof Error ? error.message : 'Unknown error',
      productId: req.params.productId
    });

    res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/audit/recent
 * Obtener actividad reciente de auditoría
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const hours = parseInt(req.query.hours as string) || 24;

    if (limit > 100) {
      return res.status(400).json({
        error: 'El límite máximo es 100 registros'
      });
    }

    // Por ahora, devolver información simulada hasta implementar tabla de auditoría
    const recentActivity = {
      totalActivities: 0,
      timeframe: `últimas ${hours} horas`,
      activities: []
    };

    res.json({
      success: true,
      data: recentActivity
    });

  } catch (error) {
    logger.error('Error getting recent audit activity', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: req.query
    });

    res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
