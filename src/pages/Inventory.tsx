import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiService } from "@/lib/api";
import { Category, Product, Brand } from "@/types/inventory";
import { Download, Plus, Printer, RefreshCw, Search, Settings, X, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Barcode from "react-barcode";
import html2canvas from "html2canvas";
import { ManageCategoriesModal } from "@/components/inventory/ManageCategoriesModal";
import { EditProductModal } from "@/components/inventory/EditProductModal";

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    parentCategoryId: '',
    subCategoryId: '',
    brandId: '',
    costPrice: '',
    salePrice: '',
    stock: '',
    minStock: '',
    imageUrl: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [filterSubCategories, setFilterSubCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const barcodeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const parentCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [selectedParentCategoryForm, setSelectedParentCategoryForm] = useState<string | null>(null);

  // Handlers para el modal de edición
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedProduct(null);
  };

  const handleProductUpdated = () => {
    handleCloseEditModal();
    loadProducts(); // Recargar la lista de productos
  };


  const autoLogin = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await apiService.auth.verify();
      } else {
        await apiService.auth.login('admin@bikeshop.com', 'admin123');
      }
      return true;
    } catch (error) {
      console.error('Error en la autenticación:', error);
      setError('Error de autenticación. Por favor, recarga la página.');
      return false;
    }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const data = await apiService.brands.getAll();
      setBrands(data.brands || []);
    } catch (error) {
      console.error('Error cargando marcas:', error);
      setError('No se pudieron cargar las marcas.');
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiService.categories.getAll();
      const allCategories = data.categories || [];
      const mainCategories = allCategories.filter((cat: any) => cat.level === 0 || !cat.parentId);
      setCategories(allCategories);
      setSubCategories(mainCategories);
    } catch (error) {
      console.error('Error cargando categorías:', error);
      setError('No se pudieron cargar las categorías.');
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const filters: any = {
        search: searchTerm,
        categoryId: selectedSubCategory !== 'all' 
          ? selectedSubCategory 
          : selectedCategory !== 'all' 
            ? selectedCategory 
            : undefined,
        brandId: selectedBrand !== 'all' ? selectedBrand : undefined,
      };

      // Limpiar filtros undefined
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

      const response = await apiService.products.getAll(filters);
      setProducts(response.products || []);
    } catch (err: any) {
      console.error('Error cargando productos:', err);
      setError(err.message || 'No se pudieron cargar los productos.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchTerm, selectedCategory, selectedSubCategory, selectedBrand, setProducts, setError, setIsLoading, setIsRefreshing]);

  const handleParentCategoryChangeInForm = (parentId: string) => {
    setSelectedParentCategoryForm(parentId);
    const filteredSubCategories = categories.filter((cat: any) => cat.parentId === parentId);
    setSubCategories(filteredSubCategories);
    setNewProduct(prev => ({
      ...prev,
      parentCategoryId: parentId,
      subCategoryId: ''
    }));
  };

  const handleFilterParentCategoryChange = (parentId: string) => {
    setSelectedCategory(parentId);
    if (parentId === 'all') {
      setFilterSubCategories([]);
    } else {
      const subCats = categories.filter(cat => cat.parentId === parentId);
      setFilterSubCategories(subCats);
    }
    setSelectedSubCategory('all');
  };

  const handleFilter = () => {
    loadProducts();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedSubCategory("all");
    setSelectedBrand("all");
    setFilterSubCategories([]);
    // La recarga se activa por el cambio de estado en el useEffect
  };

  const handleSubmitNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null); // Limpiar errores previos
    try {
      const finalCategoryId = newProduct.subCategoryId || newProduct.parentCategoryId;
      if (!finalCategoryId) {
        alert('Por favor selecciona una categoría');
        setIsSubmitting(false);
        return;
      }

      let imageUrl = '';
      if (selectedFile) {
        try {
          const response = await apiService.products.uploadImage(selectedFile);
          imageUrl = response.imageUrl;
        } catch (uploadError) {
          console.error('Error subiendo imagen:', uploadError);
          alert('Hubo un error al subir la imagen. Por favor, inténtalo de nuevo.');
          setIsSubmitting(false);
          return;
        }
      }

      const productData = {
        sku: newProduct.sku,
        name: newProduct.name,
        description: newProduct.description,
        categoryId: finalCategoryId,
        brandId: newProduct.brandId,
        costPrice: parseFloat(newProduct.costPrice),
        salePrice: parseFloat(newProduct.salePrice),
        stock: parseInt(newProduct.stock, 10),
        minStock: parseInt(newProduct.minStock, 10),
        imageUrl: imageUrl
      };

      await apiService.products.create(productData);
      setNewProduct({
        sku: '', name: '', description: '', parentCategoryId: '', subCategoryId: '',
        brandId: '', costPrice: '', salePrice: '', stock: '', minStock: '', imageUrl: ''
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setSelectedParentCategoryForm('');
      setSubCategories([]);
      setIsModalOpen(false);
      await loadProducts();
    } catch (error: any) {
      console.error('Error creando producto:', error);
      setFormError(error.message || 'Error desconocido al crear el producto. Revisa los campos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleBarcodeAction = (sku: string, action: 'download' | 'print') => {
    const barcodeElement = barcodeRefs.current[sku];
    if (barcodeElement) {
      html2canvas(barcodeElement, { backgroundColor: '#ffffff', scale: 3 })
        .then((canvas) => {
          const image = canvas.toDataURL('image/png');
          if (action === 'download') {
            const link = document.createElement('a');
            link.href = image;
            link.download = `barcode-${sku}.png`;
            link.click();
          } else if (action === 'print') {
            const printWindow = window.open('', '_blank');
            printWindow?.document.write(`
              <html><head><title>Imprimir Código de Barras - ${sku}</title></head>
              <body style="margin: 0; text-align: center;">
                <img src="${image}" style="max-width: 100%;" />
                <script>
                  window.onload = () => {
                    window.print();
                    window.onafterprint = () => window.close();
                  }
                </script>
              </body></html>
            `);
            printWindow?.document.close();
          }
        });
    }
  };

  // Efecto para inicialización (login y categorías)
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      const loggedIn = await autoLogin();
      if (loggedIn) {
        await Promise.all([
          loadCategories(),
          loadBrands()
        ]);
      }
      // La carga de productos se gestiona en otro efecto
    };
    initialize();
  }, [autoLogin, loadCategories, loadBrands]);

  // Efecto para cargar productos al cambiar los filtros
  useEffect(() => {
    const handler = setTimeout(() => {
      loadProducts();
    }, 300); // Debounce para no sobrecargar con cada letra tecleada

    return () => {
      clearTimeout(handler);
    };
  }, [loadProducts]); // Se ejecuta cuando la función loadProducts cambia (es decir, cuando sus dependencias cambian)

  const getStatusInfo = (product: Product) => {
    if (product.stock === 0) {
      return { label: 'Agotado', variant: 'destructive' as const };
    }
    if (product.stock <= product.minStock) {
      return { label: 'Stock Bajo', variant: 'destructive' as const };
    }
    return { label: 'Activo', variant: 'default' as const };
  };

  if (isLoading && products.length === 0) {
    return (
      <AppLayout>
        <div className="container-enterprise py-8 text-center">
          <p className="text-lg">Cargando inventario...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container-enterprise py-8 text-center text-red-600">
          <p className="text-lg">Error: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Recargar Página
          </Button>
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
            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
              ⚠️ {products.filter(p => p.stock <= p.minStock).length} productos bajo mínimo
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setIsManageModalOpen(true)} className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Gestionar
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setIsRefreshing(true); loadProducts(); }} disabled={isRefreshing} className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
                  {formError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                      <strong className="font-bold">¡Error!</strong>
                      <span className="block sm:inline"> {formError}</span>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="sku">SKU (Stock Keeping Unit) *</Label>
                    <Input id="sku" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="Ej: BIC-001, CAS-RED-MD, etc." required />
                    <p className="text-xs text-gray-500 mt-1">Este será el identificador único para generar el código de barras.</p>
                  </div>
                  <div>
                    <Label htmlFor="name">Nombre del Producto *</Label>
                    <Input id="name" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Nombre del producto" required />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea id="description" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Descripción del producto" rows={3} />
                  </div>
                  <div>
                    <Label htmlFor="productImage">Imagen del Producto</Label>
                    <Input id="productImage" type="file" onChange={handleFileChange} accept="image/*" />
                    {previewUrl && (
                      <div className="mt-4">
                        <img src={previewUrl} alt="Vista previa" className="w-32 h-32 object-cover rounded-md" />
                        <Button variant="link" size="sm" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}>Quitar imagen</Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="parentCategory">Categoría Principal *</Label>
                      <Select value={newProduct.parentCategoryId} onValueChange={handleParentCategoryChangeInForm}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar categoría principal" /></SelectTrigger>
                        <SelectContent>
                          {parentCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="subCategory">Subcategoría</Label>
                      <Select value={newProduct.subCategoryId} onValueChange={(value) => setNewProduct({ ...newProduct, subCategoryId: value })} disabled={!selectedParentCategoryForm || subCategories.length === 0}>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedParentCategoryForm ? "Primero selecciona categoría" : subCategories.length === 0 ? "No hay subcategorías" : "Seleccionar subcategoría"} />
                        </SelectTrigger>
                        <SelectContent>
                          {subCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">Opcional: Si no seleccionas subcategoría, se usará la principal.</p>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="brand">Marca *</Label>
                    <Select value={newProduct.brandId} onValueChange={(value) => setNewProduct({ ...newProduct, brandId: value })} required>
                      <SelectTrigger><SelectValue placeholder="Seleccionar marca" /></SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="costPrice">Precio de Costo *</Label>
                      <Input id="costPrice" type="number" step="0.01" value={newProduct.costPrice} onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })} placeholder="0.00" required />
                    </div>
                    <div>
                      <Label htmlFor="salePrice">Precio de Venta *</Label>
                      <Input id="salePrice" type="number" step="0.01" value={newProduct.salePrice} onChange={(e) => setNewProduct({ ...newProduct, salePrice: e.target.value })} placeholder="0.00" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stock">Stock Inicial *</Label>
                      <Input id="stock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} placeholder="0" required />
                    </div>
                    <div>
                      <Label htmlFor="minStock">Stock Mínimo *</Label>
                      <Input id="minStock" type="number" value={newProduct.minStock} onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })} placeholder="0" required />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creando...' : 'Crear Producto'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-foreground-secondary">Productos Totales</h3>
            <p className="text-2xl font-bold">{products.length}</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-foreground-secondary">Valor Inventario (Costo)</h3>
            <p className="text-2xl font-bold">${products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-foreground-secondary">Valor Inventario (Venta)</h3>
            <p className="text-2xl font-bold">${products.reduce((sum, p) => sum + (p.salePrice * p.stock), 0).toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-destructive/10 border-destructive">
            <h3 className="text-sm font-medium text-destructive">Productos con Stock Bajo</h3>
            <p className="text-2xl font-bold text-destructive">{products.filter(p => p.stock <= p.minStock).length}</p>
          </Card>
        </div>

        {/* Product List */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">Lista de Productos</h2>
            <p className="text-sm text-foreground-secondary">Busca, filtra y gestiona todos los productos de tu inventario.</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="relative flex-grow sm:flex-grow-0 sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input type="text" placeholder="Buscar por nombre o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full sm:w-64" />
              </div>
              <Select value={selectedCategory} onValueChange={handleFilterParentCategoryChange}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {parentCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory} disabled={selectedCategory === 'all' || filterSubCategories.length === 0}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Subcategoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las subcategorías</SelectItem>
                  {filterSubCategories.map(subCategory => (
                    <SelectItem key={subCategory.id} value={subCategory.id}>{subCategory.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Marca" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleClearFilters} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium text-foreground-secondary">Producto</th>
                  <th className="p-4 text-left text-sm font-medium text-foreground-secondary">Categoría</th>
                  <th className="p-4 text-left text-sm font-medium text-foreground-secondary">Stock</th>
                  <th className="p-4 text-left text-sm font-medium text-foreground-secondary">Precio Venta</th>
                  <th className="p-4 text-left text-sm font-medium text-foreground-secondary">Status</th>
                  <th className="p-4 text-center text-sm font-medium text-foreground-secondary">Código de Barras</th>
                  <th className="p-4 text-right text-sm font-medium text-foreground-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
                  products.map((product) => {
                    const status = getStatusInfo(product);
                    const categoryHierarchy = [product.category?.parent?.name, product.category?.name].filter(Boolean).join(' > ');
                    return (
                      <tr key={product.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 align-top">
                          <div className="flex items-start gap-4">
                            <img src={product.imageUrl || '/placeholder.svg'} alt={product.name} className="w-16 h-16 object-cover rounded-md" />
                            <div>
                              <p className="font-semibold">{product.name}</p>
                              <p className="text-sm text-foreground-secondary">{product.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-top text-sm">{categoryHierarchy}</td>
                        <td className="p-4 align-top">
                          <p className="font-semibold">{product.stock}</p>
                          <p className="text-xs text-foreground-secondary">Mínimo: {product.minStock}</p>
                        </td>
                        <td className="p-4 align-top font-semibold">${product.salePrice.toLocaleString()}</td>
                        <td className="p-4 align-top">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="p-4 align-top">
                          <div className="flex flex-col items-center gap-2">
                            <div ref={el => { if (el) barcodeRefs.current[product.sku] = el; }} className="p-2 bg-white">
                              <Barcode value={product.sku} height={40} width={1.5} fontSize={12} />
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="icon" onClick={() => handleBarcodeAction(product.sku, 'download')} title="Descargar Código de Barras">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => handleBarcodeAction(product.sku, 'print')} title="Imprimir Código de Barras">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-top text-right">
                          <div className="flex justify-end items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)} title="Editar Producto">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-foreground-secondary">
                      No se encontraron productos que coincidan con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <ManageCategoriesModal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          onDataChange={() => {
            loadCategories();
            loadProducts();
          }}
        />

        {selectedProduct && (
          <EditProductModal
            isOpen={isEditModalOpen}
            onClose={handleCloseEditModal}
            product={selectedProduct}
            onProductUpdated={handleProductUpdated}
            categories={categories}
            brands={brands}
          />
        )}

      </div>
    </AppLayout>
  );
}