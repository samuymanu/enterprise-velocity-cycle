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
import { EditProductModal } from "@/components/inventory/EditProductModal"; // Importar el nuevo modal
import { apiService } from "@/lib/api";
import { useState, useEffect } from "react";
import { Settings, Plus, RefreshCw, FilePenLine, Barcode, Download, FileText } from "lucide-react";

export default function Inventory() {
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

  // Función para hacer login automático (temporal para desarrollo)
  const autoLogin = async () => {
    try {
      await apiService.auth.login('admin@bikeshop.com', 'admin123');
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Error en auto-login:', error);
      setError('Error de autenticación');
      return false;
    }
  };

  // Función para cargar productos
  const loadProducts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshingProducts(true);
      } else {
        setLoading(true);
      }
      const data = await apiService.products.getAll();
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
  useEffect(() => {
    const initializeData = async () => {
      const loginSuccess = await autoLogin();
      if (loginSuccess) {
        await Promise.all([
          loadProducts(),
          loadCategories()
        ]);
      }
    };
    
    initializeData();
  }, []);

  // Función para mapear status del backend al frontend
  const getStatusInfo = (product: any) => {
    if (product.stock <= product.minStock) {
      return { label: 'Stock Bajo', variant: 'destructive' as const };
    }
    return { label: 'Activo', variant: 'default' as const };
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container-enterprise py-8">
          <div className="text-center">
            <p className="text-lg">Cargando productos...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container-enterprise py-8">
          <div className="text-center text-red-600">
            <p className="text-lg">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Reintentar
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container-enterprise py-8 space-y-8">
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-primary">{products.length}</p>
            <p className="text-sm text-foreground-secondary">Total Productos</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-success">
              ${products.reduce((sum, p) => sum + (p.salePrice * p.stock), 0).toLocaleString()}
            </p>
            <p className="text-sm text-foreground-secondary">Valor Inventario</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-warning">
              {products.filter(p => p.stock <= p.minStock).length}
            </p>
            <p className="text-sm text-foreground-secondary">Stock Crítico</p>
          </Card>
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-info">
              {products.length > 0 ? Math.round((products.filter(p => p.stock > p.minStock).length / products.length) * 100) : 0}%
            </p>
            <p className="text-sm text-foreground-secondary">Stock Saludable</p>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="enterprise-card p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="Buscar por SKU, nombre, marca o código de barras..."
              className="enterprise-input flex-1"
            />
            <div className="flex gap-2">
              <select className="enterprise-input">
                <option>Todas las categorías</option>
                <option>Bicicletas</option>
                <option>Motocicletas</option>
                <option>Repuestos</option>
                <option>Accesorios</option>
                <option>Cascos</option>
              </select>
              <select className="enterprise-input">
                <option>Todos los estados</option>
                <option>Stock normal</option>
                <option>Stock bajo</option>
                <option>Sin stock</option>
                <option>Inactivos</option>
              </select>
              <Button>🔍 Filtrar</Button>
            </div>
          </div>
        </Card>

        {/* Products Table */}
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
                  <th className="text-left p-4 font-medium text-foreground-secondary">URL Imagen (debug)</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Producto</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Categoría</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Stock</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Precio</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Estado</th>
                  <th className="text-center p-4 font-medium text-foreground-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const statusInfo = getStatusInfo(product);
                  const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;
                  return (
                    <tr key={product.id} className="border-b border-card-border hover:bg-background-secondary/50">
                      <td className="p-4">
                        <span className="font-mono text-sm">{product.sku}</span>
                      </td>
                      <td className="p-4">
                        {firstImage ? (
                          <img
                            src={`http://localhost:3001${firstImage}`}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded border border-border bg-white"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = '';
                              target.alt = `Error: ${firstImage}`;
                              target.parentElement!.innerHTML = `<div class='text-xs text-red-600 break-all'>Error cargando imagen<br/>${firstImage}</div>`;
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center bg-muted rounded border border-border text-muted-foreground text-xl">
                            🖼️
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-xs break-all max-w-xs">
                        {firstImage ? `http://localhost:3001${firstImage}` : 'Sin imagen'}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-foreground-secondary">{product.brand || 'Sin marca'}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {product.category?.name || 'Sin categoría'}
                          {product.category?.subcategory && ` / ${product.category.subcategory}`}
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
                           <a href={`${apiService.getApiUrl()}/products/${product.id}/barcode`} target="_blank" rel="noopener noreferrer" title="Ver Código de Barras">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                 <Barcode className="h-4 w-4" />
                              </Button>
                           </a>
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
                })}
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
      </div>

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