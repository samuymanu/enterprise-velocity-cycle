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
import { apiService } from "@/lib/api";
import { useState, useEffect } from "react";
import { Settings, Plus, RefreshCw } from "lucide-react";

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingProducts, setRefreshingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Estado para el modal de nuevo producto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Estado para el modal de gestión
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  
  // Estado para categorías jerárquicas
  const [parentCategories, setParentCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState('');
  
  // Estado del formulario de nuevo producto
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    parentCategoryId: '',
    subCategoryId: '',
    brand: '',
    costPrice: '',
    salePrice: '',
    stock: '',
    minStock: '',
    barcode: ''
  });

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
      const allCategories = data.categories || [];
      
      // Separar categorías principales (nivel 0) y subcategorías (nivel 1+)
      const mainCategories = allCategories.filter((cat: any) => cat.level === 0 || !cat.parentId);
      
      setCategories(allCategories);
      setParentCategories(mainCategories);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  // Función para cargar subcategorías cuando se selecciona una categoría principal
  const handleParentCategoryChange = (parentId: string) => {
    setSelectedParentCategory(parentId);
    
    // Filtrar subcategorías de la categoría principal seleccionada
    const filteredSubCategories = categories.filter((cat: any) => cat.parentId === parentId);
    setSubCategories(filteredSubCategories);
    
    // Resetear subcategoría seleccionada
    setNewProduct(prev => ({
      ...prev,
      parentCategoryId: parentId,
      subCategoryId: ''
    }));
  };

  // Función para manejar envío del formulario
  const handleSubmitNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Determinar la categoría final (subcategoría si existe, sino la principal)
      const finalCategoryId = newProduct.subCategoryId || newProduct.parentCategoryId;
      
      if (!finalCategoryId) {
        alert('Por favor selecciona una categoría');
        return;
      }

      const productData = {
        sku: newProduct.sku,
        name: newProduct.name,
        description: newProduct.description,
        categoryId: finalCategoryId,
        brand: newProduct.brand,
        costPrice: parseFloat(newProduct.costPrice),
        salePrice: parseFloat(newProduct.salePrice),
        stock: parseInt(newProduct.stock),
        minStock: parseInt(newProduct.minStock),
        barcode: newProduct.barcode
      };

      await apiService.products.create(productData);
      
      // Resetear formulario y cerrar modal
      setNewProduct({
        sku: '',
        name: '',
        description: '',
        parentCategoryId: '',
        subCategoryId: '',
        brand: '',
        costPrice: '',
        salePrice: '',
        stock: '',
        minStock: '',
        barcode: ''
      });
      setSelectedParentCategory('');
      setSubCategories([]);
      setIsModalOpen(false);
      
      // Recargar productos (usar refresh para no mostrar loading completo)
      await loadProducts(true);
      
    } catch (error: any) {
      console.error('Error creando producto:', error);
      alert('Error al crear producto: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
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
              Gestionar
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
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary-hover flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Producto</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitNewProduct} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sku">SKU *</Label>
                      <Input
                        id="sku"
                        value={newProduct.sku}
                        onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                        placeholder="Ej: BIC-001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="barcode">Código de Barras</Label>
                      <Input
                        id="barcode"
                        value={newProduct.barcode}
                        onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                        placeholder="Código de barras"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="name">Nombre del Producto *</Label>
                    <Input
                      id="name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                      placeholder="Nombre del producto"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                      placeholder="Descripción del producto"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="parentCategory">Categoría Principal *</Label>
                      <Select value={newProduct.parentCategoryId} onValueChange={handleParentCategoryChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría principal" />
                        </SelectTrigger>
                        <SelectContent>
                          {parentCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="subCategory">Subcategoría</Label>
                      <Select 
                        value={newProduct.subCategoryId} 
                        onValueChange={(value) => setNewProduct({...newProduct, subCategoryId: value})}
                        disabled={!selectedParentCategory}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedParentCategory 
                              ? "Primero selecciona categoría principal" 
                              : subCategories.length === 0
                                ? "No hay subcategorías disponibles"
                                : "Seleccionar subcategoría"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {subCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        Opcional: Si no seleccionas subcategoría, se usará la categoría principal
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="brand">Marca *</Label>
                    <Input
                      id="brand"
                      value={newProduct.brand}
                      onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                      placeholder="Ej: Trek, Honda, Bell, etc."
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="costPrice">Precio de Costo *</Label>
                      <Input
                        id="costPrice"
                        type="number"
                        step="0.01"
                        value={newProduct.costPrice}
                        onChange={(e) => setNewProduct({...newProduct, costPrice: e.target.value})}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="salePrice">Precio de Venta *</Label>
                      <Input
                        id="salePrice"
                        type="number"
                        step="0.01"
                        value={newProduct.salePrice}
                        onChange={(e) => setNewProduct({...newProduct, salePrice: e.target.value})}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stock">Stock Inicial *</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="minStock">Stock Mínimo *</Label>
                      <Input
                        id="minStock"
                        type="number"
                        value={newProduct.minStock}
                        onChange={(e) => setNewProduct({...newProduct, minStock: e.target.value})}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creando...' : 'Crear Producto'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
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
                  <th className="text-left p-4 font-medium text-foreground-secondary">Producto</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Categoría</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Stock</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Precio</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Estado</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const statusInfo = getStatusInfo(product);
                  return (
                    <tr key={product.id} className="border-b border-card-border hover:bg-background-secondary/50">
                      <td className="p-4">
                        <span className="font-mono text-sm">{product.sku}</span>
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
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">👁️</Button>
                          <Button variant="ghost" size="sm">✏️</Button>
                          <Button variant="ghost" size="sm">📋</Button>
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

      {/* Modal de Gestión de Categorías */}
      <ManageCategoriesModal 
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        onDataChange={() => {
          loadCategories();
        }}
      />
    </AppLayout>
  );
}