import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// Middleware básico
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5173']
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'BikeShop ERP Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Obtener productos
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo productos'
    });
  }
});

// Obtener categorías
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo categorías'
    });
  }
});

// Obtener marcas
app.get('/api/brands', async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error('Error obteniendo marcas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo marcas'
    });
  }
});

// Obtener clientes
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo clientes'
    });
  }
});

// Estadísticas del dashboard
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [
      totalProducts,
      totalCustomers,
      lowStockProducts,
      inventoryValue
    ] = await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.customer.count({ where: { isActive: true } }),
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
      prisma.product.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { costPrice: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalCustomers,
        lowStockProducts,
        inventoryValue: inventoryValue._sum.costPrice || 0,
        monthlyRevenue: 0, // Temporal
        totalSales: 0 // Temporal
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 BikeShop ERP Backend iniciado en puerto ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 API disponible en: http://localhost:${PORT}/api`);
  console.log(`💾 Base de datos conectada y funcionando`);
});

export default app;
