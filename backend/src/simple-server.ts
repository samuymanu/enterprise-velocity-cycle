import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// Middleware básico
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://id-preview--f484a688-66c2-41f3-9bb8-d163ae469c3c.lovable.app',
    'https://lovable.app',
    'https://lovable-api.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
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
    const {
      sku,
      name,
      description,
      brand,
      costPrice,
      salePrice,
      stock,
      minStock,
      maxStock,
      status,
      barcode,
      categoryId
    } = req.body;

    // Validación básica
    if (!sku || !name || !salePrice) {
      return res.status(400).json({
        success: false,
        error: 'SKU, nombre y precio de venta son requeridos'
      });
    }

    // Verificar si ya existe un producto con el mismo SKU
    const existingProduct = await prisma.product.findUnique({
      where: { sku }
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un producto con este SKU'
      });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description: description || null,
        brand: brand || '',
        costPrice: costPrice ? parseFloat(costPrice) : 0,
        salePrice: salePrice ? parseFloat(salePrice) : 0,
        stock: stock ? parseInt(stock) : 0,
        minStock: minStock ? parseInt(minStock) : 10,
        maxStock: maxStock ? parseInt(maxStock) : null,
        status: status || 'ACTIVE',
        barcode: barcode || null,
        categoryId: categoryId || null
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
        brand: { not: '' },
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
        _sum: { stock: true, costPrice: true, salePrice: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalCustomers,
        lowStockProducts: 0, // Temporal
        totalInventoryItems: Number(inventoryValue._sum.stock) || 0,
        inventoryCost: Number(inventoryValue._sum.costPrice) || 0,
        inventorySale: Number(inventoryValue._sum.salePrice) || 0,
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
