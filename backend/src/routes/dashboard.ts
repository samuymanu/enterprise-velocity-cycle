import express from 'express';
import { PrismaClient } from '@prisma/client';
import { validateQuery } from '../middleware/validation';
import logger from '../logger';

const router = express.Router();
const prisma = new PrismaClient();

// Dashboard principal con métricas
router.get('/stats', async (req: any, res: any) => {
  try {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Obtener estadísticas principales
    const [
      totalProducts,
      totalCustomers,
      totalSales,
      totalServiceOrders,
      lowStockProducts,
      recentSales,
      activeServiceOrders,
      monthlyRevenue,
      lastMonthRevenue,
      totalApartados,
      apartadosPendientes,
      apartadosVencidos,
      totalCreditos,
      creditosPendientes,
      creditosVencidos,
      lastMonthCustomers,
      lastMonthSales,
      lastMonthApartados
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
            gte: currentMonth
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
            gte: currentMonth
          },
          status: 'COMPLETED'
        },
        _sum: {
          total: true
        }
      }),

      // Revenue del mes anterior
      prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: lastMonth,
            lte: lastMonthEnd
          },
          status: 'COMPLETED'
        },
        _sum: {
          total: true
        }
      }),

      // Total de apartados activos
      prisma.layaway.count({
        where: {
          status: {
            in: ['ACTIVO']
          }
        }
      }),

      // Monto total pendiente de apartados
      prisma.layaway.aggregate({
        where: {
          status: {
            in: ['ACTIVO']
          }
        },
        _sum: {
          amount: true
        }
      }),

      // Apartados vencidos
      prisma.layaway.count({
        where: {
          AND: [
            { status: 'ACTIVO' },
            { dueDate: { lt: new Date() } }
          ]
        }
      }),

      // Total de créditos activos
      prisma.credit.count({
        where: {
          status: {
            in: ['PENDIENTE']
          }
        }
      }),

      // Monto total pendiente de créditos
      prisma.credit.aggregate({
        where: {
          status: {
            in: ['PENDIENTE']
          }
        },
        _sum: {
          amount: true
        }
      }),

      // Créditos vencidos
      prisma.credit.count({
        where: {
          AND: [
            { status: 'PENDIENTE' },
            { dueDate: { lt: new Date() } }
          ]
        }
      }),

      // Clientes del mes anterior
      prisma.customer.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lte: lastMonthEnd
          },
          isActive: true
        }
      }),

      // Ventas del mes anterior
      prisma.sale.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lte: lastMonthEnd
          }
        }
      }),

      // Apartados del mes anterior
      prisma.layaway.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lte: lastMonthEnd
          },
          status: {
            in: ['ACTIVO']
          }
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

    // Calcular cambios porcentuales
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const currentRevenue = Number(monthlyRevenue._sum.total || 0);
    const previousRevenue = Number(lastMonthRevenue._sum.total || 0);
    const revenueChange = calculateChange(currentRevenue, previousRevenue);

    const customersChange = calculateChange(totalCustomers, lastMonthCustomers);
    const salesChange = calculateChange(totalSales, lastMonthSales);
    const apartadosChange = calculateChange(totalApartados, lastMonthApartados);

    // Calcular estadísticas adicionales
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const [
      todayRevenue,
      todaySales,
      activeCustomers,
      topProduct
    ] = await Promise.all([
      // Revenue de hoy
      prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: startOfToday
          },
          status: 'COMPLETED'
        },
        _sum: {
          total: true
        }
      }),
      
      // Ventas de hoy
      prisma.sale.count({
        where: {
          createdAt: {
            gte: startOfToday
          }
        }
      }),
      
      // Clientes activos (con compras en los últimos 30 días)
      prisma.customer.count({
        where: {
          sales: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      }),
      
      // Producto más vendido del mes
      prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            createdAt: {
              gte: currentMonth
            },
            status: 'COMPLETED'
          }
        },
        _sum: {
          quantity: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 1
      })
    ]);

    // Obtener detalles del producto más vendido
    let topProductDetails = null;
    if (topProduct.length > 0) {
      const product = await prisma.product.findUnique({
        where: { id: topProduct[0].productId },
        select: {
          name: true,
          sku: true
        }
      });
      topProductDetails = {
        ...product,
        quantity: topProduct[0]._sum.quantity
      };
    }

    res.json({
      stats: {
        totalProducts,
        totalCustomers,
        totalSales,
        totalServiceOrders,
        lowStockProducts,
        inventoryValue: inventoryValue._sum.costPrice || 0,
        monthlyRevenue: currentRevenue,
        apartados: totalApartados,
        apartadosPendientes: apartadosPendientes._sum.amount || 0,
        vencidos: apartadosVencidos,
        creditCount: totalCreditos,
        creditosPendientes: creditosPendientes._sum.amount || 0,
        creditosVencidos: creditosVencidos,
        // Nuevas métricas
        todayRevenue: todayRevenue._sum.total || 0,
        todaySales,
        activeCustomers,
        topProduct: topProductDetails,
        // Cambios porcentuales
        changes: {
          revenue: revenueChange,
          customers: customersChange,
          sales: salesChange,
          apartados: apartadosChange,
          products: 0, // TODO: Calcular basado en productos agregados
          inventory: 0, // TODO: Calcular basado en valor de inventario
          services: 0 // TODO: Calcular basado en servicios
        }
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
    logger.error('Error obteniendo estadísticas del dashboard:', error);
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
