-- Optimización de índices para mejorar rendimiento de queries
-- FASE 2.4: Optimizar Queries de Base de Datos

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_product_category ON products(categoryId);
CREATE INDEX IF NOT EXISTS idx_product_attributes ON product_attribute_values(productId, attributeId);
CREATE INDEX IF NOT EXISTS idx_product_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_product_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_product_sale_price ON products(salePrice);
CREATE INDEX IF NOT EXISTS idx_product_cost_price ON products(costPrice);
CREATE INDEX IF NOT EXISTS idx_product_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_product_brand ON products(brandId);

-- Índices para categorías
CREATE INDEX IF NOT EXISTS idx_category_attributes ON category_attributes(categoryId, attributeId);
CREATE INDEX IF NOT EXISTS idx_category_parent ON categories(parentId);
CREATE INDEX IF NOT EXISTS idx_category_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_category_active ON categories(isActive);

-- Índices para atributos
CREATE INDEX IF NOT EXISTS idx_attribute_type ON attributes(type);
CREATE INDEX IF NOT EXISTS idx_attribute_active ON attributes(isActive);
CREATE INDEX IF NOT EXISTS idx_attribute_global ON attributes(isGlobal);

-- Índices para valores de atributos de productos
CREATE INDEX IF NOT EXISTS idx_product_attr_value ON product_attribute_values(value);
CREATE INDEX IF NOT EXISTS idx_product_attr_combined ON product_attribute_values(productId, attributeId, value);

-- Índices para búsquedas de texto
CREATE INDEX IF NOT EXISTS idx_product_name_gin ON products USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_product_description_gin ON products USING gin(to_tsvector('spanish', description));

-- Índices para ventas y movimientos de inventario
CREATE INDEX IF NOT EXISTS idx_sale_date ON sales(saleDate);
CREATE INDEX IF NOT EXISTS idx_sale_customer ON sales(customerId);
CREATE INDEX IF NOT EXISTS idx_inventory_move_date ON inventory_moves(moveDate);
CREATE INDEX IF NOT EXISTS idx_inventory_move_product ON inventory_moves(productId);

-- Índices compuestos para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_product_category_status ON products(categoryId, status);
CREATE INDEX IF NOT EXISTS idx_product_price_range ON products(salePrice, status);
CREATE INDEX IF NOT EXISTS idx_category_attr_required ON category_attributes(categoryId, isRequired);

-- Estadísticas para el optimizador de PostgreSQL
ANALYZE products;
ANALYZE categories;
ANALYZE attributes;
ANALYZE product_attribute_values;
ANALYZE category_attributes;
ANALYZE sales;
ANALYZE inventory_moves;
