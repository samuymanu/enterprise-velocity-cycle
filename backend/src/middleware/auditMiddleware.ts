import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../logger';

const prisma = new PrismaClient();

/**
 * Información de la operación para auditoría
 */
interface AuditOperation {
  entityType: string; // 'Product', 'InventoryMove', etc.
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  beforeState?: any;
  afterState?: any;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Entrada de auditoría en la base de datos
 */
interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  beforeState: any;
  afterState: any;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: any;
  createdAt: Date;
}

/**
 * Servicio de auditoría para tracking de cambios
 */
export class AuditService {
  
  /**
   * Registrar una operación de auditoría
   */
  async logOperation(operation: AuditOperation): Promise<void> {
    try {
      // Por ahora, usar logging hasta implementar tabla de auditoría en DB
      logger.info('AUDIT_TRAIL', {
        timestamp: new Date().toISOString(),
        entityType: operation.entityType,
        entityId: operation.entityId,
        operation: operation.operation,
        beforeState: operation.beforeState,
        afterState: operation.afterState,
        userId: operation.userId,
        ipAddress: operation.ipAddress,
        userAgent: operation.userAgent,
        metadata: operation.metadata || {}
      });

      // TODO: Implementar tabla de auditoría en futura migración
      // await prisma.auditLog.create({
      //   data: {
      //     entityType: operation.entityType,
      //     entityId: operation.entityId,
      //     operation: operation.operation,
      //     beforeState: operation.beforeState || {},
      //     afterState: operation.afterState || {},
      //     userId: operation.userId,
      //     ipAddress: operation.ipAddress,
      //     userAgent: operation.userAgent,
      //     metadata: operation.metadata || {}
      //   }
      // });

    } catch (error) {
      // No fallar la operación principal por errores de auditoría
      logger.error('Error logging audit operation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        operation
      });
    }
  }

  /**
   * Obtener historial de auditoría para una entidad
   */
  async getAuditHistory(entityType: string, entityId: string, limit: number = 50): Promise<AuditEntry[]> {
    try {
      // Por ahora, simular con logs vacíos hasta implementar tabla de auditoría
      logger.info('Requesting audit history', { entityType, entityId, limit });
      
      // TODO: Implementar consulta real cuando exista tabla de auditoría
      // return await prisma.auditLog.findMany({
      //   where: {
      //     entityType,
      //     entityId
      //   },
      //   orderBy: {
      //     createdAt: 'desc'
      //   },
      //   take: limit
      // });

      return [];
    } catch (error) {
      logger.error('Error getting audit history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entityType,
        entityId
      });
      return [];
    }
  }

  /**
   * Obtener estadísticas de auditoría
   */
  async getAuditStats(userId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalOperations: number;
    operationsByType: Record<string, number>;
    operationsByEntity: Record<string, number>;
    mostActiveUsers: Array<{ userId: string; operationCount: number }>;
  }> {
    try {
      // Por ahora, devolver estadísticas simuladas
      logger.info('Requesting audit stats', { userId, startDate, endDate });

      return {
        totalOperations: 0,
        operationsByType: {},
        operationsByEntity: {},
        mostActiveUsers: []
      };
    } catch (error) {
      logger.error('Error getting audit stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        totalOperations: 0,
        operationsByType: {},
        operationsByEntity: {},
        mostActiveUsers: []
      };
    }
  }
}

/**
 * Middleware de auditoría para capturar cambios automáticamente
 */
export const auditMiddleware = (entityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auditService = new AuditService();
    const originalSend = res.send;
    const startTime = Date.now();

    // Capturar información de la request
    const requestInfo = {
      method: req.method,
      url: req.url,
      userId: req.user?.id || 'anonymous',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // Override del método send para capturar la respuesta
    res.send = function(body: any) {
      const duration = Date.now() - startTime;
      
      // Determinar el tipo de operación basado en el método HTTP
      let operation: 'CREATE' | 'UPDATE' | 'DELETE' | undefined;
      switch (req.method) {
        case 'POST':
          operation = 'CREATE';
          break;
        case 'PUT':
        case 'PATCH':
          operation = 'UPDATE';
          break;
        case 'DELETE':
          operation = 'DELETE';
          break;
      }

      // Solo auditar operaciones de escritura
      if (operation && res.statusCode < 400) {
        const entityId = req.params.id || 'unknown';
        
        auditService.logOperation({
          entityType,
          entityId,
          operation,
          beforeState: (req as any).beforeState || null,
          afterState: body,
          userId: requestInfo.userId,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent,
          metadata: {
            method: req.method,
            url: req.url,
            duration,
            statusCode: res.statusCode,
            requestBody: req.body
          }
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Middleware específico para auditoría de stock
 */
export const stockAuditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const auditService = new AuditService();

  // Para operaciones de stock, capturar el estado anterior
  if ((req.method === 'PUT' || req.method === 'PATCH' || req.method === 'POST') && req.params.id) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: req.params.id },
        select: { id: true, stock: true, name: true, sku: true }
      });

      if (product) {
        (req as any).beforeState = {
          stock: product.stock,
          productName: product.name,
          productSku: product.sku
        };
      }
    } catch (error) {
      logger.error('Error capturing before state for stock audit', {
        error: error instanceof Error ? error.message : 'Unknown error',
        productId: req.params.id
      });
    }
  }

  next();
};

/**
 * Helper para logging manual de operaciones críticas
 */
export const logCriticalOperation = async (
  entityType: string,
  entityId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  beforeState: any,
  afterState: any,
  userId: string,
  additionalMetadata?: Record<string, any>
) => {
  const auditService = new AuditService();
  
  await auditService.logOperation({
    entityType,
    entityId,
    operation,
    beforeState,
    afterState,
    userId,
    metadata: {
      ...additionalMetadata,
      criticality: 'HIGH',
      manualLog: true,
      timestamp: new Date().toISOString()
    }
  });
};

// Exportar instancia singleton
export const auditService = new AuditService();
