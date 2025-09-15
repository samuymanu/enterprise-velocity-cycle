import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateBody } from '../middleware/validation';
import { createSaleSchema, updateSaleSchema } from '../schemas/sale';
import { authMiddleware } from '../middleware/auth';
import { createSaleService } from '../services/saleService';

const router = express.Router();
router.use(authMiddleware);
const prisma = new PrismaClient();

// POST /api/sales - Crear venta
router.post('/', validateBody(createSaleSchema), async (req, res) => {
  try {
    const saleData = req.body;
    const userId = (req as any).user?.id; // Obtener userId del middleware de auth

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const sale = await createSaleService({
      ...saleData,
      userId
    });

    res.status(201).json({ success: true, sale });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    res.status(500).json({ success: false, error: error.message || 'Error al crear venta' });
  }
});

// PUT /api/sales/:id - Actualizar venta
router.put('/:id', validateBody(updateSaleSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.update({ where: { id }, data: req.body });
    res.json({ success: true, sale });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al actualizar venta' });
  }
});

// GET /api/sales/recent - Obtener ventas recientes
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Obtener fecha de inicio del día actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        status: 'COMPLETED' // Solo ventas completadas
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentNumber: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            }
          }
        }
      }
    });

    // Transformar datos para el frontend
    const transformedSales = sales.map(sale => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      customer: sale.customer ? {
        firstName: sale.customer.firstName,
        lastName: sale.customer.lastName,
        documentNumber: sale.customer.documentNumber
      } : null,
      total: sale.total,
      status: sale.status,
      createdAt: sale.createdAt.toISOString(),
      items: sale.saleItems.length,
      paymentMethod: sale.paymentMethod,
      items_detail: sale.saleItems.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: Number(item.unitPrice)
      }))
    }));

    res.json({ success: true, sales: transformedSales });
  } catch (error: any) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({ success: false, error: 'Error al obtener ventas recientes' });
  }
});

// GET /api/sales/stats - Obtener estadísticas de ventas
router.get('/stats', async (req, res) => {
  try {
    const period = req.query.period as string || '30d';
    
    // Calcular fecha de inicio basada en el período
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Obtener estadísticas de ventas
    const [totalSales, totalRevenue, salesByPaymentMethod, dailySales] = await Promise.all([
      // Total de ventas en el período
      prisma.sale.count({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED'
        }
      }),
      
      // Ingresos totales en el período
      prisma.sale.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED'
        },
        _sum: { total: true }
      }),
      
      // Ventas por método de pago
      prisma.sale.groupBy({
        by: ['paymentMethod'],
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED'
        },
        _count: { id: true },
        _sum: { total: true }
      }),
      
      // Ventas diarias (últimos 7 días) - Usar Prisma en lugar de SQL raw
      prisma.sale.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
          status: 'COMPLETED'
        },
        _count: { id: true },
        _sum: { total: true }
      })
    ]);

    const stats = {
      totalSales: totalSales || 0,
      totalRevenue: Number(totalRevenue._sum.total) || 0,
      averageSale: totalSales > 0 ? (Number(totalRevenue._sum.total) || 0) / totalSales : 0,
      salesByPaymentMethod: salesByPaymentMethod.map(method => ({
        method: method.paymentMethod,
        count: method._count.id,
        revenue: Number(method._sum.total) || 0
      })),
      dailySales: Array.isArray(dailySales) ? dailySales.slice(0, 7).map((day: any) => ({
        date: day.createdAt.toISOString().split('T')[0],
        count: day._count.id,
        revenue: Number(day._sum.total) || 0
      })) : []
    };

    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas de ventas' });
  }
});

// GET /api/sales - Obtener todas las ventas con filtros
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      customerId,
      status
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [sales, totalCount] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              documentNumber: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true
                }
              }
            }
          }
        }
      }),
      prisma.sale.count({ where })
    ]);

    // Transformar datos
    const transformedSales = sales.map(sale => ({
      id: sale.id,
      saleNumber: sale.saleNumber,
      customer: sale.customer ? 
        `${sale.customer.firstName} ${sale.customer.lastName}` : 
        'Cliente Genérico',
      amount: sale.total,
      status: sale.status,
      date: sale.createdAt.toISOString().split('T')[0],
      items: sale.saleItems.length,
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt,
      items_detail: sale.saleItems.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        price: Number(item.unitPrice)
      }))
    }));

    res.json({
      success: true,
      sales: transformedSales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ success: false, error: 'Error al obtener ventas' });
  }
});

export default router;
