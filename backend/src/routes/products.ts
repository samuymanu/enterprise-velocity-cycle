import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bwipjs from 'bwip-js';
import { validateQuery, validateBody, validateParams } from '../middleware/validation';
import { validateUploadedFiles, sanitizeFileNames } from '../middleware/fileValidation';
import { createResourceRateLimit, uploadRateLimit, searchRateLimit } from '../middleware/rateLimiter';
import { 
  createProductSchema, 
  updateProductSchema,
  productQuerySchema,
  idParamSchema
} from '../schemas/validation';

const router = express.Router();
const prisma = new PrismaClient();

// --- Configuración de Multer para subida de imágenes ---

// Crear directorio uploads si no existe
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de almacenamiento de Multer
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
    fileSize: 5 * 1024 * 1024, // 5MB límite para cada archivo
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'images') {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      }
      return cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
    } else if (file.fieldname === 'datasheet') {
      if (file.mimetype === 'application/pdf') {
        return cb(null, true);
      }
      return cb(new Error('Solo se permiten archivos PDF para la ficha técnica.'));
    }
    // Rechazar otros archivos
    cb(new Error('Tipo de archivo no soportado'));
  }
});

// Middleware para manejar los campos de archivo
const uploadFields = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'datasheet', maxCount: 1 }
]);

// --- Fin de Configuración de Multer ---

// Función para generar el siguiente número secuencial para el SKU
async function getNextSequentialNumber(categoryCode: string): Promise<string> {
  const lastProduct = await prisma.product.findFirst({
    where: {
      sku: {
        startsWith: `${categoryCode}-`,
      },
    },
    orderBy: {
      sku: 'desc',
    },
  });

  if (!lastProduct) {
    return '001';
  }

  const lastNumber = parseInt(lastProduct.sku.split('-')[1]) || 0;
  return (lastNumber + 1).toString().padStart(3, '0');
}

// Función para generar un código de 3 letras para la categoría
function generateCategoryCode(name: string): string {
  const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (cleanName.length >= 3) {
    return cleanName.substring(0, 3);
  }
  return (cleanName + 'XXX').substring(0, 3);
}

// Obtener todos los productos con filtros
router.get('/',
  searchRateLimit,
  validateQuery(productQuerySchema),
  async (req: any, res: any) => {
    try {
      const { page = 1, limit = 20, search, category, brand, status } = req.query;

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
        where.brand = { contains: brand, mode: 'insensitive' };
      }

      if (status) {
        where.status = status;
      }

      // Obtener productos
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: true
          },
        orderBy: { id: 'desc' },
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
        category: true
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

// Generar código de barras para un producto
router.get('/:id/barcode', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product || !product.barcode) {
      return res.status(404).json({
        error: 'Producto o código de barras no encontrado',
        message: 'No se pudo encontrar el producto o no tiene un código de barras asignado.'
      });
    }

    // Generar el código de barras como imagen PNG
    const png = await bwipjs.toBuffer({
      bcid: 'code128', // Tipo de código de barras
      text: product.barcode, // El texto a codificar (SKU/barcode)
      scale: 3, // Escala de la imagen
      height: 10, // Altura del código de barras
      includetext: true, // Incluir el texto debajo del código
      textxalign: 'center', // Alineación del texto
    });

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': png.length,
    });
    res.end(png);

  } catch (error) {
    console.error('Error generando código de barras:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo generar el código de barras.'
    });
  }
});

// Crear nuevo producto con SKU y código de barras automáticos
router.post('/', 
  createResourceRateLimit,
  uploadRateLimit,
  uploadFields, // Usar el middleware para procesar imágenes y ficha técnica
  sanitizeFileNames, // Sanitizar nombres de archivos
  validateUploadedFiles, // Validar archivos subidos
  validateBody(createProductSchema),
  async (req: any, res: any) => {
    try {
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
        categoryId,
        metadata // Se recibe como string desde multipart/form-data
      } = req.body;

      // Parsear metadata si existe
      let parsedMetadata = {};
      if (metadata && typeof metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (error) {
          console.error("Error parsing metadata:", error);
          return res.status(400).json({
            success: false,
            error: 'Metadatos inválidos',
            details: 'El formato de los metadatos no es un JSON válido.'
          });
        }
      }


    // Procesar archivos subidos desde req.files (que ahora es un objeto)
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const imagePaths: string[] = files['images']?.map(file => `/uploads/${file.filename}`) || [];
    const datasheetFile = files['datasheet']?.[0];
    const datasheetUrl = datasheetFile ? `/uploads/${datasheetFile.filename}` : null;



    // 1. Obtener la categoría para generar el SKU
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

    // 2. Generar el código de la categoría (usando el padre si es subcategoría)
    let categoryCode = '';
    if (category.level === 0) {
      categoryCode = generateCategoryCode(category.name);
    } else if (category.parent) {
      categoryCode = generateCategoryCode(category.parent.name);
    } else {
      // Fallback por si no tiene padre pero no es nivel 0
      categoryCode = generateCategoryCode(category.name);
    }

    // 3. Generar SKU y código de barras
    const sequentialNumber = await getNextSequentialNumber(categoryCode);
    const generatedSku = `${categoryCode}-${sequentialNumber}`;
    const generatedBarcode = generatedSku; // O una lógica diferente si es necesario

    // 4. Crear el producto en la base de datos
    const newProduct = await prisma.product.create({
      data: {
        name,
        description: description || null,
        brand: brand || null,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        salePrice: parseFloat(salePrice),
        stock: stock ? parseInt(stock) : 0,
        minStock: minStock ? parseInt(minStock) : 0,
        maxStock: maxStock ? parseInt(maxStock) : null,
        status: status || 'ACTIVE',
        sku: generatedSku,
        barcode: generatedBarcode,
        images: imagePaths,
        datasheetUrl,
        metadata: parsedMetadata, // Usar los metadatos parseados
        category: {
          connect: { id: categoryId }
        }
      },
      include: {
        category: true
      }
    });

    // --- DEPURACIÓN: Log de rutas de imágenes y producto creado ---
    console.log('--- DEPURACIÓN CREACIÓN PRODUCTO ---');
    console.log('Imágenes recibidas:', files['images']?.map(f => f.path));
    console.log('Rutas guardadas en DB (images):', imagePaths);
    console.log('Producto creado:', {
      id: newProduct.id,
      name: newProduct.name,
      images: newProduct.images,
      datasheetUrl: newProduct.datasheetUrl
    });
    // --- FIN DEPURACIÓN ---

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: newProduct
    });

  } catch (error: any) {
    console.error('Error creando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudo crear el producto'
    });
  }
});

