#!/usr/bin/env node

/**
 * Script de Auditoría de Base de Datos - BikeShop ERP
 * Este script revisa y documenta el estado actual de la base de datos
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function auditDatabase() {
  console.log('🔍 === AUDITORÍA DE BASE DE DATOS BIKESHOP ERP ===');
  console.log(`📅 Fecha: ${new Date().toLocaleDateString()}`);
  console.log(`⏰ Hora: ${new Date().toLocaleTimeString()}`);
  console.log('');

  try {
    // 1. Auditar Usuarios
    console.log('👥 === USUARIOS ===');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        isActive: true
      }
    });
    console.log(`Total usuarios: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} | ${user.firstName} ${user.lastName} | Rol: ${user.role} | Activo: ${user.isActive}`);
    });
    console.log('');

    // 2. Auditar Categorías
    console.log('📂 === CATEGORÍAS ===');
    const categories = await prisma.category.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        level: true,
        parentId: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            children: true
          }
        }
      }
    });
    console.log(`Total categorías: ${categories.length}`);
    categories.forEach((cat, index) => {
      const indent = '  '.repeat(cat.level || 0);
      console.log(`${index + 1}. ${indent}[${cat.code}] ${cat.name} | Productos: ${cat._count.products} | Subcategorías: ${cat._count.children} | Activa: ${cat.isActive}`);
    });
    console.log('');

    // 3. Auditar Marcas
    console.log('🏷️ === MARCAS ===');
    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });
    console.log(`Total marcas: ${brands.length}`);
    brands.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.name} | Productos: ${brand._count.products}`);
    });
    console.log('');

    // 4. Auditar Productos
    console.log('📦 === PRODUCTOS ===');
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: {
            name: true,
            code: true
          }
        },
        brand: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Total productos: ${products.length}`);
    
    let totalStockValue = 0;
    let lowStockProducts = 0;
    
    products.forEach((product, index) => {
      const stockValue = product.salePrice * product.stock;
      totalStockValue += stockValue;
      
      if (product.stock <= product.minStock) {
        lowStockProducts++;
      }
      
      console.log(`${index + 1}. SKU: ${product.sku}`);
      console.log(`   Nombre: ${product.name}`);
      console.log(`   Categoría: ${product.category?.name || 'Sin categoría'} [${product.category?.code || 'N/A'}]`);
      console.log(`   Marca: ${product.brand?.name || 'Sin marca'}`);
      console.log(`   Stock: ${product.stock} | Min: ${product.minStock} | Max: ${product.maxStock || 'N/A'}`);
      console.log(`   Precio Costo: $${product.costPrice} | Precio Venta: $${product.salePrice}`);
      console.log(`   Valor Stock: $${stockValue.toLocaleString()}`);
      console.log(`   Estado: ${product.status}`);
      console.log(`   Creado: ${product.createdAt.toLocaleDateString()}`);
      console.log(`   Imágenes: ${product.images?.length || 0}`);
      console.log(`   Código Barras: ${product.barcode || 'N/A'}`);
      console.log('');
    });

    // 5. Resumen Estadístico
    console.log('📊 === RESUMEN ESTADÍSTICO ===');
    console.log(`💰 Valor total del inventario: $${totalStockValue.toLocaleString()}`);
    console.log(`⚠️ Productos con stock bajo: ${lowStockProducts}`);
    console.log(`✅ Productos con stock saludable: ${products.length - lowStockProducts}`);
    
    const activeProducts = products.filter(p => p.status === 'ACTIVE').length;
    const inactiveProducts = products.filter(p => p.status === 'INACTIVE').length;
    const discontinuedProducts = products.filter(p => p.status === 'DISCONTINUED').length;
    
    console.log(`🟢 Productos activos: ${activeProducts}`);
    console.log(`🟡 Productos inactivos: ${inactiveProducts}`);
    console.log(`🔴 Productos descontinuados: ${discontinuedProducts}`);
    
    // Promedio de precios
    const avgCostPrice = products.reduce((sum, p) => sum + p.costPrice, 0) / products.length;
    const avgSalePrice = products.reduce((sum, p) => sum + p.salePrice, 0) / products.length;
    const avgMargin = ((avgSalePrice - avgCostPrice) / avgCostPrice) * 100;
    
    console.log(`💵 Precio promedio de costo: $${avgCostPrice.toFixed(2)}`);
    console.log(`💰 Precio promedio de venta: $${avgSalePrice.toFixed(2)}`);
    console.log(`📈 Margen promedio: ${avgMargin.toFixed(2)}%`);
    console.log('');

    // 6. Verificaciones de Integridad
    console.log('🔍 === VERIFICACIONES DE INTEGRIDAD ===');
    
    // Productos sin categoría
    const productsWithoutCategory = products.filter(p => !p.categoryId);
    console.log(`⚠️ Productos sin categoría: ${productsWithoutCategory.length}`);
    
    // Productos sin marca
    const productsWithoutBrand = products.filter(p => !p.brandId);
    console.log(`⚠️ Productos sin marca: ${productsWithoutBrand.length}`);
    
    // SKUs duplicados
    const skus = products.map(p => p.sku);
    const duplicateSKUs = skus.filter((sku, index) => skus.indexOf(sku) !== index);
    console.log(`⚠️ SKUs duplicados: ${duplicateSKUs.length}`);
    if (duplicateSKUs.length > 0) {
      console.log(`   SKUs: ${duplicateSKUs.join(', ')}`);
    }
    
    // Códigos de barras duplicados
    const barcodes = products.map(p => p.barcode).filter(Boolean);
    const duplicateBarcodes = barcodes.filter((barcode, index) => barcodes.indexOf(barcode) !== index);
    console.log(`⚠️ Códigos de barras duplicados: ${duplicateBarcodes.length}`);
    if (duplicateBarcodes.length > 0) {
      console.log(`   Códigos: ${duplicateBarcodes.join(', ')}`);
    }
    
    console.log('');
    console.log('✅ === AUDITORÍA COMPLETADA ===');

  } catch (error) {
    console.error('❌ Error durante la auditoría:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  auditDatabase().catch(console.error);
}

module.exports = { auditDatabase };
