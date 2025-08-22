import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { apiService, setNotificationHandler } from '@/lib/api';

// Tipos para el store de inventario
interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  brand?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  categoryId: string;
  images: string[];
  attributes?: Array<{
    attributeId: string;
    value: any;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  level: number;
  children?: Category[];
}

interface Brand {
  id: string;
  name: string;
  description?: string;
}

interface Attribute {
  attributeId: string;
  name: string;
  type: string;
  isRequired: boolean;
  values?: string[];
  unit?: string;
  helpText?: string;
  isGlobal?: boolean;
  dependsOn?: string;
  minValue?: number;
  maxValue?: number;
  regex?: string;
}

interface FilterState {
  search: string;
  category: string;
  brand: string;
  status: string;
  attributes: Record<string, string>;
  priceRange: [number, number] | null;
  stockRange: [number, number] | null;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface InventoryState {
  // Datos
  products: Product[];
  categories: Category[];
  brands: Brand[];
  attributes: Attribute[];
  
  // Estado de carga
  loading: {
    products: boolean;
    categories: boolean;
    brands: boolean;
    attributes: boolean;
  };
  
  // Errores
  errors: {
    products: string | null;
    categories: string | null;
    brands: string | null;
    attributes: string | null;
  };
  
  // Filtros y búsqueda
  filters: FilterState;
  pagination: PaginationState;
  
  // Selección y estado UI
  selectedProducts: string[];
  selectedCategory: string | null;
  viewMode: 'grid' | 'list' | 'table';
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  
  // Estadísticas
  stats: {
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    categoryStats: Record<string, number>;
    lastUpdated: Date | null;
  };
  
  // Cache y optimización
  lastFetch: Date | null;
  isDirty: boolean;
}

interface InventoryActions {
  // Acciones de productos
  fetchProducts: (force?: boolean) => Promise<void>;
  refreshProducts: () => Promise<void>;
  createProduct: (productData: FormData) => Promise<Product>;
  updateProduct: (id: string, productData: FormData) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  deleteMultipleProducts: (ids: string[]) => Promise<void>;
  getProductById: (id: string) => Product | null;
  
  // Acciones de categorías
  fetchCategories: (force?: boolean) => Promise<void>;
  createCategory: (categoryData: any) => Promise<Category>;
  updateCategory: (id: string, categoryData: any) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Acciones de marcas
  fetchBrands: (force?: boolean) => Promise<void>;
  createBrand: (brandData: any) => Promise<Brand>;
  updateBrand: (id: string, brandData: any) => Promise<Brand>;
  deleteBrand: (id: string) => Promise<void>;
  
  // Acciones de atributos
  fetchAttributes: (categoryId?: string, force?: boolean) => Promise<void>;
  createAttribute: (attributeData: any) => Promise<Attribute>;
  updateAttribute: (id: string, attributeData: any) => Promise<Attribute>;
  deleteAttribute: (id: string) => Promise<void>;
  
  // Acciones de filtros
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  setSearch: (search: string) => void;
  setCategory: (categoryId: string | null) => void;
  setBrand: (brandId: string) => void;
  setStatus: (status: string) => void;
  setAttributeFilter: (attributeId: string, value: string) => void;
  
  // Acciones de paginación
  setPagination: (pagination: Partial<PaginationState>) => void;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  
  // Acciones de selección
  selectProduct: (id: string) => void;
  deselectProduct: (id: string) => void;
  selectAllProducts: () => void;
  clearSelection: () => void;
  toggleProductSelection: (id: string) => void;
  
  // Acciones de UI
  setViewMode: (mode: 'grid' | 'list' | 'table') => void;
  setSorting: (sortBy: string, direction?: 'asc' | 'desc') => void;
  
  // Acciones de utilidad
  refreshStats: () => Promise<void>;
  markDirty: () => void;
  markClean: () => void;
  clearErrors: () => void;
  reset: () => void;
}

// Estado inicial
const initialFilters: FilterState = {
  search: '',
  category: '',
  brand: '',
  status: '',
  attributes: {},
  priceRange: null,
  stockRange: null
};

const initialPagination: PaginationState = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
};

const initialStats = {
  totalProducts: 0,
  totalValue: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  categoryStats: {},
  lastUpdated: null
};

