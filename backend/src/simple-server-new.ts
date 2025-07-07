import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();
const prisma = new PrismaClient();

// Crear directorio uploads si no existe
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Multer para subida de imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
    }
  }
});

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

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    message: 'BikeShop ERP Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// ===== AUTENTICACIÓN (MOCK PARA DESARROLLO) =====

// Login (mock - sin autenticación real)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // Mock login - acepta cualquier credencial
  const mockUser = {
    id: 'user-1',
    email: email || 'admin@bikeshop.com',
    name: 'Admin BikeShop',
    role: 'ADMIN',
    permissions: ['inventory', 'sales', 'customers', 'reports']
  };

  const mockToken = 'mock-jwt-token-' + Date.now();

  res.json({
    success: true,
    data: {
      user: mockUser,
      token: mockToken
    },
    message: 'Login exitoso (modo desarrollo)'
  });
});

// Verificar token (mock)
app.get('/api/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token no válido'
    });
  }

  // Mock user verification
  const mockUser = {
    id: 'user-1',
    email: 'admin@bikeshop.com',
    name: 'Admin BikeShop',
    role: 'ADMIN',
    permissions: ['inventory', 'sales', 'customers', 'reports']
  };

  res.json({
    success: true,
    data: mockUser
  });
});

// Logout (mock)
app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

// ===== PRODUCTOS =====

