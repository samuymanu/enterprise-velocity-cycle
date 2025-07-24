import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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
    categoryId: '',
    subCategoryId: '',
  });

  // Add handleSubmit function
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!newProduct.name.trim() || !newProduct.brand.trim() || !newProduct.costPrice || !newProduct.salePrice || !newProduct.stock || !newProduct.minStock || !newProduct.categoryId) {
      setError('Completa todos los campos obligatorios marcados con *');
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Detectar atributos personalizados (no tienen attributeId real)
      let updatedAttributes = [...attributes];
      for (let i = 0; i < updatedAttributes.length; i++) {
        const attr = updatedAttributes[i];
        if (attr.attributeId.startsWith('custom-')) {
          let payload: any = {
            categoryId: newProduct.categoryId,
            name: attr.name,
            type: attr.type,
            isRequired: false,
            unit: attr.unit || undefined,
            helpText: attr.helpText || undefined,
            isGlobal: false,
            dependsOn: attr.dependsOn || undefined,
            minValue: typeof attr.minValue === 'string'
              ? (attr.minValue !== '' ? Number(attr.minValue) : undefined)
              : (attr.minValue !== undefined ? attr.minValue : undefined),
            maxValue: typeof attr.maxValue === 'string'
              ? (attr.maxValue !== '' ? Number(attr.maxValue) : undefined)
              : (attr.maxValue !== undefined ? attr.maxValue : undefined),
            regex: attr.regex || undefined,
          };
          if (attr.type === 'LIST') {
            let optionsArr: string[] = [];
            if (Array.isArray(attr.values)) {
              optionsArr = attr.values;
            } else if (typeof attr.values === 'string') {
              optionsArr = (attr.values as string).split(',').map(v => v.trim()).filter(Boolean);
            }
            payload.options = optionsArr;
          }
          let res;
          try {
            res = await apiService.products.createAttribute(payload);
          } catch (err: any) {
            setIsSubmitting(false);
            setError('Error al crear atributo: ' + (err?.message || JSON.stringify(err)));
            return;
          }
          const realAttrId = res.attribute?.id || res.id;
          // Asignar el atributo a la categoría (importante para que el backend lo acepte en el producto)
          try {
            await apiService.products.assignAttributeToCategory(realAttrId, newProduct.categoryId);
          } catch (err: any) {
            setIsSubmitting(false);
            setError('Error al asignar atributo a la categoría: ' + (err?.message || JSON.stringify(err)));
            return;
          }
          updatedAttributes[i] = {
            ...attr,
            attributeId: realAttrId,
          };
        }
      }

      // Convertir campos numéricos a number antes de agregarlos al FormData
      const numericFields = [
        'costPrice',
        'salePrice',
        'stock',
        'minStock',
        'maxStock',
      ];
      const productToSend: any = { ...newProduct };
      numericFields.forEach(field => {
        if (productToSend[field] !== undefined && productToSend[field] !== '') {
          productToSend[field] = Number(productToSend[field]);
        }
      });

      // 2. Guardar producto con los IDs reales
      const uuidRegex = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$/;
      if (!uuidRegex.test(productToSend.categoryId)) {
        setIsSubmitting(false);
        setError('El ID de la categoría no es válido. Selecciona una categoría válida.');
        return;
      }
      if (productToSend.subCategoryId && !uuidRegex.test(productToSend.subCategoryId)) {
        setIsSubmitting(false);
        setError('El ID de la subcategoría no es válido. Selecciona una subcategoría válida o deja vacío.');
        return;
      }

      const productPayload: any = {
        ...productToSend,
        costPrice: Number(productToSend.costPrice),
        salePrice: Number(productToSend.salePrice),
        stock: Number(productToSend.stock),
        minStock: Number(productToSend.minStock),
        maxStock: productToSend.maxStock ? Number(productToSend.maxStock) : undefined,
        attributes: updatedAttributes.map(attr => {
          let value = attributeValues[attr.attributeId] ?? '';
          if (attr.type === 'NUMBER' && value !== '') value = Number(value);
          if (attr.type === 'BOOLEAN') value = Boolean(value);
          return { ...attr, value };
        }),
      };
      const formData = new FormData();
      Object.entries(productPayload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'attributes') {
            formData.append('attributes', JSON.stringify(value));
          } else {
            formData.append(key, value as any);
          }
        }
      });
      images.forEach((file, idx) => {
        formData.append('images', file);
      });
      await apiService.products.create(formData);
      setIsSubmitting(false);
      onProductAdded();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Error al crear el producto');
    }
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
  // Para sugerir atributos existentes
  const [attributeSuggestions, setAttributeSuggestions] = useState<Attribute[]>([]);
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
        categoryId: '',
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
const handleCategoryChange = async (value: string) => {
  setNewProduct(prev => ({
    ...prev,
    categoryId: value,
    subCategoryId: '', // Reset subcategory when parent changes
  }));
  // Filtrar subcategorías
  const subs = categories.filter(cat => cat.parentId === value);
  setSubcategories(subs);
  // Cargar atributos existentes de la categoría seleccionada
  if (value) {
    setAttrLoading(true);
    try {
      // Suponiendo que apiService.products.getAttributesByCategory existe
      const attrs = await apiService.products.getAttributesByCategory(value);
      setExistingAttributes(attrs || []);
    } catch (e) {
      setExistingAttributes([]);
    }
    setAttrLoading(false);
  } else {
    setExistingAttributes([]);
  }
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
          {/* Modal para agregar atributo personalizado */}
          <Dialog open={isAttrModalOpen} onOpenChange={setIsAttrModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar atributo personalizado</DialogTitle>
                <DialogDescription>
                  Crea un atributo temporal solo para este producto.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nombre del atributo *</Label>
                  <Input
                    value={newAttribute.name}
                    onChange={e => {
                      const value = e.target.value;
                      setNewAttribute(a => ({ ...a, name: value }));
                      // Buscar sugerencias de atributos existentes (ignorando mayúsculas/minúsculas)
                      const attrsArr = Array.isArray(existingAttributes) ? existingAttributes : [];
                      if (value.trim() && newProduct.categoryId) {
                        const suggestions = attrsArr.filter(attr =>
                          attr.name && typeof attr.name === 'string' &&
                          attr.name.toLowerCase().includes(value.trim().toLowerCase())
                        );
                        setAttributeSuggestions(suggestions);
                      } else {
                        setAttributeSuggestions([]);
                      }
                      setAttrModalError('');
                    }}
                    placeholder="Ej: Color, Material, Tamaño"
                  />
                  {/* Sugerencias de atributos existentes */}
                  {attributeSuggestions.length > 0 && (
                    <div className="mt-2 border rounded bg-muted p-2 text-xs">
                      <div className="mb-1 font-semibold">Atributos existentes:</div>
                      <ul>
                        {attributeSuggestions.map(attr => (
                          <li key={attr.attributeId} className="flex items-center justify-between py-1">
                            <span>{attr.name} <span className="text-muted-foreground">({attr.type})</span></span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Asignar atributo existente al producto
                                setAttributes(prev => {
                                  if (prev.some(a => a.attributeId === attr.attributeId)) return prev;
                                  return [...prev, attr];
                                });
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
                                setAttrModalError('');
                                setIsAttrModalOpen(false);
                              }}
                            >
                              Usar
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select
                    value={newAttribute.type}
                    onValueChange={val => setNewAttribute(a => ({ ...a, type: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STRING">Texto</SelectItem>
                      <SelectItem value="NUMBER">Número</SelectItem>
                      <SelectItem value="BOOLEAN">Sí/No</SelectItem>
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
                      placeholder="Ej: Rojo, Verde, Azul"
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsAttrModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!newAttribute.name.trim()) return setAttrModalError('El nombre es obligatorio');
                      // Validar que no exista un atributo con el mismo nombre (ignorando mayúsculas/minúsculas)
                      const attrsArr = Array.isArray(existingAttributes) ? existingAttributes : [];
                      const exists = attrsArr.some(attr =>
                        attr.name && typeof attr.name === 'string' &&
                        attr.name.trim().toLowerCase() === newAttribute.name.trim().toLowerCase()
                      );
                      if (exists) {
                        setAttrModalError('Ya existe un atributo con ese nombre. Usa el buscador para seleccionarlo.');
                        return;
                      }
                      // Validar que los atributos tipo LIST tengan opciones
                      if (newAttribute.type === 'LIST') {
                        const valuesArr = newAttribute.values.split(',').map(v => v.trim()).filter(Boolean);
                        if (valuesArr.length === 0) {
                          setAttrModalError('Debes ingresar al menos una opción para el atributo tipo lista.');
                          return;
                        }
                      }
                      // Crear objeto atributo personalizado temporal
                      const tempAttr = {
                        attributeId: `custom-${Date.now()}`,
                        name: newAttribute.name,
                        type: newAttribute.type,
                        isRequired: false,
                        values: newAttribute.type === 'LIST' ? newAttribute.values.split(',').map(v => v.trim()).filter(Boolean) : [],
                      };
                      setAttributes(prev => [...prev, tempAttr]);
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
                      setAttrModalError('');
                      setIsAttrModalOpen(false);
                    }}
                  >
                    Guardar atributo
                  </Button>
                </div>
                {attrModalError && <div className="text-xs text-destructive">{attrModalError}</div>}
              </div>
            </DialogContent>
          </Dialog>
          {/* Botón para agregar atributo personalizado */}
          <div className="flex justify-end mb-2">
            <Button type="button" variant="secondary" onClick={() => setIsAttrModalOpen(true)}>
              + Agregar atributo personalizado
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-xs text-destructive mb-2">{error}</div>}
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
                        value={attributeValues[attr.attributeId] || undefined}
                        onValueChange={val => setAttributeValues(v => ({ ...v, [attr.attributeId]: val }))}
                      >
                        <SelectTrigger className={attrErrors[attr.attributeId] ? 'border-destructive' : ''}>
                          <SelectValue placeholder={`Seleccionar ${attr.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {attr.values
                            .filter((val: string) => val && val.trim() !== '')
                            .map((val: string) => (
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
                  value={newProduct.name ?? ''}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value ?? '' })}
                  placeholder="Nombre del producto"
                  required
                />
              </div>

              <div>
                <Label htmlFor="brand">Marca *</Label>
                <Input
                  id="brand"
                  value={newProduct.brand ?? ''}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value ?? '' })}
                  placeholder="Ej: Trek, Honda, Bell, etc."
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newProduct.description ?? ''}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value ?? '' })}
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="parentCategory">Categoría Principal *</Label>
                <Select
                  value={newProduct.categoryId}
                  onValueChange={handleCategoryChange}
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
                  disabled={!newProduct.categoryId}
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