// Actualizar producto
router.put('/:id', 
  uploadRateLimit,
  uploadFields, // Usar el middleware también para la actualización
  sanitizeFileNames, // Sanitizar nombres de archivos
  validateUploadedFiles, // Validar archivos subidos
  validateBody(updateProductSchema),
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { existingImages, ...bodyData } = req.body;

      // 1. Procesar nuevas imágenes y ficha técnica si se subieron
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const newImagePaths: string[] = files['images']?.map(file => `/uploads/${file.filename}`) || [];
      const datasheetFile = files['datasheet']?.[0];
      const newDatasheetUrl = datasheetFile ? `/uploads/${datasheetFile.filename}` : undefined; // undefined para no sobreescribir si no se sube nueva


    // 2. Combinar imágenes existentes (que se conservan) con las nuevas
    // Siempre obtener un array de strings limpios, sin duplicados ni rutas inválidas
    let finalImages: string[] = [];
    if (req.body.images) {
      if (Array.isArray(req.body.images)) {
        finalImages = req.body.images;
      } else if (typeof req.body.images === 'string') {
        // Si viene como string separado por comas, dividir y limpiar
        finalImages = req.body.images.split(',').map((s: string) => s.trim());
      }
    }
    // Agregar imágenes nuevas subidas (archivos)
    finalImages = [...finalImages, ...newImagePaths];
    // Limpiar: solo rutas relativas válidas, sin vacíos ni duplicados ni strings con varias rutas pegadas
    finalImages = finalImages
      .flatMap((img: string) =>
        typeof img === 'string'
          ? img.split(',').map((s: string) => s.trim())
          : []
      )
      .filter((img: string) => img && img.startsWith('/uploads/') && !img.includes(' '));
    finalImages = Array.from(new Set(finalImages));

    // Log de depuración para ver el array final
    console.log('Imágenes recibidas para update:', req.body.images);
    console.log('Nuevas imágenes subidas:', newImagePaths);
    console.log('Imágenes finales guardadas:', finalImages);

    // 3. Preparar los datos para la actualización, convirtiendo tipos si es necesario
    const updateData: any = { ...bodyData };
    if (updateData.costPrice) updateData.costPrice = parseFloat(updateData.costPrice);
    if (updateData.salePrice) updateData.salePrice = parseFloat(updateData.salePrice);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);
    if (updateData.minStock) updateData.minStock = parseInt(updateData.minStock);
    if (updateData.maxStock) {
      updateData.maxStock = parseInt(updateData.maxStock);
    } else if (updateData.maxStock === '' || updateData.maxStock === null) {
      updateData.maxStock = null;
    }
    
    // Asignar la lista final de imágenes (unificado con create)
    updateData.images = finalImages;

    // Asignar la nueva ficha técnica solo si se subió una
    if (newDatasheetUrl) {
      updateData.datasheetUrl = newDatasheetUrl;
    }

    // Evitar que se actualice el SKU directamente
    if (updateData.sku) {
      delete updateData.sku;
    }

    // Asegurar que la categoría se conecte correctamente
    if (updateData.categoryId) {
      updateData.category = {
        connect: {
          id: parseInt(updateData.categoryId)
        }
      };
      delete updateData.categoryId; // Eliminar para no causar conflicto
    }


    // 4. Actualizar el producto en la base de datos
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true
      }
    });

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: product
    });
  } catch (error: any) {
    console.error('Error actualizando producto:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado',
        message: 'El producto especificado no existe'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudo actualizar el producto'
    });
  }
});

// Eliminar producto (borrado lógico)
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });

    res.json({
      success: true,
      message: 'Producto marcado como inactivo',
      data: product
    });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudo eliminar el producto'
    });
  }
});

export default router;
