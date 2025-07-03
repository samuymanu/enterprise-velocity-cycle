import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Dashboard principal con métricas
router.get('/stats', async (req: any, res: any) => {
  try {
    // Obtener estadísticas principales
    const [
      totalProducts,
      totalCustomers,
      totalSales,
      totalServiceOrders,
      lowStockProducts,
      recentSales,
      activeServiceOrders,
      monthlyRevenue
    ] = await Promise.all([
      // Total de productos
      prisma.product.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Total de clientes
      prisma.customer.count({
        where: { isActive: true }
      }),
      
      // Total de ventas del mes
      prisma.sale.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      
      // Total de órdenes de servicio activas
      prisma.serviceOrder.count({
        where: {
          status: {
            in: ['RECEIVED', 'IN_PROGRESS', 'WAITING_PARTS']
          }
        }
      }),
      
      // Productos con stock bajo
      prisma.product.count({
        where: {
          AND: [
            { status: 'ACTIVE' },
            {
              stock: {
                lte: prisma.product.fields.minStock
              }
            }
          ]
        }
      }),
      
      // Ventas recientes (últimas 5)
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true
            }
          },
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      
      // Órdenes de servicio activas
      prisma.serviceOrder.findMany({
        where: {
          status: {
            in: ['RECEIVED', 'IN_PROGRESS', 'WAITING_PARTS']
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true
            }
          },
          technician: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      
      // Revenue del mes actual
      prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          },
          status: 'COMPLETED'
        },
        _sum: {
          total: true
        }
      })
    ]);

    // Calcular valor total del inventario
    const inventoryValue = await prisma.product.aggregate({
      where: { status: 'ACTIVE' },
      _sum: {
        costPrice: true
      }
    });

    res.json({
      stats: {
        totalProducts,
        totalCustomers,
        totalSales,
        totalServiceOrders,
        lowStockProducts,
        inventoryValue: inventoryValue._sum.costPrice || 0,
        monthlyRevenue: monthlyRevenue._sum.total || 0
      },
      recentSales: recentSales.map(sale => ({
        id: sale.id,
        saleNumber: sale.saleNumber,
        total: sale.total,
        customer: sale.customer.companyName || 
                 `${sale.customer.firstName} ${sale.customer.lastName}`,
        seller: `${sale.user.firstName} ${sale.user.lastName}`,
        createdAt: sale.createdAt
      })),
      activeServiceOrders: activeServiceOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer: order.customer.companyName || 
                 `${order.customer.firstName} ${order.customer.lastName}`,
        technician: `${order.technician.firstName} ${order.technician.lastName}`,
        vehicleType: order.vehicleType,
        status: order.status,
        estimatedDate: order.estimatedDate,
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las estadísticas'
    });
  }
});

// Ventas por día de los últimos 30 días
router.get('/sales-chart', async (req: any, res: any) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesData = await prisma.sale.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        },
        status: 'COMPLETED'
      },
      _sum: {
        total: true
      },
      _count: {
        id: true
      }
    });

    // Agrupar por día
    const dailySales = salesData.reduce((acc: any, sale) => {
      const date = new Date(sale.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          total: 0,
          count: 0
        };
      }
      acc[date].total += Number(sale._sum.total || 0);
      acc[date].count += sale._count.id;
      return acc;
    }, {});

    const chartData = Object.values(dailySales).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json(chartData);
  } catch (error) {
    console.error('Error obteniendo datos del gráfico de ventas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los datos del gráfico'
    });
  }
});

// Productos con stock bajo
router.get('/low-stock', async (req: any, res: any) => {
  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        AND: [
          { status: 'ACTIVE' },
          {
            stock: {
              lte: prisma.product.fields.minStock
            }
          }
        ]
      },
      include: {
        category: true,
        brand: true
      },
      orderBy: {
        stock: 'asc'
      }
    });

    res.json(lowStockProducts);
  } catch (error) {
    console.error('Error obteniendo productos con stock bajo:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los productos con stock bajo'
    });
  }
});

export default router;