// Store de inventario
export const useInventoryStore = create<InventoryState & InventoryActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Estado inicial
        products: [],
        categories: [],
        brands: [],
        attributes: [],
        
        loading: {
          products: false,
          categories: false,
          brands: false,
          attributes: false
        },
        
        errors: {
          products: null,
          categories: null,
          brands: null,
          attributes: null
        },
        
        filters: { ...initialFilters },
        pagination: { ...initialPagination },
        
        selectedProducts: [],
        selectedCategory: null,
        viewMode: 'grid',
        sortBy: 'name',
        sortDirection: 'asc',
        
        stats: { ...initialStats },
        lastFetch: null,
        isDirty: false,
        
        // Implementación de acciones
        
        // Productos
        fetchProducts: async (force = false) => {
          const state = get();
          const now = new Date();
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          
          // Verificar si necesitamos actualizar
          if (!force && state.lastFetch && state.lastFetch > fiveMinutesAgo && state.products.length > 0) {
            return;
          }
          
          set((state) => ({
            loading: { ...state.loading, products: true },
            errors: { ...state.errors, products: null }
          }));
          
          try {
            const { filters, pagination, sortBy, sortDirection } = state;
            
            const params = {
              page: pagination.page,
              limit: pagination.limit,
              search: filters.search || undefined,
              category: filters.category || undefined,
              brand: filters.brand || undefined,
              status: filters.status || undefined,
              sortBy,
              sortDirection,
              filters: filters.attributes
            };
            
            const response = await apiService.products.getAll(params);
            
            set((state) => ({
              products: response.products || [],
              pagination: {
                ...state.pagination,
                total: response.total || 0,
                totalPages: response.totalPages || 0
              },
              loading: { ...state.loading, products: false },
              lastFetch: now,
              isDirty: false
            }));
            
            // Actualizar estadísticas automáticamente
            get().refreshStats();
            
          } catch (error: any) {
            set((state) => ({
              loading: { ...state.loading, products: false },
              errors: { ...state.errors, products: error.message }
            }));
            throw error;
          }
        },
        
        refreshProducts: async () => {
          return get().fetchProducts(true);
        },
        
        createProduct: async (productData: FormData) => {
          try {
            const newProduct = await apiService.products.create(productData);
            
            set((state) => ({
              products: [newProduct, ...state.products],
              isDirty: true
            }));
            
            // Refrescar datos después de crear
            await get().refreshProducts();
            return newProduct;
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, products: error.message }
            }));
            throw error;
          }
        },
        
        updateProduct: async (id: string, productData: FormData) => {
          try {
            const updatedProduct = await apiService.products.update(id, productData);
            
            set((state) => ({
              products: state.products.map(p => 
                p.id === id ? { ...p, ...updatedProduct } : p
              ),
              isDirty: true
            }));
            
            return updatedProduct;
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, products: error.message }
            }));
            throw error;
          }
        },
        
        deleteProduct: async (id: string) => {
          try {
            await apiService.products.delete(id);
            
            set((state) => ({
              products: state.products.filter(p => p.id !== id),
              selectedProducts: state.selectedProducts.filter(pid => pid !== id),
              isDirty: true
            }));
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, products: error.message }
            }));
            throw error;
          }
        },
        
        deleteMultipleProducts: async (ids: string[]) => {
          try {
            await Promise.all(ids.map(id => apiService.products.delete(id)));
            
            set((state) => ({
              products: state.products.filter(p => !ids.includes(p.id)),
              selectedProducts: state.selectedProducts.filter(pid => !ids.includes(pid)),
              isDirty: true
            }));
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, products: error.message }
            }));
            throw error;
          }
        },
        
        getProductById: (id: string) => {
          return get().products.find(p => p.id === id) || null;
        },
        
        // Categorías
        fetchCategories: async (force = false) => {
          const state = get();
          
          if (!force && state.categories.length > 0) {
            return;
          }
          
          set((state) => ({
            loading: { ...state.loading, categories: true },
            errors: { ...state.errors, categories: null }
          }));
          
          try {
            const categories = await apiService.categories.getAll();
            
            set((state) => ({
              categories: categories || [],
              loading: { ...state.loading, categories: false }
            }));
            
          } catch (error: any) {
            set((state) => ({
              loading: { ...state.loading, categories: false },
              errors: { ...state.errors, categories: error.message }
            }));
            throw error;
          }
        },
        
        createCategory: async (categoryData: any) => {
          try {
            const newCategory = await apiService.categories.create(categoryData);
            
            set((state) => ({
              categories: [...state.categories, newCategory]
            }));
            
            return newCategory;
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, categories: error.message }
            }));
            throw error;
          }
        },
        
        updateCategory: async (id: string, categoryData: any) => {
          try {
            const updatedCategory = await apiService.categories.update(id, categoryData);
            
            set((state) => ({
              categories: state.categories.map(c => 
                c.id === id ? { ...c, ...updatedCategory } : c
              )
            }));
            
            return updatedCategory;
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, categories: error.message }
            }));
            throw error;
          }
        },
        
        deleteCategory: async (id: string) => {
          try {
            await apiService.categories.delete(id);
            
            set((state) => ({
              categories: state.categories.filter(c => c.id !== id),
              selectedCategory: state.selectedCategory === id ? null : state.selectedCategory
            }));
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, categories: error.message }
            }));
            throw error;
          }
        },
        
        // Marcas
        fetchBrands: async (force = false) => {
          const state = get();
          
          if (!force && state.brands.length > 0) {
            return;
          }
          
          set((state) => ({
            loading: { ...state.loading, brands: true },
            errors: { ...state.errors, brands: null }
          }));
          
          try {
            const brands = await apiService.brands.getAll();
            
            set((state) => ({
              brands: brands || [],
              loading: { ...state.loading, brands: false }
            }));
            
          } catch (error: any) {
            set((state) => ({
              loading: { ...state.loading, brands: false },
              errors: { ...state.errors, brands: error.message }
            }));
            throw error;
          }
        },
        
        createBrand: async (brandData: any) => {
          try {
            const newBrand = await apiService.brands.create(brandData);
            
            set((state) => ({
              brands: [...state.brands, newBrand]
            }));
            
            return newBrand;
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, brands: error.message }
            }));
            throw error;
          }
        },
        
        updateBrand: async (id: string, brandData: any) => {
          try {
            const updatedBrand = await apiService.brands.update(id, brandData);
            
            set((state) => ({
              brands: state.brands.map(b => 
                b.id === id ? { ...b, ...updatedBrand } : b
              )
            }));
            
            return updatedBrand;
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, brands: error.message }
            }));
            throw error;
          }
        },
        
        deleteBrand: async (id: string) => {
          try {
            await apiService.brands.delete(id);
            
            set((state) => ({
              brands: state.brands.filter(b => b.id !== id)
            }));
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, brands: error.message }
            }));
            throw error;
          }
        },
        
        // Atributos
        fetchAttributes: async (categoryId?: string, force = false) => {
          const state = get();
          
          if (!force && state.attributes.length > 0 && !categoryId) {
            return;
          }
          
          set((state) => ({
            loading: { ...state.loading, attributes: true },
            errors: { ...state.errors, attributes: null }
          }));
          
          try {
            const attributes = categoryId 
              ? await apiService.attributes.getAttributesByCategory(categoryId)
              : await apiService.attributes.getAllAttributes();
            
            set((state) => ({
              attributes: attributes.attributes || attributes || [],
              loading: { ...state.loading, attributes: false }
            }));
            
          } catch (error: any) {
            set((state) => ({
              loading: { ...state.loading, attributes: false },
              errors: { ...state.errors, attributes: error.message }
            }));
            throw error;
          }
        },
        
        createAttribute: async (attributeData: any) => {
          try {
            const newAttribute = await apiService.attributes.create(attributeData);
            
            set((state) => ({
              attributes: [...state.attributes, newAttribute]
            }));
            
            return newAttribute;
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, attributes: error.message }
            }));
            throw error;
          }
        },
        
        updateAttribute: async (id: string, attributeData: any) => {
          try {
            const updatedAttribute = await apiService.attributes.update(id, attributeData);
            
            set((state) => ({
              attributes: state.attributes.map(a => 
                a.attributeId === id ? { ...a, ...updatedAttribute } : a
              )
            }));
            
            return updatedAttribute;
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, attributes: error.message }
            }));
            throw error;
          }
        },
        
        deleteAttribute: async (id: string) => {
          try {
            await apiService.attributes.delete(id);
            
            set((state) => ({
              attributes: state.attributes.filter(a => a.attributeId !== id)
            }));
            
          } catch (error: any) {
            set((state) => ({
              errors: { ...state.errors, attributes: error.message }
            }));
            throw error;
          }
        },
        
        // Filtros
        setFilters: (newFilters: Partial<FilterState>) => {
          set((state) => ({
            filters: { ...state.filters, ...newFilters },
            pagination: { ...state.pagination, page: 1 }, // Reset página
            isDirty: true
          }));
          
          // Refrescar productos automáticamente
          setTimeout(() => get().fetchProducts(), 100);
        },
        
        clearFilters: () => {
          set((state) => ({
            filters: { ...initialFilters },
            pagination: { ...state.pagination, page: 1 },
            isDirty: true
          }));
          
          setTimeout(() => get().fetchProducts(), 100);
        },
        
        setSearch: (search: string) => {
          get().setFilters({ search });
        },
        
        setCategory: (categoryId: string | null) => {
          set((state) => ({
            selectedCategory: categoryId,
            filters: { ...state.filters, category: categoryId || '' },
            pagination: { ...state.pagination, page: 1 },
            isDirty: true
          }));
          
          // Cargar atributos de la categoría
          if (categoryId) {
            get().fetchAttributes(categoryId);
          }
          
          setTimeout(() => get().fetchProducts(), 100);
        },
        
        setBrand: (brandId: string) => {
          get().setFilters({ brand: brandId });
        },
        
        setStatus: (status: string) => {
          get().setFilters({ status });
        },
        
        setAttributeFilter: (attributeId: string, value: string) => {
          set((state) => ({
            filters: {
              ...state.filters,
              attributes: {
                ...state.filters.attributes,
                [attributeId]: value
              }
            },
            pagination: { ...state.pagination, page: 1 },
            isDirty: true
          }));
          
          setTimeout(() => get().fetchProducts(), 100);
        },
        
        // Paginación
        setPagination: (newPagination: Partial<PaginationState>) => {
          set((state) => ({
            pagination: { ...state.pagination, ...newPagination },
            isDirty: true
          }));
          
          setTimeout(() => get().fetchProducts(), 100);
        },
        
        nextPage: () => {
          const { pagination } = get();
          if (pagination.page < pagination.totalPages) {
            get().setPagination({ page: pagination.page + 1 });
          }
        },
        
        previousPage: () => {
          const { pagination } = get();
          if (pagination.page > 1) {
            get().setPagination({ page: pagination.page - 1 });
          }
        },
        
        goToPage: (page: number) => {
          const { pagination } = get();
          if (page >= 1 && page <= pagination.totalPages) {
            get().setPagination({ page });
          }
        },
        
        // Selección
        selectProduct: (id: string) => {
          set((state) => ({
            selectedProducts: [...new Set([...state.selectedProducts, id])]
          }));
        },
        
        deselectProduct: (id: string) => {
          set((state) => ({
            selectedProducts: state.selectedProducts.filter(pid => pid !== id)
          }));
        },
        
        selectAllProducts: () => {
          set((state) => ({
            selectedProducts: state.products.map(p => p.id)
          }));
        },
        
        clearSelection: () => {
          set({ selectedProducts: [] });
        },
        
        toggleProductSelection: (id: string) => {
          const { selectedProducts } = get();
          if (selectedProducts.includes(id)) {
            get().deselectProduct(id);
          } else {
            get().selectProduct(id);
          }
        },
        
        // UI
        setViewMode: (mode: 'grid' | 'list' | 'table') => {
          set({ viewMode: mode });
        },
        
        setSorting: (sortBy: string, direction?: 'asc' | 'desc') => {
          const currentDirection = get().sortDirection;
          const newDirection = direction || (get().sortBy === sortBy && currentDirection === 'asc' ? 'desc' : 'asc');
          
          set({
            sortBy,
            sortDirection: newDirection,
            isDirty: true
          });
          
          setTimeout(() => get().fetchProducts(), 100);
        },
        
        // Utilidades
        refreshStats: async () => {
          try {
            const stats = await apiService.products.getStats();
            
            set((state) => ({
              stats: {
                ...state.stats,
                ...stats,
                lastUpdated: new Date()
              }
            }));
            
          } catch (error) {
            console.warn('Error refreshing stats:', error);
          }
        },
        
        markDirty: () => {
          set({ isDirty: true });
        },
        
        markClean: () => {
          set({ isDirty: false });
        },
        
        clearErrors: () => {
          set({
            errors: {
              products: null,
              categories: null,
              brands: null,
              attributes: null
            }
          });
        },
        
        reset: () => {
          set({
            products: [],
            categories: [],
            brands: [],
            attributes: [],
            loading: {
              products: false,
              categories: false,
              brands: false,
              attributes: false
            },
            errors: {
              products: null,
              categories: null,
              brands: null,
              attributes: null
            },
            filters: { ...initialFilters },
            pagination: { ...initialPagination },
            selectedProducts: [],
            selectedCategory: null,
            viewMode: 'grid',
            sortBy: 'name',
            sortDirection: 'asc',
            stats: { ...initialStats },
            lastFetch: null,
            isDirty: false
          });
        }
      }),
      {
        name: 'inventory-store',
        partialize: (state) => ({
          // Solo persistir configuraciones UI, no datos
          viewMode: state.viewMode,
          sortBy: state.sortBy,
          sortDirection: state.sortDirection,
          pagination: { ...state.pagination, page: 1 }, // Reset página al cargar
          filters: {
            ...initialFilters,
            // Mantener solo búsqueda
            search: state.filters.search
          }
        })
      }
    )
  )
);

