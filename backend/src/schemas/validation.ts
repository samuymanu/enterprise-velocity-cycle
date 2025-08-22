import { z } from 'zod';

// ===== SCHEMAS DE AUTENTICACIÓN =====

export const loginSchema = z.object({
  identifier: z.string()
    .min(1, 'Email o username es requerido')
    .max(100, 'Identificador demasiado largo'),
  password: z.string()
    .min(1, 'Password es requerido')
    .max(100, 'Password demasiado largo')
});

export const registerSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(100, 'Email demasiado largo'),
  username: z.string()
    .min(3, 'Username debe tener al menos 3 caracteres')
    .max(50, 'Username demasiado largo')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username solo puede contener letras, números y guiones bajos'),
  password: z.string()
    .min(8, 'Password debe tener al menos 8 caracteres')
    .max(100, 'Password demasiado largo')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password debe tener al menos una mayúscula, una minúscula y un número'),
  firstName: z.string()
    .min(1, 'Nombre es requerido')
    .max(50, 'Nombre demasiado largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Nombre solo puede contener letras'),
  lastName: z.string()
    .min(1, 'Apellido es requerido')
    .max(50, 'Apellido demasiado largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Apellido solo puede contener letras'),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'TECHNICIAN', 'CASHIER'])
});

export const authHeaderSchema = z.object({
  authorization: z.string()
    .min(1, 'Token de autorización requerido')
    .startsWith('Bearer ', 'Token debe empezar con "Bearer "')
});

// ===== SCHEMAS DE PRODUCTOS =====

export const createProductSchema = z.object({
  name: z.string()
    .min(1, 'Nombre es requerido')
    .max(100, 'Nombre demasiado largo')
    .trim(),
  description: z.string()
    .max(500, 'Descripción demasiado larga')
    .optional(),
  brand: z.string()
    .max(50, 'Marca demasiado larga')
    .optional(),
  categoryId: z.string()
    .cuid('ID de categoría inválido'),
  costPrice: z.union([
    z.number(),
    z.string().transform(val => parseFloat(val))
  ])
    .pipe(z.number().min(0, 'Precio de costo debe ser positivo').max(999999.99, 'Precio de costo demasiado alto')),
  salePrice: z.union([
    z.number(),
    z.string().transform(val => parseFloat(val))
  ])
    .pipe(z.number().min(0, 'Precio de venta debe ser positivo').max(999999.99, 'Precio de venta demasiado alto')),
  stock: z.union([
    z.number(),
    z.string().transform(val => parseInt(val, 10))
  ])
    .pipe(z.number().int('Stock debe ser un número entero').min(0, 'Stock no puede ser negativo').max(999999, 'Stock demasiado alto'))
    .optional()
    .default(0),
  minStock: z.union([
    z.number(),
    z.string().transform(val => parseInt(val, 10))
  ])
    .pipe(z.number().int('Stock mínimo debe ser un número entero').min(0, 'Stock mínimo no puede ser negativo').max(999999, 'Stock mínimo demasiado alto'))
    .optional()
    .default(10),
  maxStock: z.union([
    z.number(),
    z.string().transform(val => parseInt(val, 10))
  ])
    .pipe(z.number().int('Stock máximo debe ser un número entero').min(0, 'Stock máximo no puede ser negativo').max(999999, 'Stock máximo demasiado alto'))
    .optional(),
  barcode: z.string()
    .max(50, 'Código de barras demasiado largo')
    .optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED'])
    .optional()
    .default('ACTIVE'),
  tags: z.array(z.string().max(30))
    .max(10, 'Máximo 10 tags permitidos')
    .optional(),
  metadata: z.record(z.string(), z.any())
    .optional()
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1, 'Página debe ser mayor a 0'))
    .optional()
    .default(1),
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100, 'Límite máximo 100'))
    .optional()
    .default(20),
  search: z.string()
    .max(100, 'Búsqueda demasiado larga')
    .optional(),
  categoryId: z.string()
    .cuid('ID de categoría inválido')
    .optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED'])
    .optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'salePrice', 'stock'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('desc'),
  stockRange_min: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(0, 'Stock mínimo debe ser 0 o mayor'))
    .optional(),
  stockRange_max: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(0, 'Stock máximo debe ser 0 o mayor'))
    .optional(),
  priceRange_min: z.string()
    .transform(val => parseFloat(val))
    .pipe(z.number().min(0, 'Precio mínimo debe ser 0 o mayor'))
    .optional(),
  priceRange_max: z.string()
    .transform(val => parseFloat(val))
    .pipe(z.number().min(0, 'Precio máximo debe ser 0 o mayor'))
    .optional()
});

