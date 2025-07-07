import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult, query } from 'express-validator';
import multer from 'multer';
import path from 'path';

// Configuración de Multer para almacenamiento de imágenes
const storage = multer.diskStorage({
  destination: function (req: any, file: any, cb: any) {
    cb(null, 'uploads/')
  },
  filename: function (req: any, file: any, cb: any) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

const router = express.Router();
const prisma = new PrismaClient();

// Obtener todos los productos con filtros
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  query('search').optional().isString(),
  query('categoryId').optional().isString(),
  query('brandId').optional().isString(),
  query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'DISCONTINUED'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Parámetros inválidos',
        details: errors.array()
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const categoryId = req.query.categoryId as string;
    const brandId = req.query.brandId as string;
    const status = req.query.status as string;

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

    if (categoryId) {
      // Primero, encontrar todas las categorías hijas de la categoría seleccionada
      const childCategories = await prisma.category.findMany({
        where: { parentId: categoryId },
        select: { id: true },
      });
      const categoryIds = [categoryId, ...childCategories.map(c => c.id)];

      where.categoryId = { in: categoryIds };
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (status) {
      where.status = status;
    }

    // Obtener productos
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            include: {
              parent: true,
            },
          },
          brand: true,
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

// Endpoint para subir imágenes de productos
router.post('/upload', upload.single('image') as any, (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo.' });
  }
  // Construye la URL completa de la imagen
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Obtener producto por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        brand: true,
      },
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
  body('minStock').isInt({ min: 0 }).withMessage('Stock mínimo debe ser un número entero positivo'),
  body('imageUrl').optional({ checkFalsy: true }).isURL().withMessage('URL de imagen inválida')
], async (req: Request, res: Response) => {
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
  body('minStock').optional().isInt({ min: 0 }).withMessage('Stock mínimo debe ser un número entero positivo'),
  body('imageUrl').optional({ checkFalsy: true }).isURL().withMessage('URL de imagen inválida'),
  body('categoryId').optional().isString().withMessage('El ID de la categoría debe ser un string'),
  body('brandId').optional().isString().withMessage('El ID de la marca debe ser un string')
], async (req: Request, res: Response) => {
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

    // Si se proporciona categoryId o brandId, verificar que existen
    if (updateData.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: updateData.categoryId } });
      if (!category) {
        return res.status(400).json({ error: 'La categoría especificada no existe' });
      }
    }
    if (updateData.brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: updateData.brandId } });
      if (!brand) {
        return res.status(400).json({ error: 'La marca especificada no existe' });
      }
    }

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
router.delete('/:id', async (req: Request, res: Response) => {
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
router.get('/barcode/:barcode', async (req: Request, res: Response) => {
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
