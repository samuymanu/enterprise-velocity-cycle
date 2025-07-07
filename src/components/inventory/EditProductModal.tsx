import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";
import { Brand, Category, Product } from "@/types/inventory";
import { useEffect, useMemo, useState } from "react";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  brands: Brand[];
  onProductUpdated: () => void;
}

export function EditProductModal({ isOpen, onClose, product, categories, brands, onProductUpdated }: EditProductModalProps) {
  const [editedProduct, setEditedProduct] = useState<Partial<Product>>({});
  const [selectedParentCategory, setSelectedParentCategory] = useState<string | undefined>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parentCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const subCategories = useMemo(() => {
    if (!selectedParentCategory) return [];
    return categories.filter(c => c.parentId === selectedParentCategory);
  }, [selectedParentCategory, categories]);


  useEffect(() => {
    if (product) {
      // 1. Set the full product data for editing
      setEditedProduct(product);
      
      // 2. Set the image preview
      setPreviewUrl(product.imageUrl || null);

      // 3. Determine and set the category selectors
      if (product.category) {
        if (product.category.parentId) {
          // It's a subcategory
          setSelectedParentCategory(product.category.parentId);
        } else {
          // It's a parent category
          setSelectedParentCategory(product.category.id);
        }
      } else {
        setSelectedParentCategory(undefined);
      }

      // 4. Reset file input
      setSelectedFile(null);
    }
  }, [product, categories]);

  const handleValueChange = (field: keyof Product, value: any) => {
    setEditedProduct(prev => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (newCategoryId: string) => {
    const category = categories.find(c => c.id === newCategoryId);
    if (category) {
        if (category.parentId) { // It's a subcategory
            setSelectedParentCategory(category.parentId);
        } else { // It's a parent category
            setSelectedParentCategory(category.id);
            // If a parent is selected, we should clear the subcategory selection
            // by setting the main categoryId to the parent's ID.
        }
        setEditedProduct(prev => ({ ...prev, categoryId: newCategoryId, category }));
    }
  };

  const handleParentCategoryChange = (newParentId: string) => {
    setSelectedParentCategory(newParentId);
    // When parent changes, we set the product's category to this parent
    // The user can then optionally select a subcategory
    setEditedProduct(prev => ({ ...prev, categoryId: newParentId, category: categories.find(c => c.id === newParentId) }));
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setIsSubmitting(true);

    try {
      let imageUrl = editedProduct.imageUrl;
      if (selectedFile) {
        const response = await apiService.products.uploadImage(selectedFile);
        imageUrl = response.imageUrl;
      }

      const productDataToUpdate = {
        name: editedProduct.name,
        description: editedProduct.description,
        categoryId: editedProduct.categoryId,
        brandId: editedProduct.brandId,
        costPrice: parseFloat(editedProduct.costPrice as any),
        salePrice: parseFloat(editedProduct.salePrice as any),
        stock: parseInt(editedProduct.stock as any, 10),
        minStock: parseInt(editedProduct.minStock as any, 10),
        imageUrl: imageUrl,
      };

      await apiService.products.update(product.id, productDataToUpdate);
      onProductUpdated();
      onClose();
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Error al actualizar el producto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Producto: {product.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sku">SKU (solo lectura)</Label>
            <Input id="sku" value={editedProduct.sku} readOnly disabled />
          </div>
          <div>
            <Label htmlFor="name">Nombre del Producto *</Label>
            <Input id="name" value={editedProduct.name || ''} onChange={(e) => handleValueChange('name', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={editedProduct.description || ''} onChange={(e) => handleValueChange('description', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="productImage">Imagen del Producto</Label>
            <Input id="productImage" type="file" onChange={handleFileChange} accept="image/*" />
            {previewUrl && (
              <div className="mt-4">
                <img src={previewUrl} alt="Vista previa" className="w-32 h-32 object-cover rounded-md" />
                <Button variant="link" size="sm" onClick={() => { setSelectedFile(null); setPreviewUrl(null); handleValueChange('imageUrl', ''); }}>Quitar imagen</Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parentCategory">Categoría Principal *</Label>
              <Select value={selectedParentCategory} onValueChange={handleParentCategoryChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subCategory">Subcategoría</Label>
              <Select 
                value={editedProduct.categoryId}
                onValueChange={handleCategoryChange}
                disabled={!selectedParentCategory || subCategories.length === 0}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar subcategoría" /></SelectTrigger>
                <SelectContent>
                  {subCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="brand">Marca *</Label>
            <Select value={editedProduct.brandId} onValueChange={(value) => handleValueChange('brandId', value)} required>
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
              <Input id="costPrice" type="number" step="0.01" value={editedProduct.costPrice || 0} onChange={(e) => handleValueChange('costPrice', parseFloat(e.target.value))} required />
            </div>
            <div>
              <Label htmlFor="salePrice">Precio de Venta *</Label>
              <Input id="salePrice" type="number" step="0.01" value={editedProduct.salePrice || 0} onChange={(e) => handleValueChange('salePrice', parseFloat(e.target.value))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Stock *</Label>
              <Input id="stock" type="number" value={editedProduct.stock || 0} onChange={(e) => handleValueChange('stock', parseInt(e.target.value, 10))} required />
            </div>
            <div>
              <Label htmlFor="minStock">Stock Mínimo *</Label>
              <Input id="minStock" type="number" value={editedProduct.minStock || 0} onChange={(e) => handleValueChange('minStock', parseInt(e.target.value, 10))} required />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