// Obtener productos
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    console.log('Obteniendo productos...');
    const products = await prisma.product.findMany({
      include: {
        category: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Encontrados ${products.length} productos`);
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

// Obtener producto por ID
app.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error: any) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo producto',
      details: error.message
    });
  }
});

// Generar siguiente número secuencial para SKU
async function getNextSequentialNumber(categoryCode: string): Promise<string> {
  const products = await prisma.product.findMany({
    where: {
      sku: {
        startsWith: categoryCode + '-'
      }
    },
    orderBy: {
      sku: 'desc'
    },
    take: 1
  });

  if (products.length === 0) {
    return '001';
  }

  const lastSku = products[0].sku;
  const lastNumber = parseInt(lastSku.split('-')[1]) || 0;
  return (lastNumber + 1).toString().padStart(3, '0');
}

// Crear producto (con generación automática de SKU y código de barras)
app.post('/api/products', async (req: Request, res: Response) => {
  try {
    console.log('Creando producto con datos:', req.body);

    const {
      name,
      description,
      brand,
      costPrice,
      salePrice,
      stock,
      minStock,
      maxStock,
      status,
      categoryId
    } = req.body;

    // Validación básica
    if (!name || !salePrice || !categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, precio de venta y categoría son requeridos'
      });
    }

    // Obtener la categoría para generar el SKU
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { parent: true }
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    // Determinar el código de categoría (usar el de la categoría padre si es subcategoría)
    const categoryCode = category.level === 0 ? category.code : category.parent?.code;
    
    if (!categoryCode) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo determinar el código de categoría'
      });
    }

    // Generar SKU automáticamente
    const sequentialNumber = await getNextSequentialNumber(categoryCode);
    const generatedSku = `${categoryCode}-${sequentialNumber}`;

    // El código de barras es igual al SKU (según lo solicitado)
    const generatedBarcode = generatedSku;

    const product = await prisma.product.create({
      data: {
        sku: generatedSku,
        name,
        description: description || null,
        brand: brand || '',
        costPrice: costPrice ? parseFloat(costPrice) : 0,
        salePrice: salePrice ? parseFloat(salePrice) : 0,
        stock: stock ? parseInt(stock) : 0,
        minStock: minStock ? parseInt(minStock) : 10,
        maxStock: maxStock ? parseInt(maxStock) : null,
        status: status || 'ACTIVE',
        barcode: generatedBarcode,
        categoryId: categoryId
      },
      include: {
        category: true
      }
    });

    console.log('Producto creado exitosamente:', product.id);
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

// Ruta separada para subir imagen
app.post('/api/products/upload-image', (req: Request, res: Response) => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      console.error('Error en upload:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Error subiendo imagen'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se subió ninguna imagen'
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      data: { imageUrl }
    });
  });
});

// Actualizar producto
app.put('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar si el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // Si se cambió el SKU, verificar que no exista otro producto con el mismo SKU
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: {
          sku: updateData.sku,
          id: { not: id }
        }
      });

      if (skuExists) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un producto con este SKU'
        });
      }
    }

    // Validar imageUrl si se proporciona
    if (updateData.imageUrl && updateData.imageUrl !== '') {
      const url = updateData.imageUrl;
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/uploads/')) {
        return res.status(400).json({
          success: false,
          error: 'La URL de imagen debe ser una URL absoluta o un path válido'
        });
      }
    }

    // Preparar datos para actualización
    const dataToUpdate: any = {};
    
    if (updateData.sku) dataToUpdate.sku = updateData.sku;
    if (updateData.name) dataToUpdate.name = updateData.name;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description || null;
    if (updateData.brand !== undefined) dataToUpdate.brand = updateData.brand || null;
    if (updateData.purchasePrice !== undefined) dataToUpdate.purchasePrice = parseFloat(updateData.purchasePrice) || 0;
    if (updateData.sellingPrice !== undefined) dataToUpdate.sellingPrice = parseFloat(updateData.sellingPrice);
    if (updateData.stock !== undefined) dataToUpdate.stock = parseInt(updateData.stock) || 0;
    if (updateData.minStock !== undefined) dataToUpdate.minStock = parseInt(updateData.minStock) || 10;
    if (updateData.maxStock !== undefined) dataToUpdate.maxStock = updateData.maxStock ? parseInt(updateData.maxStock) : null;
    if (updateData.status) dataToUpdate.status = updateData.status;
    if (updateData.barcode !== undefined) dataToUpdate.barcode = updateData.barcode || null;
    if (updateData.location !== undefined) dataToUpdate.location = updateData.location || null;
    if (updateData.weight !== undefined) dataToUpdate.weight = updateData.weight ? parseFloat(updateData.weight) : null;
    if (updateData.dimensions !== undefined) dataToUpdate.dimensions = updateData.dimensions || null;
    if (updateData.tags !== undefined) dataToUpdate.tags = Array.isArray(updateData.tags) ? updateData.tags : [updateData.tags];
    if (updateData.imageUrl !== undefined) dataToUpdate.imageUrl = updateData.imageUrl || null;
    if (updateData.categoryId !== undefined) dataToUpdate.categoryId = updateData.categoryId || null;

    const product = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
      include: {
        category: true
      }
    });

    res.json({
      success: true,
      data: product
    });
  } catch (error: any) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando producto',
      details: error.message
    });
  }
});

// Eliminar producto (marcar como inactivo)
app.delete('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar si el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { status: 'INACTIVE' },
      include: {
        category: true
      }
    });

    res.json({
      success: true,
      data: product,
      message: 'Producto marcado como inactivo'
    });
  } catch (error: any) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando producto'
    });
  }
});

// ===== CATEGORÍAS =====

// Obtener categorías
app.get('/api/categories', async (req: Request, res: Response) => {
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
      error: 'Error obteniendo categorías'
    });
  }
});

// Generar código de 3 letras para categoría
function generateCategoryCode(name: string): string {
  const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (cleanName.length >= 3) {
    return cleanName.substring(0, 3);
  }
  // Si el nombre es muy corto, rellenar con 'X'
  return (cleanName + 'XXX').substring(0, 3);
}

// Crear categoría
app.post('/api/categories', async (req: Request, res: Response) => {
  try {
    const { name, description, parentId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la categoría es requerido'
      });
    }

    // Verificar si ya existe una categoría con el mismo nombre en el mismo nivel
    const existingCategory = await prisma.category.findFirst({
      where: {
        name,
        parentId: parentId || null
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una categoría con este nombre en este nivel'
      });
    }

    // Calcular el nivel y path si hay padre
    let level = 0;
    let path = name;
    let categoryCode = null;
    
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId }
      });
      
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          error: 'Categoría padre no encontrada'
        });
      }
      
      level = parentCategory.level + 1;
      path = parentCategory.path ? `${parentCategory.path}/${name}` : name;
      // Las subcategorías heredan el código de la categoría padre
      categoryCode = parentCategory.code;
    } else {
      // Solo las categorías principales (level 0) generan código
      categoryCode = generateCategoryCode(name);
      
      // Verificar que el código no exista
      let counter = 0;
      let finalCode = categoryCode;
      while (counter < 100) {
        const existing = await prisma.category.findFirst({
          where: { code: finalCode, level: 0 }
        });
        if (!existing) break;
        counter++;
        finalCode = categoryCode.substring(0, 2) + counter.toString().padStart(1, '0');
      }
      categoryCode = finalCode;
    }

    const category = await prisma.category.create({
      data: {
        name,
        description: description || null,
        code: categoryCode,
        parentId: parentId || null,
        level,
        path
      }
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error: any) {
    console.error('Error creando categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando categoría'
    });
  }
});

// Actualizar categoría
app.put('/api/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    // Si se cambió el nombre, verificar que no exista otra categoría con el mismo nombre en el mismo nivel
    if (name && name !== existingCategory.name) {
      const nameExists = await prisma.category.findFirst({
        where: {
          name,
          parentId: existingCategory.parentId,
          id: { not: id }
        }
      });

      if (nameExists) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe una categoría con este nombre en este nivel'
        });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name || existingCategory.name,
        description: description !== undefined ? description : existingCategory.description,
        isActive: isActive !== undefined ? isActive : existingCategory.isActive
      }
    });

    res.json({
      success: true,
      data: category
    });
  } catch (error: any) {
    console.error('Error actualizando categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando categoría'
    });
  }
});

// Eliminar categoría (marcar como inactiva)
app.delete('/api/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        products: true,
        children: true
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    // Verificar si tiene productos o subcategorías
    if (existingCategory.products.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una categoría que tiene productos asociados'
      });
    }

    if (existingCategory.children.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una categoría que tiene subcategorías'
      });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      data: category,
      message: 'Categoría marcada como inactiva'
    });
  } catch (error: any) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando categoría'
    });
  }
});

// ===== MARCAS =====

// Obtener marcas (desde productos existentes ya que no hay modelo Brand)
app.get('/api/brands', async (req: Request, res: Response) => {
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
      error: 'Error obteniendo marcas'
    });
  }
});

// ===== CLIENTES =====

// Obtener clientes
app.get('/api/customers', async (req: Request, res: Response) => {
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
      error: 'Error obteniendo clientes'
    });
  }
});

// ===== DASHBOARD =====

// Estadísticas del dashboard
app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
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
                lte: 10 // Productos con stock bajo
              }
            }
          ]
        }
      }),
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
        lowStockProducts,
        inventoryCost: Number(inventoryValue._sum.costPrice) || 0,
        inventorySale: Number(inventoryValue._sum.salePrice) || 0,
        totalInventoryItems: Number(inventoryValue._sum.stock) || 0,
        monthlyRevenue: 0, // Temporal
        totalSales: 0 // Temporal
      }
    });
  } catch (error: any) {
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
