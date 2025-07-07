export interface Category3 {
  id: string;
  name: string;
  level: number;
  parentId?: string | null;
  parent?: Category3 | null; // Para incluir la categoría padre anidada
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Brand3 {
  id: string;
  name: string;
}

export interface Product3 {
  id: string;
  sku: string;
  name: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  status: 'active' | 'inactive';
  imageUrl?: string;
  category?: Category3;
  brand?: Brand3; // <-- Añadido para la relación
  createdAt: string;
  updatedAt: string;
  // Campos opcionales para formularios y actualizaciones
  categoryId?: string;
  brandId?: string;
}

export interface Category {
  id: string;
  name: string;
  level: number;
  parentId?: string | null;
  parent?: Category | null; // Para incluir la categoría padre anidada
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  status: 'active' | 'inactive';
  imageUrl?: string;
  category?: Category;
  brand?: Brand; // <-- Añadido para la relación
  createdAt: string;
  updatedAt: string;
  // Campos opcionales para formularios y actualizaciones
  categoryId?: string;
  brandId?: string;
}