// ===== SCHEMAS DE CATEGORÍAS =====

export const createCategorySchema = z.object({
  name: z.string()
    .min(1, 'Nombre es requerido')
    .max(50, 'Nombre demasiado largo')
    .trim(),
  description: z.string()
    .max(200, 'Descripción demasiado larga')
    .optional(),
  code: z.string()
    .length(3, 'Código debe tener exactamente 3 caracteres')
    .regex(/^[A-Z]+$/, 'Código debe ser solo letras mayúsculas')
    .optional(),
  parentId: z.string()
    .cuid('ID de categoría padre inválido')
    .optional(),
  level: z.number()
    .int('Nivel debe ser un número entero')
    .min(0, 'Nivel no puede ser negativo')
    .max(5, 'Máximo 5 niveles de categoría')
    .optional()
    .default(0)
});

export const updateCategorySchema = createCategorySchema.partial();

export const createSubcategorySchema = createCategorySchema.extend({
  parentId: z.string()
    .min(1, 'ID de categoría padre es requerido')
    .cuid('ID de categoría padre inválido')
});

// ===== SCHEMAS DE CLIENTES =====

export const createCustomerSchema = z.object({
  documentType: z.enum(['CI', 'RIF', 'PASSPORT']),
  documentNumber: z.string()
    .min(1, 'Número de documento es requerido')
    .max(20, 'Número de documento demasiado largo')
    .regex(/^[A-Z0-9-]+$/, 'Documento solo puede contener letras, números y guiones'),
  firstName: z.string()
    .max(50, 'Nombre demasiado largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/, 'Nombre solo puede contener letras')
    .optional(),
  lastName: z.string()
    .max(50, 'Apellido demasiado largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/, 'Apellido solo puede contener letras')
    .optional(),
  companyName: z.string()
    .max(100, 'Nombre de empresa demasiado largo')
    .optional(),
  customerType: z.enum(['INDIVIDUAL', 'COMPANY'])
    .default('INDIVIDUAL'),
  email: z.string()
    .email('Email inválido')
    .max(100, 'Email demasiado largo')
    .optional(),
  phone: z.string()
    .max(20, 'Teléfono demasiado largo')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Teléfono contiene caracteres inválidos')
    .optional(),
  address: z.string()
    .max(200, 'Dirección demasiado larga')
    .optional(),
  city: z.string()
    .max(50, 'Ciudad demasiado larga')
    .optional(),
  state: z.string()
    .max(50, 'Estado demasiado largo')
    .optional(),
  postalCode: z.string()
    .max(10, 'Código postal demasiado largo')
    .optional(),
  creditLimit: z.number()
    .min(0, 'Límite de crédito no puede ser negativo')
    .max(999999.99, 'Límite de crédito demasiado alto')
    .optional()
    .default(0),
  notes: z.string()
    .max(500, 'Notas demasiado largas')
    .optional()
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  documentType: z.enum(['CI', 'RIF', 'PASSPORT']).optional(),
  documentNumber: z.string()
    .min(1, 'Número de documento es requerido')
    .max(20, 'Número de documento demasiado largo')
    .regex(/^[A-Z0-9-]+$/, 'Documento solo puede contener letras, números y guiones')
    .optional()
});

// ===== SCHEMAS DE MOVIMIENTOS DE INVENTARIO =====

export const createInventoryMovementSchema = z.object({
  productId: z.string()
    .cuid('ID de producto inválido'),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']),
  quantity: z.union([
    z.number(),
    z.string().transform(val => parseInt(val, 10))
  ])
    .pipe(z.number().int('Cantidad debe ser un número entero')
    .min(1, 'Cantidad debe ser al menos 1')
    .max(999999, 'Cantidad demasiado alta')),
  reason: z.string()
    .min(1, 'Razón es requerida')
    .max(200, 'Razón demasiado larga')
    .trim(),
  cost: z.union([
    z.number(),
    z.string().transform(val => parseFloat(val))
  ])
    .pipe(z.number().min(0, 'Costo debe ser positivo').max(999999.99, 'Costo demasiado alto'))
    .optional(),
  notes: z.string()
    .max(500, 'Notas demasiado largas')
    .optional(),
  metadata: z.record(z.string(), z.any())
    .optional()
});

export const inventoryMovementQuerySchema = z.object({
  productId: z.string()
    .cuid('ID de producto inválido')
    .optional(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'])
    .optional(),
  startDate: z.string()
    .datetime('Fecha de inicio inválida')
    .optional(),
  endDate: z.string()
    .datetime('Fecha de fin inválida')
    .optional(),
  userId: z.string()
    .cuid('ID de usuario inválido')
    .optional(),
  page: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1, 'Página debe ser mayor a 0'))
    .optional()
    .default(1),
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100, 'Límite máximo 100'))
    .optional()
    .default(20),
  sortBy: z.enum(['createdAt', 'quantity', 'type'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('desc')
});

export const updateStockSchema = z.object({
  quantity: z.union([
    z.number(),
    z.string().transform(val => parseInt(val, 10))
  ])
    .pipe(z.number().int('Cantidad debe ser un número entero')
    .min(0, 'Cantidad no puede ser negativa')
    .max(999999, 'Cantidad demasiado alta')),
  reason: z.string()
    .min(1, 'Razón es requerida')
    .max(200, 'Razón demasiado larga')
    .trim(),
  notes: z.string()
    .max(500, 'Notas demasiado largas')
    .optional()
});

// ===== SCHEMAS DE ALERTAS =====

export const createAlertSchema = z.object({
  type: z.enum(['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'SYSTEM']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .optional()
    .default('MEDIUM'),
  productId: z.string()
    .cuid('ID de producto inválido')
    .optional(),
  message: z.string()
    .min(1, 'Mensaje es requerido')
    .max(500, 'Mensaje demasiado largo')
    .trim(),
  metadata: z.record(z.string(), z.any())
    .optional(),
  autoResolve: z.boolean()
    .optional()
    .default(false),
  expiresAt: z.string()
    .datetime('Fecha de expiración inválida')
    .optional()
});

export const alertQuerySchema = z.object({
  type: z.enum(['LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'SYSTEM'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .optional(),
  status: z.enum(['ACTIVE', 'RESOLVED', 'EXPIRED'])
    .optional()
    .default('ACTIVE'),
  productId: z.string()
    .cuid('ID de producto inválido')
    .optional(),
  page: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1))
    .optional()
    .default(1),
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default(20)
});

// ===== SCHEMAS DE VENTAS =====

export const createSaleSchema = z.object({
  customerId: z.string()
    .cuid('ID de cliente inválido'),
  items: z.array(z.object({
    productId: z.string()
      .cuid('ID de producto inválido'),
    quantity: z.number()
      .int('Cantidad debe ser un número entero')
      .min(1, 'Cantidad debe ser al menos 1')
      .max(1000, 'Cantidad demasiado alta'),
    unitPrice: z.number()
      .min(0, 'Precio unitario debe ser positivo')
      .max(999999.99, 'Precio unitario demasiado alto')
  }))
    .min(1, 'Debe incluir al menos un producto')
    .max(50, 'Máximo 50 productos por venta'),
  paymentMethod: z.enum(['CASH_VES', 'CASH_USD', 'CARD', 'TRANSFER', 'MIXED']),
  discount: z.number()
    .min(0, 'Descuento no puede ser negativo')
    .max(99.99, 'Descuento máximo 99.99%')
    .optional()
    .default(0),
  notes: z.string()
    .max(200, 'Notas demasiado largas')
    .optional()
});

// ===== SCHEMAS COMUNES =====

export const idParamSchema = z.object({
  id: z.string()
    .cuid('ID inválido')
});

export const paginationSchema = z.object({
  page: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1))
    .optional()
    .default(1),
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default(20)
});

// ===== TIPOS EXPORTADOS =====

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type CreateProductRequest = z.infer<typeof createProductSchema>;
export type UpdateProductRequest = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type CreateCategoryRequest = z.infer<typeof createCategorySchema>;
export type UpdateCategoryRequest = z.infer<typeof updateCategorySchema>;
export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>;
export type CreateSaleRequest = z.infer<typeof createSaleSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;

// Nuevos tipos para movimientos e inventario
export type CreateInventoryMovementRequest = z.infer<typeof createInventoryMovementSchema>;
export type InventoryMovementQuery = z.infer<typeof inventoryMovementQuerySchema>;
export type UpdateStockRequest = z.infer<typeof updateStockSchema>;
export type CreateAlertRequest = z.infer<typeof createAlertSchema>;
export type AlertQuery = z.infer<typeof alertQuerySchema>;
