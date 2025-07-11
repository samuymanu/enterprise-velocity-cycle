// ...existing code...
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
import * as xlsx from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';

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
      const { page = 1, limit = 20, search, category, brand, status, ...rest } = req.query;
      const skip = (page - 1) * limit;

      // Filtros estándar
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

      // Filtros por atributos dinámicos
      const attributeFilters = Object.entries(rest)
        .filter(([key]) => key.startsWith('attribute_'))
        .map(([key, value]) => ({ attributeId: key.replace('attribute_', ''), value }));

      let products: any[] = [];
      let total = 0;

      if (attributeFilters.length === 0) {
        // Sin filtros dinámicos: consulta normal
        [products, total] = await Promise.all([
          prisma.product.findMany({
            where,
            include: { category: true },
            orderBy: { id: 'desc' },
            skip,
            take: limit
          }),
          prisma.product.count({ where })
        ]);
      } else {
        // Con filtros dinámicos: buscar productos que tengan TODOS los atributos requeridos
        // 1. Buscar los productId que cumplen todos los atributos
        const productIds = await prisma.productAttributeValue.findMany({
          where: {
            OR: attributeFilters.map(f => ({ attributeId: f.attributeId, value: String(f.value) }))
          },
          select: { productId: true, attributeId: true }
        });
        // Contar ocurrencias por productId
        const countByProduct: Record<string, number> = {};
        for (const row of productIds) {
          countByProduct[row.productId] = (countByProduct[row.productId] || 0) + 1;
        }
        // Solo los que cumplen todos los atributos
        const filteredProductIds = Object.entries(countByProduct)
          .filter(([_, count]) => count === attributeFilters.length)
          .map(([productId]) => productId);

        // 2. Buscar productos finales
        [products, total] = await Promise.all([
          prisma.product.findMany({
            where: {
              ...where,
              id: { in: filteredProductIds }
            },
            include: { category: true },
            orderBy: { id: 'desc' },
            skip,
            take: limit
          }),
          prisma.product.count({
            where: {
              ...where,
              id: { in: filteredProductIds }
            }
          })
        ]);
      }

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
        metadata, // Se recibe como string desde multipart/form-data
        attributes // Nuevo: array de { attributeId, value }
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

      // 1. Obtener la categoría para generar el SKU y validar atributos
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          categoryAttributes: { include: { attribute: true } },
          parent: true
        }
      }) as any;
      if (!category) {
        return res.status(400).json({ success: false, error: 'Categoría no encontrada' });
      }

      // Validar atributos dinámicos
      let attributesArray: Array<{ attributeId: string, value: string }> = [];
      if (attributes) {
        try {
          attributesArray = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
        } catch (e) {
          return res.status(400).json({ error: 'Formato de atributos inválido' });
        }
      }
      // Validar que los atributos correspondan a la categoría
      const validAttributeIds = (category.categoryAttributes ?? []).map((ca: any) => ca.attributeId);
      const requiredAttributeIds = (category.categoryAttributes ?? []).filter((ca: any) => ca.isRequired).map((ca: any) => ca.attributeId);
      for (const attr of attributesArray) {
        if (!validAttributeIds.includes(attr.attributeId)) {
          return res.status(400).json({ error: `El atributo ${attr.attributeId} no corresponde a la categoría seleccionada` });
        }
      }
      for (const reqAttrId of requiredAttributeIds) {
        if (!attributesArray.some(a => a.attributeId === reqAttrId)) {
          return res.status(400).json({ error: `Falta atributo obligatorio: ${reqAttrId}` });
        }
      }

      // 2. Generar el código de la categoría (usando el padre si es subcategoría)
      let categoryCode = '';
      if (category.level === 0) {
        categoryCode = generateCategoryCode(category.name);
      } else if (category.parent && category.parent.name) {
        categoryCode = generateCategoryCode(category.parent.name);
      } else {
        categoryCode = generateCategoryCode(category.name);
      }

      // 3. Generar SKU y código de barras
      const sequentialNumber = await getNextSequentialNumber(categoryCode);
      const generatedSku = `${categoryCode}-${sequentialNumber}`;
      const generatedBarcode = generatedSku;

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
          metadata: parsedMetadata,
          category: { connect: { id: categoryId } }
        },
        include: { category: true }
      });

      // Guardar atributos dinámicos
      for (const attr of attributesArray) {
        await prisma.productAttributeValue.upsert({
          where: { productId_attributeId: { productId: newProduct.id, attributeId: attr.attributeId } },
          update: { value: String(attr.value) },
          create: { productId: newProduct.id, attributeId: attr.attributeId, value: String(attr.value) }
        });
      }

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
      const { existingImages, attributes, ...bodyData } = req.body;

      // 1. Procesar nuevas imágenes y ficha técnica si se subieron
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const newImagePaths: string[] = files['images']?.map(file => `/uploads/${file.filename}`) || [];
      const datasheetFile = files['datasheet']?.[0];
      const newDatasheetUrl = datasheetFile ? `/uploads/${datasheetFile.filename}` : undefined;

      // 2. Combinar imágenes existentes (que se conservan) con las nuevas
      let finalImages: string[] = [];
      if (req.body.images) {
        if (Array.isArray(req.body.images)) {
          finalImages = req.body.images;
        } else if (typeof req.body.images === 'string') {
          finalImages = req.body.images.split(',').map((s: string) => s.trim());
        }
      }
      finalImages = [...finalImages, ...newImagePaths];
      finalImages = finalImages
        .flatMap((img: string) =>
          typeof img === 'string'
            ? img.split(',').map((s: string) => s.trim())
            : []
        )
        .filter((img: string) => img && img.startsWith('/uploads/') && !img.includes(' '));
      finalImages = Array.from(new Set(finalImages));

      // 3. Preparar los datos para la actualización
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
      updateData.images = finalImages;
      if (newDatasheetUrl) {
        updateData.datasheetUrl = newDatasheetUrl;
      }
      if (updateData.sku) {
        delete updateData.sku;
      }
      if (updateData.categoryId) {
        updateData.category = {
          connect: { id: updateData.categoryId }
        };
        delete updateData.categoryId;
      }

      // Validar y guardar atributos dinámicos
      let attributesArray: Array<{ attributeId: string, value: string }> = [];
      if (attributes) {
        try {
          attributesArray = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
        } catch (e) {
          return res.status(400).json({ error: 'Formato de atributos inválido' });
        }
      }
      // Validar que los atributos correspondan a la categoría
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: {
            include: {
              categoryAttributes: { include: { attribute: true } },
              parent: true
            }
          }
        }
      }) as any;
      if (!product || !product.category) {
        return res.status(404).json({ success: false, error: 'Producto no encontrado' });
      }
      const validAttributeIds = (product.category.categoryAttributes ?? []).map((ca: any) => ca.attributeId);
      for (const attr of attributesArray) {
        if (!validAttributeIds.includes(attr.attributeId)) {
          return res.status(400).json({ error: `El atributo ${attr.attributeId} no corresponde a la categoría del producto` });
        }
      }
      // Guardar atributos dinámicos
      for (const attr of attributesArray) {
        await prisma.productAttributeValue.upsert({
          where: { productId_attributeId: { productId: id, attributeId: attr.attributeId } },
          update: { value: String(attr.value) },
          create: { productId: id, attributeId: attr.attributeId, value: String(attr.value) }
        });
      }

      // 4. Actualizar el producto en la base de datos
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: updateData,
        include: { category: true }
      });

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: updatedProduct
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
// Endpoint de importación masiva de productos (Excel/CSV)
router.post('/import', uploadRateLimit, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo no proporcionado' });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rows: any[] = [];
    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (ext === '.csv') {
      const content = fs.readFileSync(req.file.path, 'utf8');
      rows = csvParse(content, { columns: true, skip_empty_lines: true });
    } else {
      return res.status(400).json({ error: 'Formato de archivo no soportado. Usa .xlsx, .xls o .csv' });
    }

    const results: any[] = [];
    for (const [i, row] of rows.entries()) {
      try {
        // Extraer datos básicos y atributos dinámicos
        const { sku, name, description, brand, costPrice, salePrice, stock, minStock, maxStock, status, categoryId, ...attrCols } = row;
        if (!name || !categoryId || !salePrice) {
          throw new Error('Faltan campos obligatorios (name, categoryId, salePrice)');
        }
        // Validar categoría y atributos
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        include: { categoryAttributes: { include: { attribute: true } }, parent: true }
        });
        if (!category) throw new Error('Categoría no encontrada');
        const validAttributeIds = (category.categoryAttributes ?? []).map((ca: any) => ca.attributeId);
        const attributesArray = Object.entries(attrCols)
          .filter(([key]) => validAttributeIds.includes(key))
          .map(([attributeId, value]) => ({ attributeId, value }));
        // Crear o actualizar producto por SKU
        let product = null;
        if (sku) {
          product = await prisma.product.upsert({
            where: { sku },
            update: {
              name, description, brand, costPrice: costPrice ? parseFloat(costPrice) : undefined,
              salePrice: parseFloat(salePrice), stock: stock ? parseInt(stock) : 0,
              minStock: minStock ? parseInt(minStock) : 0, maxStock: maxStock ? parseInt(maxStock) : null,
              status: status || 'ACTIVE', category: { connect: { id: categoryId } }
            },
            create: {
              sku, name, description, brand, costPrice: costPrice ? parseFloat(costPrice) : undefined,
              salePrice: parseFloat(salePrice), stock: stock ? parseInt(stock) : 0,
              minStock: minStock ? parseInt(minStock) : 0, maxStock: maxStock ? parseInt(maxStock) : null,
              status: status || 'ACTIVE', category: { connect: { id: categoryId } }
            },
            include: { category: true }
          });
        } else {
          // Si no hay SKU, crear uno automático
          const categoryCode = generateCategoryCode(category.name);
          const sequentialNumber = await getNextSequentialNumber(categoryCode);
          const generatedSku = `${categoryCode}-${sequentialNumber}`;
          product = await prisma.product.create({
            data: {
              sku: generatedSku, name, description, brand, costPrice: costPrice ? parseFloat(costPrice) : undefined,
              salePrice: parseFloat(salePrice), stock: stock ? parseInt(stock) : 0,
              minStock: minStock ? parseInt(minStock) : 0, maxStock: maxStock ? parseInt(maxStock) : null,
              status: status || 'ACTIVE', category: { connect: { id: categoryId } }
            },
            include: { category: true }
          });
        }
        // Guardar atributos dinámicos
        for (const attr of attributesArray) {
          await prisma.productAttributeValue.upsert({
            where: { productId_attributeId: { productId: product.id, attributeId: attr.attributeId } },
            update: { value: String(attr.value) },
            create: { productId: product.id, attributeId: attr.attributeId, value: String(attr.value) }
          });
        }
        results.push({ row: i + 1, sku: product.sku, status: 'ok' });
      } catch (err: any) {
        results.push({ row: i + 1, error: err.message });
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error en importación masiva:', error);
    res.status(500).json({ error: 'Error interno en importación masiva' });
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

// Obtener atributos y valores posibles para filtros dinámicos por categoría
router.get('/attributes', async (req, res) => {
  try {
    const { categoryId } = req.query;
    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId es requerido' });
    }

    // 1. Obtener los atributos de la categoría
    const categoryAttributes = await prisma.categoryAttribute.findMany({
      where: { categoryId: String(categoryId) },
      include: { attribute: true }
    });

    // 2. Para cada atributo, obtener los valores distintos usados en productos de esa categoría
    const attributesWithValues = await Promise.all(
      (categoryAttributes as any[]).map(async (catAttr) => {
        const values = await prisma.productAttributeValue.findMany({
          where: {
            attributeId: catAttr.attributeId,
            product: { categoryId: String(categoryId) }
          },
          select: { value: true },
          distinct: ['value']
        });
        return {
          attributeId: catAttr.attributeId,
          name: catAttr.attribute.name,
          type: catAttr.attribute.type,
          isRequired: catAttr.isRequired,
          values: (values as any[]).map((v: any) => v.value)
        };
      })
    );

    res.json({
      categoryId,
      attributes: attributesWithValues
    });
  } catch (error) {
    console.error('Error obteniendo atributos de categoría:', error);
    res.status(500).json({ error: 'Error interno al obtener atributos' });
  }
});

export default router;