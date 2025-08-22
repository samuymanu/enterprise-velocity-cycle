import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ManageCategoriesModal } from "@/components/inventory/ManageCategoriesModal";
import { ManageAttributesModal } from "@/components/inventory/ManageAttributesModal";
import { AddProductModal } from "@/components/inventory/AddProductModal";
import { EditProductModal } from "@/components/inventory/EditProductModal";
import { DynamicFilters } from "@/components/inventory/DynamicFilters";
import { AdvancedSearch } from "@/components/inventory/AdvancedSearch";
import MovementForm from "@/components/inventory/MovementForm";
import StockHistory from "@/components/inventory/StockHistory";
import { apiService } from "@/lib/api";
import authManager from "@/lib/authManager";
import { useNotifications } from "@/stores/notificationStore";
import { useState, useEffect, useRef } from "react";
import { BarcodePreview } from "./BarcodePreview";
import { ProductSheetPreview } from "./ProductSheetPreview";
import { Settings, Plus, RefreshCw, FilePenLine, Barcode, Download, FileText, Eye, Trash2, Package, History } from "lucide-react";
import ProductImage from "@/components/inventory/ProductImage";



export default function Inventory() {
  // Hook de notificaciones
  const { addNotification } = useNotifications();
  
  // Estado para previsualización de ficha técnica
  const [sheetModal, setSheetModal] = useState<{ open: boolean, product: any | null, categoriaPrincipal: string, subcategoria: string }>({ open: false, product: null, categoriaPrincipal: '', subcategoria: '' });
  // Estado para previsualización de código de barras
  const [barcodeModal, setBarcodeModal] = useState<{ open: boolean, sku: string | null }>({ open: false, sku: null });
  // Estado para previsualización de imagen
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Estado para imágenes con error
  const [imageErrorIds, setImageErrorIds] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingProducts, setRefreshingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para modales
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isAttributesModalOpen, setIsAttributesModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Estado para el modal de edición
  const [editingProduct, setEditingProduct] = useState<any | null>(null); // Estado para el producto en edición
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, product: any | null }>({ open: false, product: null }); // Estado para el modal de confirmación de eliminación
  const [isDeleting, setIsDeleting] = useState(false); // Estado para indicar si se está eliminando
  // Estados para Day 2 - Movimientos y Stock
  const [movementModal, setMovementModal] = useState<{ open: boolean, product: any | null }>({ open: false, product: null });
  const [historyModal, setHistoryModal] = useState<{ open: boolean, product: any | null }>({ open: false, product: null });
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});
  // Estado y ref para debounce de búsqueda
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Estado de autenticación simplificado con AuthManager
  const [isAuthenticated, setIsAuthenticated] = useState(authManager.hasValidToken());
  
  // Función de autenticación usando AuthManager
  const ensureAuthenticated = async (): Promise<boolean> => {
    try {
      const success = await authManager.ensureAuthenticated();
      setIsAuthenticated(success);
      
      if (!success) {
        const timeRemaining = authManager.getTimeUntilNextAttempt();
        if (timeRemaining > 0) {
          const seconds = Math.ceil(timeRemaining / 1000);
          const message = `Esperando ${seconds}s antes del siguiente intento de autenticación`;
          setError(message);
          addNotification({
            type: 'warning',
            title: 'Autenticación en Espera',
            message,
            category: 'inventory'
          });
        } else if (authManager.isLoginInProgress()) {
          setError('Autenticación en progreso...');
          addNotification({
            type: 'info',
            title: 'Autenticando...',
            message: 'Proceso de autenticación en progreso',
            category: 'inventory'
          });
        } else {
          setError('Error de autenticación. Inténtalo más tarde.');
          addNotification({
            type: 'error',
            title: 'Error de Autenticación',
            message: 'No se pudo autenticar con el servidor',
            category: 'inventory'
          });
        }
      } else {
        setError(null);
        addNotification({
          type: 'success',
          title: 'Autenticación Exitosa',
          message: 'Sesión establecida correctamente',
          category: 'inventory'
        });
      }
      
      return success;
    } catch (error: any) {
      console.error('Error en ensureAuthenticated:', error);
      const message = `Error de autenticación: ${error.message || 'Error desconocido'}`;
      setError(message);
      addNotification({
        type: 'error',
        title: 'Error de Autenticación',
        message: error.message || 'Error desconocido durante la autenticación',
        category: 'inventory'
      });
      setIsAuthenticated(false);
      return false;
    }
  };

  // Función para cargar productos
  const loadProducts = async (isRefresh = false, filters: any = {}) => {
    try {
      if (isRefresh) {
        setRefreshingProducts(true);
      } else {
        setLoading(true);
      }
      
      // Asegurar autenticación antes de cargar productos
      const authSuccess = await ensureAuthenticated();
      if (!authSuccess) {
        setError('No se pudo autenticar. Por favor, intenta más tarde.');
        return;
      }
      
      // Por defecto, solo mostrar productos ACTIVE (a menos que se especifique otro status)
      const finalFilters = {
        status: 'ACTIVE',
        ...filters
      };
      
      console.log('📡 loadProducts called with filters:', filters);
      console.log('📡 Final filters being sent to API:', finalFilters);
      
      const data = await apiService.products.getAll(finalFilters);
      setProducts(data.products || []);
      setError(null);
    } catch (error: any) {
      console.error('Error cargando productos:', error);
      
      // Si es un error de autenticación, intentar re-autenticar
      if (error.message.includes('Token de autenticación inválido') || error.message.includes('401')) {
        console.log('Token inválido detectado, intentando re-autenticación...');
        const authSuccess = await ensureAuthenticated();
        if (authSuccess) {
          // Reintentar cargar productos después de re-autenticación exitosa
          try {
            const data = await apiService.products.getAll(filters);
            setProducts(data.products || []);
            setError(null);
            return;
          } catch (retryError: any) {
            console.error('Error en reintento de carga de productos:', retryError);
            setError(retryError.message || 'Error cargando productos después de re-autenticación');
          }
        } else {
          setError('Error de autenticación. No se pudieron cargar los productos.');
        }
      } else {
        setError(error.message || 'Error cargando productos');
      }
    } finally {
      if (isRefresh) {
        setRefreshingProducts(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Función para cargar categorías
  const loadCategories = async () => {
    try {
      // Asegurar autenticación antes de cargar categorías
      const authSuccess = await ensureAuthenticated();
      if (!authSuccess) {
        console.error('No se pudo autenticar para cargar categorías');
        return;
      }
      
      const data = await apiService.categories.getAll();
      setCategories(data.categories || []);
    } catch (error: any) {
      console.error('Error cargando categorías:', error);
      
      // Si es un error de autenticación, intentar re-autenticar
      if (error.message.includes('Token de autenticación inválido') || error.message.includes('401')) {
        console.log('Token inválido detectado al cargar categorías, intentando re-autenticación...');
        const authSuccess = await ensureAuthenticated();
        if (authSuccess) {
          // Reintentar cargar categorías después de re-autenticación exitosa
          try {
            const data = await apiService.categories.getAll();
            setCategories(data.categories || []);
          } catch (retryError: any) {
            console.error('Error en reintento de carga de categorías:', retryError);
          }
        }
      }
    }
  };

  // Función para cargar marcas
  const loadBrands = async () => {
    try {
      // Asegurar autenticación antes de cargar marcas
      const authSuccess = await ensureAuthenticated();
      if (!authSuccess) {
        console.error('No se pudo autenticar para cargar marcas');
        return;
      }
      
      const data = await apiService.brands.getAll();
      setBrands(data.brands || []);
    } catch (error: any) {
      console.error('Error cargando marcas:', error);
      
      // Si es un error de autenticación, intentar re-autenticar
      if (error.message.includes('Token de autenticación inválido') || error.message.includes('401')) {
        console.log('Token inválido detectado al cargar marcas, intentando re-autenticación...');
        const authSuccess = await ensureAuthenticated();
        if (authSuccess) {
          // Reintentar cargar marcas después de re-autenticación exitosa
          try {
            const data = await apiService.brands.getAll();
            setBrands(data.brands || []);
          } catch (retryError: any) {
            console.error('Error en reintento de carga de marcas:', retryError);
          }
        }
      }
    }
  };

  // Función para manejar cuando se agrega un producto
  const handleProductAdded = async () => {
    await loadProducts(true);
  };

  // Función para manejar cuando se actualiza un producto
  const handleProductUpdated = async () => {
    await loadProducts(true);
  };

  // Función para abrir el modal de edición
  const handleEditClick = (product: any) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  // Función para abrir el modal de confirmación de eliminación
  const handleDeleteClick = (product: any) => {
    setDeleteModal({ open: true, product });
  };

  // Función para confirmar la eliminación
  const handleConfirmDelete = async () => {
    if (!deleteModal.product) return;
    
    setIsDeleting(true);
    try {
      await apiService.products.delete(deleteModal.product.id);
      
      addNotification({
        type: 'success',
        title: 'Producto eliminado',
        message: `El producto "${deleteModal.product.name}" ha sido eliminado exitosamente.`
      });
      
      // Cerrar modal y recargar productos
      setDeleteModal({ open: false, product: null });
      loadProducts();
      
    } catch (error: any) {
      console.error('❌ Error eliminando producto:', error);
      addNotification({
        type: 'error',
        title: 'Error al eliminar',
        message: error.message || 'No se pudo eliminar el producto'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Efecto para cargar datos al montar el componente
  useEffect(() => {
    const initializeData = async () => {
      console.log('🔄 Inventario: Iniciando carga de datos...');
      setLoading(true);
      
      // Verificar estado inicial de autenticación
      console.log('🔐 Inventario: Verificando estado de autenticación...');
      console.log('🔐 Inventario: hasValidToken:', authManager.hasValidToken());
      console.log('🔐 Inventario: isLoginInProgress:', authManager.isLoginInProgress());
      
      // Usar AuthManager para manejar autenticación
      const authSuccess = await ensureAuthenticated();
      console.log('🔐 Inventario: Resultado de autenticación:', authSuccess);
      
      if (!authSuccess) {
        console.error('❌ Inventario: Fallo de autenticación');
        setLoading(false);
        return;
      }
      
      try {
        console.log('📦 Inventario: Cargando categorías, marcas y productos...');
        await loadCategories();
        await loadBrands();
        const filters: any = { ...dynamicFilters };
        if (selectedCategory) filters.categoryId = selectedCategory;
        await loadProducts(false, filters);
        console.log('✅ Inventario: Datos cargados exitosamente');
      } catch (e: any) {
        console.error('❌ Inventario: Error cargando datos iniciales:', e);
        setError(`Error cargando datos iniciales: ${e.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };

    // Solo ejecutar si no estamos ya autenticados
    if (!isAuthenticated && !authManager.isLoginInProgress()) {
      console.log('🚀 Inventario: Ejecutando inicialización completa...');
      initializeData();
    } else if (isAuthenticated) {
      // Si ya estamos autenticados, cargar datos directamente
      console.log('✅ Inventario: Ya autenticado, cargando datos directamente...');
      setLoading(true);
      Promise.all([
        loadCategories(),
        loadBrands(),
        loadProducts(false, { ...dynamicFilters, ...(selectedCategory && { categoryId: selectedCategory }) })
      ]).then(() => {
        console.log('✅ Inventario: Datos cargados (usuario ya autenticado)');
      }).catch((e: any) => {
        console.error('❌ Inventario: Error cargando datos (usuario autenticado):', e);
        setError(`Error cargando datos: ${e.message || 'Error desconocido'}`);
      }).finally(() => {
        setLoading(false);
      });
    } else {
      console.log('⏳ Inventario: Login en progreso, esperando...');
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Solo ejecutar al montar

  // Recargar productos solo si cambian los filtros o la búsqueda debounced
  useEffect(() => {
    if (!loading) {
      const filters: any = { ...dynamicFilters };
      if (selectedCategory) filters.categoryId = selectedCategory;
      if (debouncedSearch) filters.search = debouncedSearch;
      loadProducts(false, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, JSON.stringify(dynamicFilters), debouncedSearch]);

  // Debounce para el input de búsqueda (sin forzar renders ni modificar filtros)
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [search]);

  // Función para mapear status del backend al frontend
  const getStatusInfo = (product: any) => {
    if (product.stock <= product.minStock) {
      return { label: 'Stock Bajo', variant: 'destructive' as const };
    }
    return { label: 'Activo', variant: 'default' as const };
  };

  let mainContent;
  if (loading) {
    mainContent = (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <span className="animate-spin text-4xl mb-4">⏳</span>
        <p className="text-lg">Cargando productos...</p>
      </div>
    );
  } else if (error) {
    const isRateLimited = error.includes('Rate limit') || error.includes('429') || error.includes('Esperando');
    const isAuthError = error.includes('Token de autenticación inválido') || error.includes('autenticación');
    
    mainContent = (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
        <span className="text-4xl mb-4 text-red-500">
          {isRateLimited ? '⏱️' : isAuthError ? '🔐' : '❌'}
        </span>
        <p className="text-lg text-red-600 text-center max-w-md">
          {error}
        </p>
        
        {isRateLimited ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              El sistema está limitando las solicitudes para proteger el servidor.
            </p>
            <p className="text-sm text-gray-600">
              El reintento se realizará automáticamente.
            </p>
          </div>
        ) : isAuthError ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Problema de autenticación detectado. 
            </p>
            <p className="text-sm text-gray-600">
              Haz clic en "Reintentar" para intentar una nueva autenticación.
            </p>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Error al cargar los datos del inventario.
            </p>
          </div>
        )}
        
        <Button 
          onClick={async () => {
            setError(null);
            setLoading(true);
            
            // Si es un error de autenticación, limpiar estado de AuthManager
            if (isAuthError) {
              authManager.clearAuth();
            }
            
            const success = await ensureAuthenticated();
            if (success) {
              try {
                await loadCategories();
                await loadProducts();
              } catch (e: any) {
                setError(`Error cargando datos: ${e.message || 'Error desconocido'}`);
              }
            }
            setLoading(false);
          }} 
          className="mt-4"
          disabled={isRateLimited || authManager.isLoginInProgress()}
        >
          {authManager.isLoginInProgress() ? 'Autenticando...' : 'Reintentar ahora'}
        </Button>
      </div>
    );
  } else {
    mainContent = (
      <>
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Inventario</h1>
            <p className="text-foreground-secondary">
              Control completo de productos, stock y valorización
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-warning border-warning">
              ⚠️ {products.filter(p => p.stock <= p.minStock).length} productos bajo mínimo
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsManageModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Categorías
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsAttributesModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Atributos
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadProducts(true)}
              disabled={refreshingProducts}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshingProducts ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary-hover flex items-center gap-2"
              onClick={() => setIsAddProductModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </Button>
          </div>
        </div>

        {/* Quick Stats Mejoradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 shadow-sm border rounded-xl text-center">
            <p className="text-2xl font-bold text-primary">{products.length}</p>
            <p className="text-muted-foreground text-sm">Total Productos</p>
          </Card>
          <Card className="p-4 shadow-sm border rounded-xl text-center">
            <p className="text-2xl font-bold text-green-600">
              ${products.reduce((sum, p) => sum + (p.salePrice * p.stock), 0).toLocaleString()}
            </p>
            <p className="text-muted-foreground text-sm">Valor Inventario</p>
          </Card>
          <Card className="p-4 shadow-sm border rounded-xl text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {products.filter(p => p.stock <= p.minStock).length}
            </p>
            <p className="text-muted-foreground text-sm">Stock Crítico</p>
          </Card>
          <Card className="p-4 shadow-sm border rounded-xl text-center">
            <p className="text-2xl font-bold text-blue-600">
              {products.length > 0 ? Math.round((products.filter(p => p.stock > p.minStock).length / products.length) * 100) : 0}%
            </p>
            <p className="text-muted-foreground text-sm">Stock Saludable</p>
          </Card>
        </div>

        {/* Filtros dinámicos por atributos (mantener para compatibilidad) */}
        {selectedCategory && (
          <Card className="p-4 mb-4">
            <DynamicFilters
              categoryId={selectedCategory}
              onFilterChange={setDynamicFilters}
            />
          </Card>
        )}

        {/* Buscador avanzado */}
        <div className="mb-4">
          <AdvancedSearch
            categories={categories}
            loading={loading}
            onSearch={async (filters: any) => {
              // Aplicar filtros y recargar productos
              setDynamicFilters(filters);
              const mergedFilters = { ...filters };
              if (selectedCategory) mergedFilters.categoryId = selectedCategory;
              await loadProducts(false, mergedFilters);
            }}
            onClear={async () => {
              setDynamicFilters({});
              await loadProducts(false, { status: 'ACTIVE' });
            }}
          />
        </div>

        {/* Products Table Mejorada */}
        <Card className="enterprise-card">
          <div className="p-6 border-b border-card-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Lista de Productos</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">📥 Importar</Button>
                <Button variant="outline" size="sm">📤 Exportar</Button>
                <Button variant="outline" size="sm">🏷️ Etiquetas</Button>
                <Button variant="outline" size="sm" onClick={() => setMovementModal({ open: true, product: null })}>
                  📦 Movimientos
                </Button>
                <Button variant="outline" size="sm" onClick={() => setHistoryModal({ open: true, product: null })}>
                  📊 Historial
                </Button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground-secondary">SKU</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Imagen</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Producto</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Categoría</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Subcategoría</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Stock</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Precio</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Estado</th>
                  <th className="text-center p-4 font-medium text-foreground-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-foreground-secondary">
                      <span className="text-2xl">🕵️‍♂️</span>
                      <div className="mt-2">No se encontraron productos.</div>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const statusInfo = getStatusInfo(product);
                    const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;
                    // Lógica para categoría y subcategoría
                    let categoriaPrincipal = 'Sin categoría principal';
                    let subcategoria = 'Sin subcategoría';
                    if (product.category) {
                      if (product.category.parentId) {
                        // Buscar la categoría padre en el array de categorías
                        const parentCat = categories.find(cat => cat.id === product.category.parentId);
                        categoriaPrincipal = parentCat ? parentCat.name : 'Sin categoría principal';
                        subcategoria = product.category.name;
                      } else {
                        categoriaPrincipal = product.category.name;
                        subcategoria = 'Sin subcategoría';
                      }
                    }
                    return (
                      <tr key={product.id} className="border-b border-card-border hover:bg-background-secondary/50">
                        <td className="p-4">
                          <span className="font-mono text-sm">{product.sku}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-center justify-center">
                            <div
                              className="w-16 h-16 rounded bg-background-secondary flex items-center justify-center overflow-hidden border border-card-border mb-1 cursor-pointer hover:ring-2 hover:ring-primary/60 transition"
                              title="Previsualizar imagen"
                              onClick={firstImage ? () => setPreviewImage(firstImage) : undefined}
                              style={{ userSelect: 'none' }}
                            >
                              {firstImage ? (
                                <ProductImage
                                  src={firstImage}
                                  alt={product.name}
                                />
                              ) : (
                                <span className="text-2xl text-foreground-secondary">🖼️</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-foreground-secondary">{product.brand?.name || product.brand || 'Sin marca'}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">
                            {categoriaPrincipal}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary">
                            {subcategoria}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={product.stock <= product.minStock ? "text-destructive font-bold" : "text-foreground"}>
                              {product.stock}
                            </span>
                            <span className="text-xs text-foreground-secondary">
                              (min: {product.minStock})
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">${product.salePrice.toLocaleString()}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(product)} title="Editar Producto">
                              <FilePenLine className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClick(product)}
                              title="Eliminar Producto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Ver Código de Barras"
                              onClick={() => {
                                setBarcodeModal({ open: true, sku: product.sku });
                              }}
                            >
                              <Barcode className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Movimientos de Stock"
                              onClick={() => {
                                setMovementModal({ open: true, product });
                              }}
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Historial de Stock"
                              onClick={() => {
                                setHistoryModal({ open: true, product });
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Ficha Técnica"
                              onClick={() => {
                                console.log('🔍 Product data for sheet:', product);
                                
                                // Lógica para categoría y subcategoría igual que en la tabla
                                let categoriaPrincipal = 'Sin categoría principal';
                                let subcategoria = 'Sin subcategoría';
                                if (product.category) {
                                  if (product.category.parentId) {
                                    const parentCat = categories.find(cat => cat.id === product.category.parentId);
                                    categoriaPrincipal = parentCat ? parentCat.name : 'Sin categoría principal';
                                    subcategoria = product.category.name;
                                  } else {
                                    categoriaPrincipal = product.category.name;
                                    subcategoria = 'Sin subcategoría';
                                  }
                                }
                                
                                // Crear una versión sanitizada del producto
                                const sanitizedProduct = {
                                  sku: product.sku || '',
                                  name: product.name || '',
                                  brand: product.brand,
                                  category: product.category,
                                  images: product.images || [],
                                  attributes: product.attributes || [],
                                  salePrice: product.salePrice,
                                  costPrice: product.costPrice,
                                  stock: product.stock
                                };
                                
                                console.log('🧹 Sanitized product:', sanitizedProduct);
                                setSheetModal({ open: true, product: sanitizedProduct, categoriaPrincipal, subcategoria });
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {product.datasheetUrl && (
                              <a href={`${apiService.getApiUrl()}${product.datasheetUrl.startsWith('/') ? product.datasheetUrl : `/${product.datasheetUrl}`}`} target="_blank" rel="noopener noreferrer" title="Descargar Ficha Técnica">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t border-card-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground-secondary">
                Mostrando {products.length} productos
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>« Anterior</Button>
                <span className="text-sm text-foreground-secondary">Página 1</span>
                <Button variant="outline" size="sm" disabled>Siguiente »</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="font-semibold text-foreground">Entrada de Mercancía</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Registrar nueva mercancía recibida
              </p>
            </div>
          </Card>
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-semibold text-foreground">Reportes de Inventario</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Análisis de rotación y valorización
              </p>
            </div>
          </Card>
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">🏷️</div>
              <h3 className="font-semibold text-foreground">Gestión de Precios</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Actualización masiva de precios
              </p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <AppLayout>
      <div className="w-full px-2 sm:px-4 py-8 space-y-8">
        {mainContent}
      </div>
      {/* Modal de previsualización de ficha técnica */}
      <Dialog open={sheetModal.open} onOpenChange={open => setSheetModal(s => ({ ...s, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ficha Técnica del Producto</DialogTitle>
          </DialogHeader>
          {sheetModal.product && (
            <ProductSheetPreview
              product={sheetModal.product}
              categoriaPrincipal={sheetModal.categoriaPrincipal}
              subcategoria={sheetModal.subcategoria}
              onPrint={() => {
                // Imprimir solo la ficha técnica
                const printWindow = window.open('', '_blank', 'width=600,height=800');
                if (printWindow) {
                  printWindow.document.write(`
                    <html><head><title>Imprimir Ficha Técnica</title></head><body style="margin:0;padding:24px;font-family:sans-serif;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:24px;">
                      <div style="width:128px;height:128px;border:1px solid #ddd;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                        ${sheetModal.product.images && sheetModal.product.images[0] ? `<img src='${sheetModal.product.images[0]}' alt='${sheetModal.product.name}' style='max-width:100%;max-height:100%;' />` : '🖼️'}
                      </div>
                      <div style="width:100%;max-width:320px;text-align:left;">
                        <div><strong>SKU:</strong> <span style="font-family:monospace;">${sheetModal.product.sku}</span></div>
                        <div><strong>Nombre:</strong> ${sheetModal.product.name}</div>
                        <div><strong>Marca:</strong> ${sheetModal.product.brand?.name || sheetModal.product.brand || 'Sin marca'}</div>
                        <div><strong>Categoría:</strong> ${sheetModal.categoriaPrincipal}</div>
                        <div><strong>Subcategoría:</strong> ${sheetModal.subcategoria}</div>
                      </div>
                    </div>
                    </body></html>
                  `);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => printWindow.print(), 200);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* Modal de previsualización de imagen */}
      {/* Modal de previsualización de código de barras (SVG generado en frontend) */}
      <Dialog open={barcodeModal.open} onOpenChange={open => setBarcodeModal({ open, sku: open ? barcodeModal.sku : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Previsualización de Código de Barras</DialogTitle>
          </DialogHeader>
          {barcodeModal.sku && (
            <BarcodePreview sku={barcodeModal.sku} />
          )}
        </DialogContent>
      </Dialog>



      <Dialog open={!!previewImage} onOpenChange={open => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Previsualización de imagen</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex items-center justify-center">
              <ProductImage
                src={previewImage}
                alt="Previsualización"
                className="w-full h-auto rounded shadow border max-h-96 object-contain"
                style={{ maxHeight: '400px' }}
                onError={() => {
                  console.error('Error loading preview image:', previewImage);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Modales */}
      <ManageCategoriesModal 
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        onDataChange={loadCategories}
      />
      <ManageAttributesModal
        isOpen={isAttributesModalOpen}
        onClose={() => setIsAttributesModalOpen(false)}
        categories={categories}
      />
      <AddProductModal 
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onProductAdded={handleProductAdded}
        categories={categories}
      />
      {editingProduct && (
        <EditProductModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          product={editingProduct}
          categories={categories}
          onProductUpdated={handleProductUpdated}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, product: deleteModal.product })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-foreground-secondary mb-4">
              ¿Estás seguro de que deseas eliminar el siguiente producto?
            </p>
            {deleteModal.product && (
              <div className="bg-muted p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  {deleteModal.product.images && deleteModal.product.images.length > 0 ? (
                    <ProductImage 
                      src={deleteModal.product.images[0]} 
                      alt={deleteModal.product.name}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      <span className="text-2xl">📦</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{deleteModal.product.name}</p>
                    <p className="text-sm text-foreground-secondary">
                      SKU: {deleteModal.product.sku}
                    </p>
                    <p className="text-sm text-foreground-secondary">
                      Marca: {deleteModal.product.brand?.name || 'Sin marca'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-destructive mt-4 font-medium">
              ⚠️ Esta acción no se puede deshacer. Se eliminarán todos los datos relacionados con este producto.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setDeleteModal({ open: false, product: null })}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Producto
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Movimientos de Stock */}
      <Dialog open={movementModal.open} onOpenChange={(open) => !open && setMovementModal({ open: false, product: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Movimientos de Stock</DialogTitle>
            {movementModal.product && (
              <p className="text-sm text-foreground-secondary">
                {movementModal.product.name} (SKU: {movementModal.product.sku})
              </p>
            )}
          </DialogHeader>
          <div className="py-4">
            {movementModal.product ? (
              <MovementForm 
                productId={movementModal.product.id} 
                onSuccess={(data) => {
                  console.log('Movimiento exitoso:', data);
                  // Refrescar productos para mostrar stock actualizado
                  loadProducts(true);
                  // Cerrar modal después de un momento
                  setTimeout(() => {
                    setMovementModal({ open: false, product: null });
                  }, 1500);
                }}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-foreground-secondary">
                  Selecciona un producto desde la tabla para crear movimientos específicos.
                </p>
                <p className="text-sm text-foreground-secondary mt-2">
                  O usa el botón "📦 Movimientos" en la barra superior para movimientos generales.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Historial de Stock */}
      <Dialog open={historyModal.open} onOpenChange={(open) => !open && setHistoryModal({ open: false, product: null })}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Historial de Stock</DialogTitle>
            {historyModal.product && (
              <p className="text-sm text-foreground-secondary">
                {historyModal.product.name} (SKU: {historyModal.product.sku})
              </p>
            )}
          </DialogHeader>
          <div className="py-4 overflow-y-auto">
            {historyModal.product ? (
              <StockHistory 
                productId={historyModal.product.id}
                onError={(error) => {
                  console.error('Error en historial:', error);
                  addNotification({
                    type: 'error',
                    title: 'Error en Historial',
                    message: error,
                    category: 'inventory'
                  });
                }}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-foreground-secondary">
                  Selecciona un producto desde la tabla para ver su historial específico.
                </p>
                <p className="text-sm text-foreground-secondary mt-2">
                  O usa el botón "📊 Historial" en la barra superior para historial general.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}