// Suscripciones para efectos automáticos
useInventoryStore.subscribe(
  (state) => state.selectedCategory,
  (categoryId) => {
    if (categoryId) {
      useInventoryStore.getState().fetchAttributes(categoryId);
    }
  }
);

// Hook para estadísticas computadas
export const useInventoryStats = () => {
  return useInventoryStore((state) => {
    const products = state.products;
    
    const computedStats = {
      ...state.stats,
      
      // Estadísticas en tiempo real
      activeProducts: products.filter(p => p.status === 'ACTIVE').length,
      inactiveProducts: products.filter(p => p.status === 'INACTIVE').length,
      discontinuedProducts: products.filter(p => p.status === 'DISCONTINUED').length,
      
      // Stock
      lowStockProducts: products.filter(p => p.stock <= p.minStock),
      outOfStockProducts: products.filter(p => p.stock === 0),
      overStockProducts: products.filter(p => p.maxStock && p.stock > p.maxStock),
      
      // Valor total
      totalInventoryValue: products.reduce((acc, p) => acc + (p.salePrice * p.stock), 0),
      totalCostValue: products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0),
      
      // Por categoría
      productsByCategory: products.reduce((acc, p) => {
        acc[p.categoryId] = (acc[p.categoryId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      
      // Productos con problemas
      problemProducts: products.filter(p => 
        p.stock <= p.minStock || 
        p.stock === 0 || 
        (p.maxStock && p.stock > p.maxStock)
      ).length
    };
    
    return computedStats;
  });
};

// Hook para filtros activos
export const useActiveFilters = () => {
  return useInventoryStore((state) => {
    const { filters } = state;
    const activeFilters: Array<{ key: string; value: string; label: string }> = [];
    
    if (filters.search) {
      activeFilters.push({
        key: 'search',
        value: filters.search,
        label: `Búsqueda: ${filters.search}`
      });
    }
    
    if (filters.category) {
      const category = state.categories.find(c => c.id === filters.category);
      activeFilters.push({
        key: 'category',
        value: filters.category,
        label: `Categoría: ${category?.name || filters.category}`
      });
    }
    
    if (filters.brand) {
      const brand = state.brands.find(b => b.id === filters.brand);
      activeFilters.push({
        key: 'brand',
        value: filters.brand,
        label: `Marca: ${brand?.name || filters.brand}`
      });
    }
    
    if (filters.status) {
      const statusLabels = {
        ACTIVE: 'Activo',
        INACTIVE: 'Inactivo',
        DISCONTINUED: 'Discontinuado'
      };
      activeFilters.push({
        key: 'status',
        value: filters.status,
        label: `Estado: ${statusLabels[filters.status as keyof typeof statusLabels] || filters.status}`
      });
    }
    
    Object.entries(filters.attributes).forEach(([attrId, value]) => {
      if (value) {
        const attribute = state.attributes.find(a => a.attributeId === attrId);
        activeFilters.push({
          key: `attr_${attrId}`,
          value: String(value),
          label: `${attribute?.name || attrId}: ${value}`
        });
      }
    });
    
    return activeFilters;
  });
};

// Configurar handler de notificaciones para API
setNotificationHandler((notification) => {
  // Se conectará con el sistema de notificaciones cuando se implemente
  console.log('API Notification:', notification);
});
