import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/inventory/filters - Get dynamic filters for inventory
router.get('/filters', async (req, res) => {
  try {
    // Get all active attributes
    const attributes = await prisma.attribute.findMany({
      where: { isActive: true },
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
        const values = await prisma.productAttributeValue.findMany({
          where: { attributeId: attr.id },
          select: { value: true },
          distinct: ['value']
        });

        return {
          id: attr.id,
          name: attr.name,
          type: attr.type,
          unit: attr.unit,
          categories: attr.categoryAttributes.map(ca => ({
            id: ca.categoryId,
            name: ca.category.name,
            isRequired: ca.isRequired
          })),
          values: values.map(v => v.value).filter(Boolean)
        };
      })
    );

    res.json({
      success: true,
      filters: attributesWithValues
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

    // Apply attribute filters
    if (Object.keys(attributeFilters).length > 0) {
      where.attributeValues = {
        some: {
          OR: Object.entries(attributeFilters).map(([attributeId, value]) => ({
            attributeId,
            value: { equals: String(value), mode: 'insensitive' }
          }))
        }
      };
    }

    // Count total results for pagination
    const total = await prisma.product.count({ where });
    
    // Get paginated results with sorting
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        images: true,
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
