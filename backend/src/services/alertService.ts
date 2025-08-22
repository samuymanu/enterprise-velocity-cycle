import { PrismaClient } from '@prisma/client';
import type { AlertType, AlertPriority, Alert, Product } from '@prisma/client';
import logger from '../logger';

export interface CreateAlertData {
  productId: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  threshold?: number;
  currentValue?: number;
}

export interface AlertFilters {
  type?: AlertType;
  priority?: AlertPriority;
  isActive?: boolean;
  productId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AlertWithProduct extends Alert {
  product: Product;
}

export interface StockThresholds {
  lowStockThreshold: number;
  criticalStockThreshold: number;
  overStockThreshold: number;
}

export class AlertService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Task 3.1: checkStockLevels - Monitor stock levels and create alerts
   */
  async checkStockLevels(): Promise<Alert[]> {
    try {
      logger.info('Starting stock level monitoring');
      
      // Get all products with their current stock
      const products = await this.prisma.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          minStock: true,
          categoryId: true,
        }
      });

      const newAlerts: Alert[] = [];

      for (const product of products) {
        const thresholds = this.calculateThresholds(product);
        
        // Check for different alert types
        if (product.stock <= 0) {
          // OUT_OF_STOCK - Critical priority
          const alert = await this.createAlertIfNotExists({
            productId: product.id,
            type: 'OUT_OF_STOCK',
            priority: 'CRITICAL',
            title: `Product out of stock: ${product.name}`,
            message: `Product ${product.name} (SKU: ${product.sku}) is completely out of stock`,
            threshold: 0,
            currentValue: product.stock
          });
          if (alert) newAlerts.push(alert);
          
        } else if (product.stock <= thresholds.criticalStockThreshold) {
          // LOW_STOCK - High priority (critical level)
          const alert = await this.createAlertIfNotExists({
            productId: product.id,
            type: 'LOW_STOCK',
            priority: 'HIGH',
            title: `Critical low stock: ${product.name}`,
            message: `Product ${product.name} has critically low stock: ${product.stock} units remaining`,
            threshold: thresholds.criticalStockThreshold,
            currentValue: product.stock
          });
          if (alert) newAlerts.push(alert);
          
        } else if (product.stock <= thresholds.lowStockThreshold) {
          // LOW_STOCK - Medium priority
          const alert = await this.createAlertIfNotExists({
            productId: product.id,
            type: 'LOW_STOCK',
            priority: 'MEDIUM',
            title: `Low stock warning: ${product.name}`,
            message: `Product ${product.name} is running low on stock: ${product.stock} units remaining`,
            threshold: thresholds.lowStockThreshold,
            currentValue: product.stock
          });
          if (alert) newAlerts.push(alert);
          
        } else if (product.stock >= thresholds.overStockThreshold) {
          // OVERSTOCK - Low priority
          const alert = await this.createAlertIfNotExists({
            productId: product.id,
            type: 'OVERSTOCK',
            priority: 'LOW',
            title: `Overstock detected: ${product.name}`,
            message: `Product ${product.name} has excess stock: ${product.stock} units (threshold: ${thresholds.overStockThreshold})`,
            threshold: thresholds.overStockThreshold,
            currentValue: product.stock
          });
          if (alert) newAlerts.push(alert);
        } else {
          // Auto-resolve alerts if stock is back to normal levels
          await this.autoResolveStockAlerts(product.id, product.stock);
        }
      }

      logger.info(`Stock monitoring completed. Created ${newAlerts.length} new alerts`);
      return newAlerts;
      
    } catch (error) {
      logger.error('Error in checkStockLevels:', error);
      throw new Error('Failed to check stock levels');
    }
  }

  /**
   * Task 3.1: createAlert - Create a new alert
   */
  async createAlert(data: CreateAlertData): Promise<Alert> {
    try {
      const alert = await this.prisma.alert.create({
        data: {
          productId: data.productId,
          type: data.type,
          priority: data.priority,
          title: data.title,
          message: data.message,
          threshold: data.threshold,
          currentValue: data.currentValue,
          isActive: true
        }
      });

      logger.info(`Alert created: ${alert.id} - ${alert.title}`);
      return alert;
      
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw new Error('Failed to create alert');
    }
  }

  /**
   * Task 3.1: getActiveAlerts - Get active alerts with filtering
   */
  async getActiveAlerts(filters: AlertFilters = {}): Promise<AlertWithProduct[]> {
    try {
      const where: any = {
        isActive: filters.isActive ?? true
      };

      if (filters.type) where.type = filters.type;
      if (filters.priority) where.priority = filters.priority;
      if (filters.productId) where.productId = filters.productId;
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      const alerts = await this.prisma.alert.findMany({
        where,
        include: {
          product: true
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return alerts;
      
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      throw new Error('Failed to get active alerts');
    }
  }

  /**
   * Task 3.1: resolveAlert - Mark alert as resolved
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<Alert> {
    try {
      const alert = await this.prisma.alert.update({
        where: { id: alertId },
        data: {
          isActive: false,
          resolvedAt: new Date(),
          resolvedBy
        }
      });

      logger.info(`Alert resolved: ${alertId} by ${resolvedBy || 'system'}`);
      return alert;
      
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw new Error('Failed to resolve alert');
    }
  }

  /**
   * Get alert statistics for dashboard
   */
  async getAlertStats(): Promise<{
    total: number;
    byType: Record<AlertType, number>;
    byPriority: Record<AlertPriority, number>;
    critical: number;
  }> {
    try {
      const alerts = await this.prisma.alert.findMany({
        where: { isActive: true },
        select: { type: true, priority: true }
      });

      const stats = {
        total: alerts.length,
        byType: {
          LOW_STOCK: 0,
          OUT_OF_STOCK: 0,
          OVERSTOCK: 0
        } as Record<AlertType, number>,
        byPriority: {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0
        } as Record<AlertPriority, number>,
        critical: 0
      };

      alerts.forEach(alert => {
        stats.byType[alert.type]++;
        stats.byPriority[alert.priority]++;
        if (alert.priority === 'CRITICAL') stats.critical++;
      });

      return stats;
      
    } catch (error) {
      logger.error('Error getting alert stats:', error);
      throw new Error('Failed to get alert statistics');
    }
  }

  /**
   * Bulk resolve alerts
   */
  async bulkResolveAlerts(alertIds: string[], resolvedBy?: string): Promise<number> {
    try {
      const result = await this.prisma.alert.updateMany({
        where: { 
          id: { in: alertIds },
          isActive: true 
        },
        data: {
          isActive: false,
          resolvedAt: new Date(),
          resolvedBy
        }
      });

      logger.info(`Bulk resolved ${result.count} alerts by ${resolvedBy || 'system'}`);
      return result.count;
      
    } catch (error) {
      logger.error('Error bulk resolving alerts:', error);
      throw new Error('Failed to bulk resolve alerts');
    }
  }

  /**
   * Cleanup old resolved alerts
   */
  async cleanupOldAlerts(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await this.prisma.alert.deleteMany({
        where: {
          isActive: false,
          resolvedAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`Cleaned up ${result.count} old alerts`);
      return result.count;
      
    } catch (error) {
      logger.error('Error cleaning up old alerts:', error);
      throw new Error('Failed to cleanup old alerts');
    }
  }

  // Private helper methods

  private calculateThresholds(product: any): StockThresholds {
    // Use product's minStock or default to 10
    const lowStockThreshold = product.minStock || 10;
    
    return {
      lowStockThreshold,
      criticalStockThreshold: Math.floor(lowStockThreshold * 0.3), // 30% of low stock threshold
      overStockThreshold: lowStockThreshold * 10 // 10x the low stock threshold
    };
  }

  private async createAlertIfNotExists(data: CreateAlertData): Promise<Alert | null> {
    try {
      // Check if similar active alert already exists
      const existingAlert = await this.prisma.alert.findFirst({
        where: {
          productId: data.productId,
          type: data.type,
          isActive: true
        }
      });

      if (existingAlert) {
        // Update existing alert with new values
        return await this.prisma.alert.update({
          where: { id: existingAlert.id },
          data: {
            currentValue: data.currentValue,
            message: data.message,
            updatedAt: new Date()
          }
        });
      }

      // Create new alert
      return await this.createAlert(data);
      
    } catch (error) {
      logger.error('Error in createAlertIfNotExists:', error);
      return null;
    }
  }

  private async autoResolveStockAlerts(productId: string, currentStock: number): Promise<void> {
    try {
      // Auto-resolve OUT_OF_STOCK alerts if stock > 0
      if (currentStock > 0) {
        await this.prisma.alert.updateMany({
          where: {
            productId,
            type: 'OUT_OF_STOCK',
            isActive: true
          },
          data: {
            isActive: false,
            resolvedAt: new Date(),
            resolvedBy: 'system'
          }
        });
      }

      // Auto-resolve LOW_STOCK alerts if stock is above threshold
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { minStock: true }
      });

      if (product && currentStock > (product.minStock || 10)) {
        await this.prisma.alert.updateMany({
          where: {
            productId,
            type: 'LOW_STOCK',
            isActive: true
          },
          data: {
            isActive: false,
            resolvedAt: new Date(),
            resolvedBy: 'system'
          }
        });
      }
      
    } catch (error) {
      logger.error('Error in autoResolveStockAlerts:', error);
    }
  }
}

// Export singleton instance
export const alertService = new AlertService(new PrismaClient());
