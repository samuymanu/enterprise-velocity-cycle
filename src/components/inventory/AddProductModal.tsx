import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiService } from "@/lib/api";
import { Attribute } from "@/types/inventory";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
  categories: any[];
}

export default function AddProductModal({ isOpen, onClose, onProductAdded, categories }: AddProductModalProps) {
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    brand: '',
    sku: '',
    costPrice: '',
    salePrice: '',
    stock: '',
    minStock: '',
    maxStock: '',
    barcode: '',
    parentCategoryId: '',
    subCategoryId: '',
  });

  // Add handleSubmit function
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Add your form submission logic here
    // For now, just prevent default and close modal
    // setIsSubmitting(true);
    // ...submit logic
    // setIsSubmitting(false);
    // onProductAdded();
    // onClose();
  };

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [parentCategories, setParentCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
  const [attrErrors, setAttrErrors] = useState<Record<string, string>>({});
  const [attrLoading, setAttrLoading] = useState(false);
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [attrModalError, setAttrModalError] = useState('');
  
  const [newAttribute, setNewAttribute] = useState({
    name: '',
    type: 'STRING',
    isRequired: false,
    values: '',
    unit: '',
    helpText: '',
    isGlobal: false,
    dependsOn: '',
    minValue: '',
    maxValue: '',
    regex: '',
    selectedCategories: [] as string[],
  });
  const [existingAttributes, setExistingAttributes] = useState<Attribute[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpiar formulario al cerrar
  useEffect(() => {
    if (!isOpen) {
      setNewProduct({
        name: '',
        description: '',
        brand: '',
        sku: '',
        costPrice: '',
        salePrice: '',
        stock: '',
        minStock: '',
        maxStock: '',
        barcode: '',
        parentCategoryId: '',
        subCategoryId: '',
      });
      setImages([]);
      setImagePreviews([]);
      setError('');
      setAttributes([]);
      setAttributeValues({});
      setAttrErrors({});
      setSubcategories([]);
    }
  }, [isOpen]);

  // Manejar selección de imágenes
  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 5) {
      setError('Máximo 5 imágenes permitidas');
      return;
    }
    setImages(files);
    // Crear previews
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  // Limpiar previews al desmontar
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

// Cargar categorías padre al abrir el modal
useEffect(() => {
  if (isOpen) {
    const parents = categories.filter(cat => cat.level === 0);
    setParentCategories(parents);
  }
}, [isOpen, categories]);

// Manejar cambio de categoría principal
const handleParentCategoryChange = (value: string) => {
  setNewProduct(prev => ({
    ...prev,
    parentCategoryId: value,
    subCategoryId: '', // Reset subcategory when parent changes
  }));
  // Filtrar subcategorías
  const subs = categories.filter(cat => cat.parentId === value);
  setSubcategories(subs);
  // Aquí podrías cargar atributos relacionados a la categoría si es necesario
};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Producto</DialogTitle>
          <DialogDescription>
            Completa la información para crear un nuevo producto.
          </DialogDescription>
        </DialogHeader>
        <div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Inputs dinámicos de atributos */}
            {attrLoading && <div className="text-xs text-muted-foreground">Cargando atributos...</div>}
            {!attrLoading && attributes.length === 0 && (
              <div className="text-xs text-muted-foreground border rounded p-2 bg-background/50">
                Esta categoría no tiene atributos configurados.
              </div>
            )}
            {attributes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attributes.map(attr => (
                  <div key={attr.attributeId} className="flex flex-col">
                    <Label className="mb-1 font-medium text-sm">
                      {attr.name}
                      {attr.isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    
                    {attr.type === 'STRING' && (
                      <Input
                        value={attributeValues[attr.attributeId] || ''}
                        onChange={e => setAttributeValues(v => ({ ...v, [attr.attributeId]: e.target.value }))}
                        placeholder={`Ingrese ${attr.name}`}
                        className={attrErrors[attr.attributeId] ? 'border-destructive' : ''}
                      />
                    )}
                    
                    {attr.type === 'NUMBER' && (
                      <Input
                        type="number"
                        value={attributeValues[attr.attributeId] || ''}
                        onChange={e => setAttributeValues(v => ({ ...v, [attr.attributeId]: e.target.value }))}
                        placeholder={`Ingrese ${attr.name}`}
                        className={attrErrors[attr.attributeId] ? 'border-destructive' : ''}
                      />
                    )}
                    
                    {attr.type === 'BOOLEAN' && (
                      <Switch
                        checked={!!attributeValues[attr.attributeId]}
                        onCheckedChange={val => setAttributeValues(v => ({ ...v, [attr.attributeId]: val }))}
                      />
                    )}
                    
                    {attr.type === 'LIST' && (
                      <Select
                        value={attributeValues[attr.attributeId] || ''}
                        onValueChange={val => setAttributeValues(v => ({ ...v, [attr.attributeId]: val }))}
                      >
                        <SelectTrigger className={attrErrors[attr.attributeId] ? 'border-destructive' : ''}>
                          <SelectValue placeholder={`Seleccionar ${attr.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {attr.values.map((val: string) => (
                            <SelectItem key={val} value={val}>{val}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {attr.type === 'DATE' && (
                      <Input
                        type="date"
                        value={attributeValues[attr.attributeId] || ''}
                        onChange={e => setAttributeValues(v => ({ ...v, [attr.attributeId]: e.target.value }))}
                        className={attrErrors[attr.attributeId] ? 'border-destructive' : ''}
                      />
                    )}
                    
                    {attrErrors[attr.attributeId] && (
                      <span className="text-xs text-destructive mt-1">{attrErrors[attr.attributeId]}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Imágenes del Producto */}
            <div>
              <Label>Imágenes del Producto</Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImagesChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  Elegir archivos
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Puedes seleccionar hasta 5 imágenes.
                </p>
              </div>
              
              {/* Previsualizaciones */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                  {imagePreviews.map((preview, index) => (
                    <img
                      key={index}
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                      onError={e => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Información básica del producto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="Nombre del producto"
                  required
                />
              </div>

              <div>
                <Label htmlFor="brand">Marca *</Label>
                <Input
                  id="brand"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  placeholder="Ej: Trek, Honda, Bell, etc."
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parentCategory">Categoría Principal *</Label>
                <Select
                  value={newProduct.parentCategoryId}
                  onValueChange={handleParentCategoryChange}
                >
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
                <Label htmlFor="subcategory">Subcategoría</Label>
                <Select
                  value={newProduct.subCategoryId}
                  onValueChange={(value) => setNewProduct({ ...newProduct, subCategoryId: value })}
                  disabled={!newProduct.parentCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Primero selecciona categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Opcional: Si no seleccionas subcategoría, se usará la categoría principal
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="costPrice">Precio Costo *</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={newProduct.costPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, costPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="salePrice">Precio Venta *</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  value={newProduct.salePrice}
                  onChange={(e) => setNewProduct({ ...newProduct, salePrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="stock">Stock Actual *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
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
                  onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear Producto'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}