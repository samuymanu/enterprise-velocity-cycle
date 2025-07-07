import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiService } from "@/lib/api";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
  categories: any[];
}

export function AddProductModal({ isOpen, onClose, onProductAdded, categories }: AddProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentCategories, setParentCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Estado del formulario
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    parentCategoryId: '',
    subCategoryId: '',
    brand: '',
    costPrice: '',
    salePrice: '',
    stock: '',
    minStock: ''
  });

  // Función para subir imagen
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:3001/api/products/upload-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error subiendo imagen');
      }

      const data = await response.json();
      setImageUrl(data.data.imageUrl);
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen');
    }
  };

  // Cargar categorías principales cuando se abra el modal
  useEffect(() => {
    if (isOpen && categories.length > 0) {
      const mainCategories = categories.filter((cat: any) => cat.level === 0 || !cat.parentId);
      setParentCategories(mainCategories);
    }
  }, [isOpen, categories]);

  // Función para cargar subcategorías
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
  const handleSubmit = async (e: React.FormEvent) => {
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
        name: newProduct.name,
        description: newProduct.description,
        categoryId: finalCategoryId,
        brand: newProduct.brand,
        costPrice: parseFloat(newProduct.costPrice),
        salePrice: parseFloat(newProduct.salePrice),
        stock: parseInt(newProduct.stock),
        minStock: parseInt(newProduct.minStock),
        imageUrl: imageUrl || null
      };

      await apiService.products.create(productData);
      
      // Resetear formulario y cerrar modal
      setNewProduct({
        name: '',
        description: '',
        parentCategoryId: '',
        subCategoryId: '',
        brand: '',
        costPrice: '',
        salePrice: '',
        stock: '',
        minStock: ''
      });
      setSelectedParentCategory('');
      setSubCategories([]);
      setImageUrl('');
      onClose();
      onProductAdded();
      
    } catch (error: any) {
      console.error('Error creando producto:', error);
      alert('Error al crear producto: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Producto</DialogTitle>
          <DialogDescription>
            Complete la información del producto. El SKU y código de barras se generarán automáticamente.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-primary-foreground">
            <strong>🚀 Generación Automática:</strong> El SKU y código de barras se generarán automáticamente 
            basado en la categoría seleccionada (ej: BIC-001, MOT-001, ACC-001).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo de imagen */}
          <div>
            <Label htmlFor="image">Imagen del Producto</Label>
            <div className="flex items-center gap-4">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="flex-1"
              />
              {imageUrl && (
                <div className="w-16 h-16 border border-border rounded overflow-hidden">
                  <img 
                    src={`http://localhost:3001${imageUrl}`} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
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
                      {category.name} {category.code && `(${category.code})`}
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
              <p className="text-xs text-muted-foreground mt-1">
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}