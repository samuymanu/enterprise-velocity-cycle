import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
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
  // Para imágenes múltiples
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
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

  // Atributos dinámicos
  const [attributes, setAttributes] = useState<any[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
  const [attrLoading, setAttrLoading] = useState(false);
  const [attrErrors, setAttrErrors] = useState<Record<string, string>>({});

  // Estado para modal de atributo personalizado
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
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
  });
  const [attrModalError, setAttrModalError] = useState('');
  // Manejar selección de imágenes
  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const fileArr = Array.from(files);
    setSelectedImages(fileArr);
    // Previsualizaciones
    const previews = fileArr.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  // Limpiar URLs de previsualización al cerrar modal o cambiar imágenes
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  // Cargar categorías principales cuando se abra el modal
  useEffect(() => {
    if (isOpen && categories.length > 0) {
      const mainCategories = categories.filter((cat: any) => cat.level === 0 || !cat.parentId);
      setParentCategories(mainCategories);
    }
  }, [isOpen, categories]);

  // Función para cargar subcategorías
  const handleParentCategoryChange = async (parentId: string) => {
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
    // Limpiar atributos
    setAttributes([]);
    setAttributeValues({});
    setAttrErrors({});
    // Cargar atributos dinámicos de la categoría principal
    if (parentId) {
      setAttrLoading(true);
      try {
        const data = await apiService.products.getAttributesByCategory(parentId);
        setAttributes(data.attributes || []);
      } catch {
        setAttributes([]);
      } finally {
        setAttrLoading(false);
      }
    }
  };

  // Cargar atributos al seleccionar subcategoría
  useEffect(() => {
    const loadAttrs = async () => {
      const catId = newProduct.subCategoryId || newProduct.parentCategoryId;
      if (!catId) {
        setAttributes([]);
        setAttributeValues({});
        setAttrErrors({});
        return;
      }
      setAttrLoading(true);
      try {
        const data = await apiService.products.getAttributesByCategory(catId);
        setAttributes(data.attributes || []);
      } catch {
        setAttributes([]);
      } finally {
        setAttrLoading(false);
      }
    };
    loadAttrs();
  }, [newProduct.subCategoryId]);

  // Función para manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Validar atributos requeridos
    const errors: Record<string, string> = {};
    for (const attr of attributes) {
      if (attr.isRequired && (attributeValues[attr.attributeId] === undefined || attributeValues[attr.attributeId] === '' || attributeValues[attr.attributeId] === null)) {
        errors[attr.attributeId] = 'Este campo es obligatorio';
      }
    }
    setAttrErrors(errors);
    if (Object.keys(errors).length > 0) {
      setIsSubmitting(false);
      return;
    }
    try {
      // Determinar la categoría final (subcategoría si existe, sino la principal)
      const finalCategoryId = newProduct.subCategoryId || newProduct.parentCategoryId;
      if (!finalCategoryId) {
        alert('Por favor selecciona una categoría');
        setIsSubmitting(false);
        return;
      }
      // Construir FormData
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('description', newProduct.description);
      formData.append('categoryId', finalCategoryId);
      formData.append('brand', newProduct.brand);
      formData.append('costPrice', newProduct.costPrice);
      formData.append('salePrice', newProduct.salePrice);
      formData.append('stock', newProduct.stock);
      formData.append('minStock', newProduct.minStock);
      // Imágenes
      selectedImages.forEach((file) => {
        formData.append('images', file);
      });
      // Atributos dinámicos
      formData.append('attributes', JSON.stringify(
        attributes.map(attr => ({ attributeId: attr.attributeId, value: attributeValues[attr.attributeId] ?? '' }))
      ));
      // Enviar a backend
      const response = await fetch('http://localhost:3001/api/products', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creando producto');
      }
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
      setSelectedImages([]);
      setImagePreviews([]);
      setAttributes([]);
      setAttributeValues({});
      setAttrErrors({});
      if (fileInputRef.current) fileInputRef.current.value = '';
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

        {/* Botón para agregar atributo personalizado */}
        <div className="flex justify-end mb-2">
          <Button type="button" variant="secondary" onClick={() => setIsAttrModalOpen(true)}>
            + Agregar atributo personalizado
          </Button>
        </div>

        {/* Modal para crear atributo personalizado */}
        <Dialog open={isAttrModalOpen} onOpenChange={setIsAttrModalOpen}>
          <DialogContent className="max-w-md max-h-[95vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Nuevo atributo personalizado</DialogTitle>
              <DialogDescription>Define el nombre, tipo y si es requerido. Si es lista, separa los valores por coma.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <form
                onSubmit={async (e) => {
                e.preventDefault();
                setAttrModalError('');
                if (!newAttribute.name.trim()) {
                  setAttrModalError('El nombre es obligatorio');
                  return;
                }
                if (newAttribute.type === 'LIST' && !newAttribute.values.trim()) {
                  setAttrModalError('Debes ingresar valores para la lista');
                  return;
                }
                try {
                  const catId = newProduct.subCategoryId || newProduct.parentCategoryId;
                  if (!catId) {
                    setAttrModalError('Selecciona una categoría primero');
                    return;
                  }
                  // Llamada al backend para crear el atributo
                  const res = await apiService.products.createAttribute({
                    categoryId: catId,
                    name: newAttribute.name,
                    type: newAttribute.type,
                    isRequired: newAttribute.isRequired,
                    values: newAttribute.type === 'LIST' ? newAttribute.values.split(',').map(v => v.trim()) : undefined,
                    unit: newAttribute.unit || undefined,
                    helpText: newAttribute.helpText || undefined,
                    isGlobal: newAttribute.isGlobal,
                    dependsOn: newAttribute.dependsOn || undefined,
                    minValue: newAttribute.type === 'NUMBER' && newAttribute.minValue !== '' ? Number(newAttribute.minValue) : undefined,
                    maxValue: newAttribute.type === 'NUMBER' && newAttribute.maxValue !== '' ? Number(newAttribute.maxValue) : undefined,
                    regex: newAttribute.type === 'STRING' && newAttribute.regex ? newAttribute.regex : undefined,
                  } as {
                    categoryId: string;
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
                  });
                  if (res.error) throw new Error(res.error);
                  // Recargar atributos
                  const data = await apiService.products.getAttributesByCategory(catId);
                  setAttributes(data.attributes || []);
                  setIsAttrModalOpen(false);
                  setNewAttribute({
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
                  });
                } catch (err: any) {
                  setAttrModalError(err.message || 'Error creando atributo');
                }
              }}
              className="space-y-3"
            >
              <div>
                <Label>Nombre</Label>
                <Input value={newAttribute.name} onChange={e => setNewAttribute(a => ({ ...a, name: e.target.value }))} required />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={newAttribute.type} onValueChange={val => setNewAttribute(a => ({ ...a, type: val }))}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRING">Texto</SelectItem>
                    <SelectItem value="NUMBER">Número</SelectItem>
                    <SelectItem value="BOOLEAN">Booleano</SelectItem>
                    <SelectItem value="LIST">Lista</SelectItem>
                    <SelectItem value="DATE">Fecha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newAttribute.type === 'LIST' && (
                <div>
                  <Label>Valores (separados por coma)</Label>
                  <Input value={newAttribute.values} onChange={e => setNewAttribute(a => ({ ...a, values: e.target.value }))} placeholder="Ej: Rojo, Azul, Verde" />
                </div>
              )}
              {newAttribute.type === 'NUMBER' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Valor mínimo</Label>
                    <Input type="number" value={newAttribute.minValue} onChange={e => setNewAttribute(a => ({ ...a, minValue: e.target.value }))} placeholder="Ej: 0" />
                  </div>
                  <div>
                    <Label>Valor máximo</Label>
                    <Input type="number" value={newAttribute.maxValue} onChange={e => setNewAttribute(a => ({ ...a, maxValue: e.target.value }))} placeholder="Ej: 100" />
                  </div>
                </div>
              )}
              {newAttribute.type === 'STRING' && (
                <div>
                  <Label>Regex (validación)</Label>
                  <Input value={newAttribute.regex} onChange={e => setNewAttribute(a => ({ ...a, regex: e.target.value }))} placeholder="Ej: ^[A-Za-z0-9]+$" />
                </div>
              )}
              <div>
                <Label>Unidad (opcional)</Label>
                <Input value={newAttribute.unit} onChange={e => setNewAttribute(a => ({ ...a, unit: e.target.value }))} placeholder="Ej: cm, kg" />
              </div>
              <div>
                <Label>Texto de ayuda (opcional)</Label>
                <Input value={newAttribute.helpText} onChange={e => setNewAttribute(a => ({ ...a, helpText: e.target.value }))} placeholder="Ej: Solo números enteros" />
              </div>
              <div>
                <Label>Depende de (ID de atributo)</Label>
                <Input value={newAttribute.dependsOn} onChange={e => setNewAttribute(a => ({ ...a, dependsOn: e.target.value }))} placeholder="Ej: id de otro atributo" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newAttribute.isRequired} onCheckedChange={val => setNewAttribute(a => ({ ...a, isRequired: val }))} />
                <Label>Obligatorio</Label>
                <Switch checked={newAttribute.isGlobal} onCheckedChange={val => setNewAttribute(a => ({ ...a, isGlobal: val }))} />
                <Label>Global</Label>
              </div>
              {attrModalError && <div className="text-xs text-destructive">{attrModalError}</div>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsAttrModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Crear atributo</Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Inputs dinámicos de atributos */}
          {attrLoading && <div className="text-xs text-muted-foreground">Cargando atributos...</div>}
          {!attrLoading && attributes.length === 0 && (
            <div className="text-xs text-muted-foreground border rounded p-2 bg-background/50">Esta categoría no tiene atributos configurados.</div>
          )}
          {attributes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attributes.map(attr => (
                <div key={attr.attributeId} className="flex flex-col">
                  <Label className="mb-1 font-medium text-sm">{attr.name}{attr.isRequired && <span className="text-destructive">*</span>}</Label>
                  {attr.type === 'STRING' && (
                    <Input
                      id={`attr-${attr.attributeId}`}
                      name={`attr-${attr.attributeId}`}
                      value={attributeValues[attr.attributeId] || ''}
                      onChange={e => setAttributeValues(v => ({ ...v, [attr.attributeId]: e.target.value }))}
                      placeholder={`Ingrese ${attr.name}`}
                      className={attrErrors[attr.attributeId] ? 'border-destructive' : ''}
                    />
                  )}
                  {attr.type === 'NUMBER' && (
                    <Input
                      id={`attr-${attr.attributeId}`}
                      name={`attr-${attr.attributeId}`}
                      type="number"
                      value={attributeValues[attr.attributeId] || ''}
                      onChange={e => setAttributeValues(v => ({ ...v, [attr.attributeId]: e.target.value }))}
                      placeholder={`Ingrese ${attr.name}`}
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
                      <SelectTrigger id={`attr-${attr.attributeId}-trigger`} name={`attr-${attr.attributeId}-trigger`}>
                        <SelectValue placeholder={`Seleccionar ${attr.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        {attr.values.map((val: string) => (
                          <SelectItem key={val} value={val}>{val}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {attr.type === 'DATE' && (
                    <Input
                      id={`attr-${attr.attributeId}`}
                      name={`attr-${attr.attributeId}`}
                      type="date"
                      value={attributeValues[attr.attributeId] || ''}
                      onChange={e => setAttributeValues(v => ({ ...v, [attr.attributeId]: e.target.value }))}
                    />
                  )}
                  {attrErrors[attr.attributeId] && (
                    <span className="text-xs text-destructive">{attrErrors[attr.attributeId]}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Campo de imágenes múltiples */}
          <div>
            <Label htmlFor="images">Imágenes del Producto</Label>
            <div className="flex items-center gap-4 flex-wrap">
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesChange}
                className="flex-1"
                ref={fileInputRef}
              />
              {imagePreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {imagePreviews.map((url, idx) => (
                    <div key={idx} className="w-16 h-16 border border-border rounded overflow-hidden relative">
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Puedes seleccionar hasta 5 imágenes.</p>
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