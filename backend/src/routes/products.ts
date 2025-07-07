import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult, query } from 'express-validator';

const router = express.Router();
const prisma = new PrismaClient();

// Obtener todos los productos con filtros
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  query('search').optional().isString(),
  query('category').optional().isString(),
  query('brand').optional().isString(),
  query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'DISCONTINUED'])
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Parámetros inválidos',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const category = req.query.category;
    const brand = req.query.brand;
    const status = req.query.status;

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = { name: category };
    }

    if (brand) {
      where.brand = { name: brand };
    }

    if (status) {
      where.status = status;
    }

    // Obtener productos
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los productos'
    });
  }
});

// Obtener producto por ID
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true
      }
    });

    if (!product) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        message: 'El producto solicitado no existe'
      });
    }

    res.json(product);
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el producto'
    });
  }
});

// Crear nuevo producto
router.post('/', [
  body('sku').notEmpty().withMessage('SKU es requerido'),
  body('name').notEmpty().withMessage('Nombre es requerido'),
  body('categoryId').notEmpty().withMessage('Categoría es requerida'),
  body('brandId').notEmpty().withMessage('Marca es requerida'),
  body('costPrice').isFloat({ min: 0 }).withMessage('Precio de costo debe ser positivo'),
  body('salePrice').isFloat({ min: 0 }).withMessage('Precio de venta debe ser positivo'),
  body('stock').isInt({ min: 0 }).withMessage('Stock debe ser un número entero positivo'),
  body('minStock').isInt({ min: 0 }).withMessage('Stock mínimo debe ser un número entero positivo')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: errors.array()
      });
    }

    const productData = req.body;

    // Verificar que la categoría y marca existen
    const [category, brand] = await Promise.all([
      prisma.category.findUnique({ where: { id: productData.categoryId } }),
      prisma.brand.findUnique({ where: { id: productData.brandId } })
    ]);

    if (!category) {
      return res.status(400).json({
        error: 'Categoría inválida',
        message: 'La categoría especificada no existe'
      });
    }

    if (!brand) {
      return res.status(400).json({
        error: 'Marca inválida',
        message: 'La marca especificada no existe'
      });
    }

    const product = await prisma.product.create({
      data: productData,
      include: {
        category: true,
        brand: true
      }
    });

    res.status(201).json({
      message: 'Producto creado exitosamente',
      product
    });
  } catch (error: any) {
    console.error('Error creando producto:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'SKU duplicado',
        message: 'Ya existe un producto con ese SKU'
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear el producto'
    });
  }
});

// Actualizar producto
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Precio de costo debe ser positivo'),
  body('salePrice').optional().isFloat({ min: 0 }).withMessage('Precio de venta debe ser positivo'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock debe ser un número entero positivo'),
  body('minStock').optional().isInt({ min: 0 }).withMessage('Stock mínimo debe ser un número entero positivo')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        brand: true
      }
    });

    res.json({
      message: 'Producto actualizado exitosamente',
      product
    });
  } catch (error: any) {
    console.error('Error actualizando producto:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Producto no encontrado',
        message: 'El producto especificado no existe'
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo actualizar el producto'
    });
  }
});

// Eliminar producto
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id }
    });

    res.json({
      message: 'Producto eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error eliminando producto:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Producto no encontrado',
        message: 'El producto especificado no existe'
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo eliminar el producto'
    });
  }
});

// Buscar productos por código de barras
router.get('/barcode/:barcode', async (req: any, res: any) => {
  try {
    const { barcode } = req.params;

    const product = await prisma.product.findUnique({
      where: { barcode },
      include: {
        category: true,
        brand: true
      }
    });

    if (!product) {
      return res.status(404).json({
        error: 'Producto no encontrado',
        message: 'No se encontró ningún producto con ese código de barras'
      });
    }

    res.json(product);
  } catch (error) {
    console.error('Error buscando por código de barras:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo buscar el producto'
    });
  }
});

export default router;
