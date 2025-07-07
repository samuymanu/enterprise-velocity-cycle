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

// ===== AUTH ENDPOINTS (MOCK) =====

// Login mock (sin autenticación real)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock response - siempre permite el login
  res.json({
    success: true,
    data: {
      user: {
        id: '1',
        email: email || 'admin@bikeshop.com',
        name: 'Administrador',
        role: 'ADMIN'
      },
      token: 'mock-jwt-token'
    },
    message: 'Login exitoso'
  });
});

// Verificar token (mock)
app.get('/api/auth/verify', (req, res) => {
  // Mock response - siempre válido
  res.json({
    success: true,
    data: {
      user: {
        id: '1',
        email: 'admin@bikeshop.com',
        name: 'Administrador',
        role: 'ADMIN'
      }
    }
  });
});

// Logout (mock)
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

// ===== PRODUCTOS =====

// Obtener productos
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error: any) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo productos',
      details: error.message
    });
  }
});

// Crear producto
app.post('/api/products', async (req, res) => {
  try {
    const productData = req.body;
    
    const product = await prisma.product.create({
      data: {
        sku: productData.sku,
        name: productData.name,
        description: productData.description || '',
        purchasePrice: productData.purchasePrice ? parseFloat(productData.purchasePrice) : 0,
        sellingPrice: productData.sellingPrice ? parseFloat(productData.sellingPrice) : 0,
        stock: parseInt(productData.stock) || 0,
        minStock: parseInt(productData.minStock) || 0,
        imageUrl: productData.imageUrl || '',
        categoryId: productData.categoryId,
        brand: productData.brand || null,
        status: 'ACTIVE'
      },
      include: {
        category: true
      }
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Producto creado exitosamente'
    });
  } catch (error: any) {
    console.error('Error creando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando producto',
      details: error.message
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
  } catch (error: any) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo categorías',
      details: error.message
    });
  }
});

// Obtener marcas (desde productos existentes)
app.get('/api/brands', async (req, res) => {
  try {
    const brandsFromProducts = await prisma.product.findMany({
      where: { 
        brand: { not: null },
        status: 'ACTIVE'
      },
      select: { brand: true },
      distinct: ['brand']
    });

    const brands = brandsFromProducts
      .filter(item => item.brand)
      .map((item, index) => ({
        id: `brand-${index + 1}`,
        name: item.brand!,
        isActive: true
      }));

    res.json({
      success: true,
      data: brands
    });
  } catch (error: any) {
    console.error('Error obteniendo marcas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo marcas',
      details: error.message
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
  } catch (error: any) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo clientes',
      details: error.message
    });
  }
});

// Estadísticas del dashboard simplificadas
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [
      totalProducts,
      totalCustomers,
      inventoryValue
    ] = await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.customer.count({ where: { isActive: true } }),
      // Replace 'stock' with any valid numeric field from your Product model, or remove this aggregation if not needed
      prisma.product.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { stock: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalCustomers,
        lowStockProducts: 0, // Temporal
        totalInventoryItems: Number(inventoryValue._sum.stock) || 0,
        monthlyRevenue: 0, // Temporal
        totalSales: 0 // Temporal
      }
    });
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      details: error.message
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
