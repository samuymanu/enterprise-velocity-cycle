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
import AddProductModal from "@/components/inventory/AddProductModal";
import { EditProductModal } from "@/components/inventory/EditProductModal";
import { DynamicFilters } from "@/components/inventory/DynamicFilters";
import { apiService } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { BarcodePreview } from "./BarcodePreview";
import { ProductSheetPreview } from "./ProductSheetPreview";
import { Settings, Plus, RefreshCw, FilePenLine, Barcode, Download, FileText, Eye } from "lucide-react";
import ProductImage from "@/components/inventory/ProductImage";



export default function Inventory() {
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Estado para modales
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isAttributesModalOpen, setIsAttributesModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // Estado para el modal de edición
  const [editingProduct, setEditingProduct] = useState<any | null>(null); // Estado para el producto en edición
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});
  // Estado y ref para debounce de búsqueda
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Controla si ya se intentó auto-login para evitar bucles
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const autoLogin = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
      return true;
    }
    if (autoLoginAttempted) {
      // Ya se intentó, no volver a intentar
      setLoading(false);
      return false;
    }
    setAutoLoginAttempted(true);
    try {
      await apiService.auth.login('admin@bikeshop.com', 'admin123');
      setIsAuthenticated(true);
      return true;
    } catch (error: any) {
      if (error.message && error.message.includes('429')) {
        setError('Demasiados intentos de autenticación. Espera unos minutos antes de reintentar.');
      } else {
        setError('Error de autenticación');
      }
      setIsAuthenticated(false);
      setLoading(false);
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
      const data = await apiService.products.getAll(filters);
      setProducts(data.products || []);
      setError(null);
    } catch (error: any) {
      console.error('Error cargando productos:', error);
      setError(error.message || 'Error cargando productos');
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
      const data = await apiService.categories.getAll();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error cargando categorías:', error);
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

  // Efecto para cargar datos al montar el componente
  // Carga inicial y recarga por filtros, pero solo una vez
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      const loginSuccess = await autoLogin();
      if (!loginSuccess) {
        setLoading(false);
        return;
      }
      try {
        await loadCategories();
        // Cargar productos con filtros actuales
        const filters: any = { ...dynamicFilters };
        if (selectedCategory) filters.categoryId = selectedCategory;
        await loadProducts(false, filters);
      } catch (e) {
        setError('Error cargando datos iniciales');
      } finally {
        setLoading(false);
      }
    };
    if (!localStorage.getItem('authToken')) {
      initializeData();
    } else {
      setIsAuthenticated(true);
      setLoading(true);
      loadCategories()
        .then(() => {
          const filters: any = { ...dynamicFilters };
          if (selectedCategory) filters.categoryId = selectedCategory;
          return loadProducts(false, filters);
        })
        .catch(() => setError('Error cargando datos iniciales'))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoginAttempted]);

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
    mainContent = (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <span className="text-4xl mb-4 text-red-500">❌</span>
        <p className="text-lg text-red-600">{error}</p>
        <Button onClick={() => {
          setError(null);
          setAutoLoginAttempted(false);
          window.location.reload();
        }} className="mt-4">
          Reintentar
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

        {/* Filtros avanzados */}
        <Card className="enterprise-card p-6 mb-2">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              id="inventory-search"
              name="inventory-search"
              type="text"
              placeholder="Buscar por SKU, nombre, marca o código de barras..."
              className="enterprise-input flex-1"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                id="inventory-category"
                name="inventory-category"
                className="enterprise-input"
                value={selectedCategory || ''}
                onChange={e => setSelectedCategory(e.target.value || null)}
              >
                <option value="">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select id="inventory-status" name="inventory-status" className="enterprise-input" onChange={e => loadProducts(false, { status: e.target.value, ...dynamicFilters, categoryId: selectedCategory })}>
                <option value="">Todos los estados</option>
                <option value="ACTIVE">Stock normal</option>
                <option value="STOCK_BAJO">Stock bajo</option>
                <option value="SIN_STOCK">Sin stock</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
              <Button onClick={() => loadProducts(true, { ...dynamicFilters, categoryId: selectedCategory })}>🔍 Filtrar</Button>
            </div>
          </div>
          {/* Filtros dinámicos por atributos */}
          <DynamicFilters
            categoryId={selectedCategory}
            onFilterChange={setDynamicFilters}
          />
        </Card>

        {/* Products Table Mejorada */}
        <Card className="enterprise-card">
          <div className="p-6 border-b border-card-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Lista de Productos</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">📥 Importar</Button>
                <Button variant="outline" size="sm">📤 Exportar</Button>
                <Button variant="outline" size="sm">🏷️ Etiquetas</Button>
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
                            <p className="text-sm text-foreground-secondary">{product.brand || 'Sin marca'}</p>
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
                              title="Ficha Técnica"
                              onClick={() => {
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
                                setSheetModal({ open: true, product, categoriaPrincipal, subcategoria });
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
                        <div><strong>Marca:</strong> ${sheetModal.product.brand || 'Sin marca'}</div>
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
          {previewImage && (() => {
            let finalUrl = previewImage;
            if (previewImage.startsWith('http')) {
              // URL absoluta
              finalUrl = previewImage;
            } else if (previewImage.startsWith('/uploads')) {
              // Servir archivos estáticos directamente desde el host base (sin /api)
              const apiUrl = apiService.getApiUrl();
              // Extraer solo el host base (sin /api)
              const url = new URL(apiUrl);
              finalUrl = `${url.origin}${previewImage}`;
            } else {
              // Otros casos, usar apiService.getApiUrl()
              finalUrl = `${apiService.getApiUrl()}${previewImage.startsWith('/') ? previewImage : `/${previewImage}`}`;
            }
            return (
              <div>
                <img
                  src={finalUrl}
                  alt="Previsualización"
                  className="w-full h-auto rounded shadow border"
                  style={{ maxHeight: 400, objectFit: 'contain' }}
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    const msg = document.getElementById('img-error-msg');
                    if (msg) msg.style.display = 'block';
                  }}
                />
                <div id="img-error-msg" style={{display: 'none'}} className="mt-4 text-center text-destructive">
                  No se pudo cargar la imagen.<br />
                  Verifica la URL final o revisa la consola del navegador.
                </div>
              </div>
            );
          })()}
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
    </AppLayout>
  );
}