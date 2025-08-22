import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/inventory/filters - Get dynamic filters for inventory (mejorado)
router.get('/filters', async (req, res) => {
  try {
    const { categoryId } = req.query;

    // Filtro base para atributos
    let attributeFilter: any = { isActive: true };
    
    // Si se especifica categoría, filtrar atributos por categoría
    if (categoryId) {
      attributeFilter = {
        ...attributeFilter,
        categoryAttributes: {
          some: {
            categoryId: String(categoryId)
          }
        }
      };
    }

    // Get all active attributes (filtrados por categoría si se especifica)
    const attributes = await prisma.attribute.findMany({
      where: attributeFilter,
      orderBy: { name: 'asc' },
      include: {
        categoryAttributes: {
          include: { category: { select: { id: true, name: true } } }
        }
      }
    });

    // Get unique values for each attribute from products
    const attributesWithValues = await Promise.all(
      attributes.map(async (attr) => {
        // Construir filtro para valores de productos
        let productFilter: any = { attributeId: attr.id };
        
        // Si hay filtro de categoría, solo valores de productos de esa categoría
        if (categoryId) {
          productFilter = {
            ...productFilter,
            product: {
              categoryId: String(categoryId)
            }
          };
        }

        const values = await prisma.productAttributeValue.findMany({
          where: productFilter,
          select: { value: true },
          distinct: ['value'],
          orderBy: { value: 'asc' }
        });

        // Procesar valores según el tipo de atributo
        let processedValues: any = values.map(v => v.value).filter(Boolean);
        
        if (attr.type === 'NUMBER') {
          // Para números, calcular min, max y crear rangos sugeridos
          const numValues = processedValues.map((v: string) => parseFloat(v)).filter((n: number) => !isNaN(n));
          if (numValues.length > 0) {
            const min = Math.min(...numValues);
            const max = Math.max(...numValues);
            const step = (max - min) / 10; // 10 rangos sugeridos
            
            processedValues = {
              min,
              max,
              step,
              suggested_ranges: Array.from({ length: 10 }, (_, i) => ({
                from: min + (step * i),
                to: min + (step * (i + 1)),
                label: `${(min + step * i).toFixed(1)} - ${(min + step * (i + 1)).toFixed(1)}`
              }))
            };
          }
        }

        return {
          id: attr.id,
          name: attr.name,
          type: attr.type,
          unit: attr.unit,
          helpText: attr.helpText,
          isGlobal: attr.isGlobal,
          options: attr.options, // Para atributos tipo LIST
          regex: attr.regex, // Para validación de STRING
          minValue: attr.minValue,
          maxValue: attr.maxValue,
          categories: attr.categoryAttributes.map(ca => ({
            id: ca.categoryId,
            name: ca.category.name,
            isRequired: ca.isRequired
          })),
          values: processedValues,
          valueCount: Array.isArray(processedValues) ? processedValues.length : 
                     (typeof processedValues === 'object' && processedValues.min !== undefined ? 'range' : 0)
        };
      })
    );

    // Obtener categorías disponibles para filtrado
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, level: true },
      orderBy: [{ level: 'asc' }, { name: 'asc' }]
    });

    // Obtener marcas disponibles
    const brands = await prisma.brand.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    // Obtener rangos de precios
    const priceRange = await prisma.product.aggregate({
      _min: { salePrice: true, costPrice: true },
      _max: { salePrice: true, costPrice: true }
    });

    res.json({
      success: true,
      categoryId: categoryId || null,
      filters: {
        attributes: attributesWithValues,
        categories: categories,
        brands: brands,
        priceRange: {
          sale: {
            min: priceRange._min.salePrice || 0,
            max: priceRange._max.salePrice || 0
          },
          cost: {
            min: priceRange._min.costPrice || 0,
            max: priceRange._max.costPrice || 0
          }
        }
      },
      meta: {
        attributeCount: attributesWithValues.length,
        categoryCount: categories.length,
        brandCount: brands.length,
        hasNumericAttributes: attributesWithValues.some(a => a.type === 'NUMBER'),
        hasListAttributes: attributesWithValues.some(a => a.type === 'LIST')
      }
    });
  } catch (error) {
    console.error('Error fetching inventory filters:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener filtros'
    });
  }
});

// GET /api/inventory/search - Search inventory with dynamic filters
router.get('/search', async (req, res) => {
  try {
    const { 
      category, 
      brand, 
      minPrice, 
      maxPrice,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;
    
    // Extract dynamic attribute filters (keys that start with 'attr_')
    const attributeFilters = Object.keys(req.query)
      .filter(key => key.startsWith('attr_'))
      .reduce((acc: Record<string, any>, key) => {
        // Extract attributeId from the key (attr_123 => 123)
        const attributeId = key.replace('attr_', '');
        acc[attributeId] = req.query[key];
        return acc;
      }, {});

    // Build where clause
    const where: any = {
      status: status ? String(status) : 'ACTIVE'
    };

    if (category) {
      where.categoryId = String(category);
    }

    if (brand) {
      where.brand = String(brand);
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { sku: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (minPrice) {
      where.salePrice = { ...where.salePrice, gte: parseFloat(String(minPrice)) };
    }

    if (maxPrice) {
      where.salePrice = { ...where.salePrice, lte: parseFloat(String(maxPrice)) };
    }

    // Apply attribute filters (mejorado para soportar rangos y múltiples valores)
    if (Object.keys(attributeFilters).length > 0) {
      const attributeConditions = Object.entries(attributeFilters).map(([attributeId, filterValue]) => {
        const value = String(filterValue);
        
        // Soporte para rangos numéricos: attr_123=10-50
        if (value.includes('-') && !value.startsWith('-')) {
          const [min, max] = value.split('-').map(v => parseFloat(v.trim()));
          if (!isNaN(min) && !isNaN(max)) {
            return {
              attributeId,
              AND: [
                { value: { gte: min.toString() } },
                { value: { lte: max.toString() } }
              ]
            };
          }
        }
        
        // Soporte para múltiples valores: attr_123=rojo,azul,verde
        if (value.includes(',')) {
          const values = value.split(',').map(v => v.trim());
          return {
            attributeId,
            value: { in: values }
          };
        }
        
        // Filtro simple de igualdad
        return {
          attributeId,
          value: { equals: value, mode: 'insensitive' }
        };
      });

      // Para filtrar productos que tengan TODOS los atributos especificados
      where.AND = attributeConditions.map(condition => ({
        attributeValues: {
          some: condition
        }
      }));
    }

    // Count total results for pagination
    const total = await prisma.product.count({ where });
    
    // Get paginated results with sorting
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        attributeValues: {
          include: {
            attribute: true
          }
        }
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit)
    });

    // Format response
    const formattedProducts = products.map(product => ({
      ...product,
      attributes: product.attributeValues.map(av => ({
        id: av.attributeId,
        name: av.attribute.name,
        value: av.value,
        type: av.attribute.type,
        unit: av.attribute.unit
      }))
    }));

    res.json({
      success: true,
      products: formattedProducts,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error searching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al buscar productos'
    });
  }
});

export default router;
