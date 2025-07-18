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

  // Manejar cambio de categoría padre
  const handleParentCategoryChange = async (parentId: string) => {
    setNewProduct(prev => ({ ...prev, parentCategoryId: parentId, subCategoryId: '' }));
    setSubcategories([]);
    setAttributes([]);
    setAttributeValues({});
    
    // Buscar subcategorías
    const parent = categories.find(cat => cat.id === parentId);
    if (parent?.children) {
      setSubcategories(parent.children);
    }

    // Cargar atributos para esta categoría
    if (parentId) {
      setAttrLoading(true);
      try {
        const data = await apiService.products.getAttributesByCategory(parentId);
        setAttributes(data.attributes || []);
      } catch (err) {
        console.error('Error cargando atributos:', err);
      } finally {
        setAttrLoading(false);
      }
    }
  };

  // Cargar atributos al seleccionar subcategoría
  useEffect(() => {
    if (newProduct.subCategoryId) {
      setAttrLoading(true);
      apiService.products.getAttributesByCategory(newProduct.subCategoryId)
        .then(data => {
          setAttributes(data.attributes || []);
          setAttrLoading(false);
        })
        .catch(err => {
          console.error('Error cargando atributos:', err);
          setAttrLoading(false);
        });
    }
  }, [newProduct.subCategoryId]);

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setAttrErrors({});

    try {
      // Validar atributos requeridos
      const requiredAttrs = attributes.filter(attr => attr.isRequired);
      const newAttrErrors: Record<string, string> = {};
      
      for (const attr of requiredAttrs) {
        const value = attributeValues[attr.attributeId];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newAttrErrors[attr.attributeId] = `${attr.name} es requerido`;
        }
      }

      if (Object.keys(newAttrErrors).length > 0) {
        setAttrErrors(newAttrErrors);
        throw new Error('Por favor completa todos los atributos requeridos');
      }

      // Crear FormData
      const formData = new FormData();
      Object.entries(newProduct).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      // Agregar categoría (usar subcategoría si existe, sino categoría padre)
      const categoryId = newProduct.subCategoryId || newProduct.parentCategoryId;
      if (categoryId) {
        formData.append('categoryId', categoryId);
      }

      // Agregar imágenes
      images.forEach(image => {
        formData.append('images', image);
      });

      // Agregar valores de atributos
      Object.entries(attributeValues).forEach(([attrId, value]) => {
        if (value !== undefined && value !== '') {
          formData.append(`attributes[${attrId}]`, String(value));
        }
      });

      const result = await apiService.products.create(formData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      onProductAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Producto</DialogTitle>
          <DialogDescription>
            Complete la información del producto. El SKU y código de barras se generarán automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded">
              {error}
            </div>
          )}

          {/* Botón para agregar atributo personalizado */}
          <div className="flex justify-center">
            <Button type="button" variant="secondary" onClick={() => setIsAttrModalOpen(true)}>
              + Agregar atributo personalizado
            </Button>
          </div>

          {/* Modal para crear atributo personalizado */}
          <Dialog open={isAttrModalOpen} onOpenChange={(open) => {
            setIsAttrModalOpen(open);
            if (open) {
              // Cargar atributos existentes para el campo "Depende de"
              fetch(`${apiService.getApiUrl()}/attributes`, {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                  'Content-Type': 'application/json'
                }
              })
              .then(res => res.json())
              .then(data => {
                setExistingAttributes(data.attributes || []);
              })
              .catch(err => console.error('Error cargando atributos:', err));
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[95vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Nuevo atributo personalizado</DialogTitle>
                <DialogDescription>Define el nombre, tipo y si es requerido. Si es lista, separa los valores por coma.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 px-1">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAttrModalError('');
                    
                    if (!newAttribute.name.trim()) {
                      setAttrModalError('El nombre es obligatorio');
                      return;
                    }
                    
                    if (newAttribute.selectedCategories.length === 0) {
                      setAttrModalError('Selecciona al menos una categoría');
                      return;
                    }
                    
                    if (newAttribute.type === 'LIST' && !newAttribute.values.trim()) {
                      setAttrModalError('Debes ingresar valores para la lista');
                      return;
                    }

                    try {
                      // Preparar datos
                      let values: string[] = [];
                      if (newAttribute.type === 'LIST' && newAttribute.values) {
                        values = newAttribute.values.split(',').map(v => v.trim()).filter(v => v);
                      }
                      
                      // Crear atributo usando la primera categoría seleccionada
                      const res = await apiService.products.createAttribute({
                        categoryId: newAttribute.selectedCategories[0],
                        name: newAttribute.name,
                        type: newAttribute.type,
                        isRequired: newAttribute.isRequired,
                        values,
                        unit: newAttribute.unit || undefined,
                        helpText: newAttribute.helpText || undefined,
                        isGlobal: newAttribute.isGlobal,
                        dependsOn: newAttribute.dependsOn || undefined,
                        minValue: newAttribute.minValue ? parseFloat(newAttribute.minValue) : undefined,
                        maxValue: newAttribute.maxValue ? parseFloat(newAttribute.maxValue) : undefined,
                        regex: newAttribute.regex || undefined,
                      });
                      
                      if (res.error) throw new Error(res.error);
                      
                      // Asignar a categorías adicionales si las hay
                      const attributeId = res.attribute?.id;
                      if (attributeId && newAttribute.selectedCategories.length > 1) {
                        for (let i = 1; i < newAttribute.selectedCategories.length; i++) {
                          const categoryId = newAttribute.selectedCategories[i];
                          await fetch(`${apiService.getApiUrl()}/attributes/${attributeId}/categories`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ categoryIds: [categoryId] })
                          });
                        }
                      }
                      
                      // Recargar atributos si hay categoría seleccionada
                      const catId = newProduct.subCategoryId || newProduct.parentCategoryId;
                      if (catId && newAttribute.selectedCategories.includes(catId)) {
                        const data = await apiService.products.getAttributesByCategory(catId);
                        setAttributes(data.attributes || []);
                      }
                      
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
                        selectedCategories: [],
                      });
                    } catch (err: any) {
                      setAttrModalError(err.message || 'Error creando atributo');
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <Label>Nombre</Label>
                    <Input 
                      value={newAttribute.name} 
                      onChange={e => setNewAttribute(a => ({ ...a, name: e.target.value }))} 
                      required 
                    />
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
                      <Input 
                        value={newAttribute.values} 
                        onChange={e => setNewAttribute(a => ({ ...a, values: e.target.value }))} 
                        placeholder="Ej: Rojo, Azul, Verde" 
                      />
                    </div>
                  )}

                  {newAttribute.type === 'NUMBER' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Valor mínimo</Label>
                        <Input 
                          type="number" 
                          value={newAttribute.minValue} 
                          onChange={e => setNewAttribute(a => ({ ...a, minValue: e.target.value }))} 
                          placeholder="Ej: 0" 
                        />
                      </div>
                      <div>
                        <Label>Valor máximo</Label>
                        <Input 
                          type="number" 
                          value={newAttribute.maxValue} 
                          onChange={e => setNewAttribute(a => ({ ...a, maxValue: e.target.value }))} 
                          placeholder="Ej: 100" 
                        />
                      </div>
                    </div>
                  )}

                  {newAttribute.type === 'STRING' && (
                    <div>
                      <Label>Regex (validación)</Label>
                      <Input 
                        value={newAttribute.regex} 
                        onChange={e => setNewAttribute(a => ({ ...a, regex: e.target.value }))} 
                        placeholder="Ej: ^[A-Za-z0-9]+$" 
                      />
                    </div>
                  )}

                  <div>
                    <Label>Unidad (opcional)</Label>
                    <Input 
                      value={newAttribute.unit} 
                      onChange={e => setNewAttribute(a => ({ ...a, unit: e.target.value }))} 
                      placeholder="Ej: cm, kg" 
                    />
                  </div>

                  <div>
                    <Label>Texto de ayuda (opcional)</Label>
                    <Input 
                      value={newAttribute.helpText} 
                      onChange={e => setNewAttribute(a => ({ ...a, helpText: e.target.value }))} 
                      placeholder="Ej: Solo números enteros" 
                    />
                  </div>

                  {/* Selección de categorías */}
                  <div>
                    <Label>Asignar a categorías/subcategorías</Label>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                      {categories.map(category => (
                        <div key={category.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`cat-${category.id}`}
                              checked={newAttribute.selectedCategories.includes(category.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewAttribute(a => ({
                                    ...a,
                                    selectedCategories: [...a.selectedCategories, category.id]
                                  }));
                                } else {
                                  setNewAttribute(a => ({
                                    ...a,
                                    selectedCategories: a.selectedCategories.filter(id => id !== category.id)
                                  }));
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor={`cat-${category.id}`} className="font-medium">
                              {category.name}
                            </Label>
                          </div>
                          {category.children?.map((subcat: any) => (
                            <div key={subcat.id} className="flex items-center gap-2 ml-6">
                              <input
                                type="checkbox"
                                id={`cat-${subcat.id}`}
                                checked={newAttribute.selectedCategories.includes(subcat.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewAttribute(a => ({
                                      ...a,
                                      selectedCategories: [...a.selectedCategories, subcat.id]
                                    }));
                                  } else {
                                    setNewAttribute(a => ({
                                      ...a,
                                      selectedCategories: a.selectedCategories.filter(id => id !== subcat.id)
                                    }));
                                  }
                                }}
                                className="rounded"
                              />
                              <Label htmlFor={`cat-${subcat.id}`} className="text-sm text-muted-foreground">
                                → {subcat.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Campo "Depende de" mejorado */}
                  <div>
                    <Label>Depende de (atributo padre)</Label>
                    <Select value={newAttribute.dependsOn} onValueChange={val => setNewAttribute(a => ({ ...a, dependsOn: val }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar atributo padre (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Ninguno</SelectItem>
                        {existingAttributes.map(attr => (
                          <SelectItem key={attr.attributeId} value={attr.attributeId}>
                            {attr.name} ({attr.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Este atributo se mostrará solo cuando el atributo padre tenga un valor
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={newAttribute.isRequired} 
                        onCheckedChange={val => setNewAttribute(a => ({ ...a, isRequired: val }))} 
                      />
                      <Label>Obligatorio</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={newAttribute.isGlobal} 
                        onCheckedChange={val => setNewAttribute(a => ({ ...a, isGlobal: val }))} 
                      />
                      <Label>Global</Label>
                    </div>
                  </div>

                  {attrModalError && (
                    <div className="text-sm text-destructive">{attrModalError}</div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsAttrModalOpen(false)}>
                      Cancelar
                    </Button>
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