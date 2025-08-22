import { useState, useEffect, useRef } from 'react';
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { X, Upload, AlertCircle } from 'lucide-react';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any; // El producto a editar
  categories: any[];
  onProductUpdated: () => void;
}

export function EditProductModal({ isOpen, onClose, product, categories, onProductUpdated }: EditProductModalProps) {
  const { toast } = useToast();
  
  // Estado del formulario mejorado
  const [formData, setFormData] = useState<any>({});
  const [originalData, setOriginalData] = useState<any>({});
  
  // Estado para validación
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationState, setValidationState] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  
  // Atributos dinámicos
  const [attributes, setAttributes] = useState<any[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, any>>({});
  const [attrLoading, setAttrLoading] = useState(false);
  const [attrErrors, setAttrErrors] = useState<Record<string, string>>({});
  
  // Imágenes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para cambios detectados
  const [hasChanges, setHasChanges] = useState(false);

  // Función de validación similar al AddProductModal
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'El nombre es obligatorio';
        if (value.length < 2) return 'El nombre debe tener al menos 2 caracteres';
        if (value.length > 100) return 'El nombre no puede exceder 100 caracteres';
        return '';
      
      case 'costPrice':
        const cost = parseFloat(value);
        if (isNaN(cost) || cost < 0) return 'El precio de costo debe ser un número positivo';
        return '';
      
      case 'salePrice':
        const sale = parseFloat(value);
        if (isNaN(sale) || sale < 0) return 'El precio de venta debe ser un número positivo';
        const costPrice = parseFloat(formData.costPrice);
        if (!isNaN(costPrice) && sale < costPrice) return 'El precio de venta no puede ser menor al costo';
        return '';
      
      case 'stock':
        const stock = parseInt(value);
        if (isNaN(stock) || stock < 0) return 'El stock debe ser un número no negativo';
        return '';
      
      case 'minStock':
        const minStock = parseInt(value);
        if (isNaN(minStock) || minStock < 0) return 'El stock mínimo debe ser un número no negativo';
        return '';
      
      case 'maxStock':
        if (value && value.trim() !== '') {
          const maxStock = parseInt(value);
          if (isNaN(maxStock) || maxStock < 0) return 'El stock máximo debe ser un número no negativo';
          const min = parseInt(formData.minStock);
          if (!isNaN(min) && maxStock < min) return 'El stock máximo no puede ser menor al mínimo';
        }
        return '';
      
      default:
        return '';
    }
  };

  // Validar atributos dinámicos
  const validateAttribute = (attributeId: string, value: any, attribute: any): string => {
    if (attribute.isRequired && (!value || value.toString().trim() === '')) {
      return 'Este campo es obligatorio';
    }

    if (!value || value.toString().trim() === '') return '';

    switch (attribute.type) {
      case 'NUMBER':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return 'Debe ser un número válido';
        if (attribute.minValue !== null && numValue < attribute.minValue) {
          return `Debe ser mayor o igual a ${attribute.minValue}`;
        }
        if (attribute.maxValue !== null && numValue > attribute.maxValue) {
          return `Debe ser menor o igual a ${attribute.maxValue}`;
        }
        break;
      
      case 'STRING':
        if (attribute.regex) {
          const regex = new RegExp(attribute.regex);
          if (!regex.test(value)) return 'Formato inválido';
        }
        break;
      
      case 'LIST':
        if (attribute.options && !attribute.options.includes(value)) {
          return 'Seleccione una opción válida';
        }
        break;
      
      case 'DATE':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) return 'Fecha inválida';
        break;
    }
    
    return '';
  };

  // Detectar cambios en el formulario
  const detectChanges = (newData: any) => {
    const hasFormChanges = JSON.stringify(newData) !== JSON.stringify(originalData);
    const hasImageChanges = imageFiles.length > 0 || imagesToDelete.length > 0;
    const hasAttrChanges = JSON.stringify(attributeValues) !== JSON.stringify(product.attributeValues || {});
    
    setHasChanges(hasFormChanges || hasImageChanges || hasAttrChanges);
  };

  // Manejar cambios en el formulario
  const handleInputChange = (name: string, value: string) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    
    // Validar campo en tiempo real
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
    setValidationState(prev => ({ ...prev, [name]: !error }));
    
    // Detectar cambios
    detectChanges(newFormData);
  };

  // Manejar cambios en atributos dinámicos
  const handleAttributeChange = (attributeId: string, value: any, attribute: any) => {
    const newAttributeValues = { ...attributeValues, [attributeId]: value };
    setAttributeValues(newAttributeValues);
    
    // Validar atributo
    const error = validateAttribute(attributeId, value, attribute);
    setAttrErrors(prev => ({ ...prev, [attributeId]: error }));
    
    // Detectar cambios
    detectChanges(formData);
  };

  // Manejar selección de nuevas imágenes
  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArr = Array.from(files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxFiles = 5;

    // Validar archivos
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of fileArr) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Tipo de archivo no permitido.`);
        continue;
      }
      
      if (file.size > maxSize) {
        errors.push(`${file.name}: Archivo muy grande.`);
        continue;
      }
      
      validFiles.push(file);
    }

    // Verificar límite total de imágenes
    const totalImages = existingImages.length - imagesToDelete.length + imageFiles.length + validFiles.length;
    if (totalImages > maxFiles) {
      errors.push(`Máximo ${maxFiles} imágenes permitidas en total.`);
      const allowedNew = maxFiles - (existingImages.length - imagesToDelete.length + imageFiles.length);
      validFiles.splice(allowedNew);
    }

    if (errors.length > 0) {
      setError(`Errores de imagen: ${errors.join(' ')}`);
    } else {
      setError('');
    }

    setImageFiles(prev => [...prev, ...validFiles]);
    
    // Crear previsualizaciones
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    
    detectChanges(formData);
  };

  // Remover imagen existente
  const removeExistingImage = (index: number) => {
    const imageToDelete = existingImages[index];
    setImagesToDelete(prev => [...prev, imageToDelete]);
    setExistingImages(prev => prev.filter((_, i) => i !== index));
    detectChanges(formData);
  };

  // Remover imagen nueva
  const removeNewImage = (index: number) => {
    // Limpiar URL de preview
    if (imagePreviews[index]) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
    
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    detectChanges(formData);
  };

  // Cargar datos del producto cuando cambie
  useEffect(() => {
    if (product && isOpen) {
      console.log('🔄 EditModal: Loading product data:', product);
      const data = {
        name: product.name || '',
        description: product.description || '',
        brand: product.brand?.name || product.brand || '', // Manejar tanto objeto como string
        costPrice: product.costPrice || 0,
        salePrice: product.salePrice || 0,
        stock: product.stock || 0,
        minStock: product.minStock || 10,
        maxStock: product.maxStock || '',
        status: product.status || 'ACTIVE',
        categoryId: product.categoryId || ''
      };
      
      console.log('🔄 EditModal: Mapped form data:', data);
      setFormData(data);
      setOriginalData(JSON.parse(JSON.stringify(data)));
      setExistingImages(product.images || []);
      setImageFiles([]);
      setImagePreviews([]);
      setImagesToDelete([]);
      setFieldErrors({});
      setError('');
      setHasChanges(false);
      
      // Cargar atributos dinámicos
      if (product.categoryId) {
        loadAttributes(product.categoryId, product.id);
      }
    }
  }, [product, isOpen]);

  // Cargar atributos dinámicos y valores actuales
  // (Eliminada la declaración duplicada de loadAttributes para evitar el error de redeclaración)

  // Función mejorada para manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // 1. Validar todos los campos obligatorios
      const requiredFields = ['name', 'costPrice', 'salePrice', 'stock'];
      const fieldValidationErrors: Record<string, string> = {};
      
      for (const field of requiredFields) {
        const value = formData[field];
        if (!value || value.toString().trim() === '') {
          fieldValidationErrors[field] = 'Este campo es obligatorio';
        } else {
          const error = validateField(field, value.toString());
          if (error) fieldValidationErrors[field] = error;
        }
      }

      // 2. Validar atributos dinámicos
      const attrValidationErrors: Record<string, string> = {};
      for (const attr of attributes) {
        const value = attributeValues[attr.attributeId];
        const error = validateAttribute(attr.attributeId, value, attr);
        if (error) attrValidationErrors[attr.attributeId] = error;
      }

      // 3. Verificar si hay errores
      if (Object.keys(fieldValidationErrors).length > 0) {
        setFieldErrors(fieldValidationErrors);
        setError('Por favor corrija los errores en el formulario');
        return;
      }

      if (Object.keys(attrValidationErrors).length > 0) {
        setAttrErrors(attrValidationErrors);
        setError('Por favor corrija los errores en los atributos');
        return;
      }

      // 4. Verificar si hay cambios
      if (!hasChanges) {
        toast({
          title: "Sin cambios",
          description: "No se detectaron cambios en el producto",
        });
        return;
      }

      // 5. Construir FormData para envío
      const formDataToSend = new FormData();
      
      // Campos básicos (solo los que cambiaron)
      Object.keys(formData).forEach(key => {
        if (formData[key] !== originalData[key]) {
          let value = formData[key];
          
          // Manejar casos especiales
          if (key === 'brand') {
            // Asegurar que brand sea string
            value = typeof value === 'object' && value?.name ? value.name : (value || '');
            console.log('🔄 Processing brand field:', { original: formData[key], processed: value });
          }
          
          console.log(`🔄 Adding field ${key}:`, value);
          formDataToSend.append(key, value.toString());
        }
      });

      // Nuevas imágenes
      imageFiles.forEach((file) => {
        formDataToSend.append('images', file);
      });

      // Imágenes a eliminar
      if (imagesToDelete.length > 0) {
        formDataToSend.append('imagesToDelete', JSON.stringify(imagesToDelete));
      }

      // Atributos dinámicos (solo los que tienen valor)
      const attributesToSend = attributes
        .filter(attr => attributeValues[attr.attributeId] !== undefined && attributeValues[attr.attributeId] !== '')
        .map(attr => ({
          attributeId: attr.attributeId,
          value: attributeValues[attr.attributeId]
        }));

      if (attributesToSend.length > 0) {
        formDataToSend.append('attributes', JSON.stringify(attributesToSend));
      }

      // Debug: mostrar lo que se está enviando
      console.log('🔄 Sending update request for product:', product.id);
      console.log('🔄 FormData entries:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`  ${key}:`, value);
      }

      // 6. Enviar a backend usando apiService
      console.log('🔄 Sending update using apiService.products.update');
      const updatedProduct = await apiService.products.update(product.id, formDataToSend);

      // 7. Limpiar estado y cerrar modal
      resetForm();
      
      toast({
        title: "Éxito",
        description: "Producto actualizado correctamente",
      });

      onClose();
      onProductUpdated();

    } catch (error: any) {
      console.error('❌ Error actualizando producto:', error);
      setError(`Error al actualizar producto: ${error.message || 'Error desconocido'}`);
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el producto",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para resetear el formulario
  const resetForm = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setImagesToDelete([]);
    setFieldErrors({});
    setAttrErrors({});
    setError('');
    setValidationState({});
    setHasChanges(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Limpiar URLs de previsualización al cerrar
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        brand: product.brand?.name || product.brand || '', // Manejar tanto objeto como string
        costPrice: product.costPrice || 0,
        salePrice: product.salePrice || 0,
        stock: product.stock || 0,
        minStock: product.minStock || 10,
        maxStock: product.maxStock || '',
        status: product.status || 'ACTIVE',
        categoryId: product.categoryId || ''
      });
      setExistingImages(product.images || []);
      setImageFiles([]); // Resetear archivos nuevos al cambiar de producto
      // Cargar atributos dinámicos y valores
      loadAttributes(product.categoryId, product.id);
    }
    // eslint-disable-next-line
  }, [product]);

  // Cargar atributos dinámicos y valores actuales
  const loadAttributes = async (categoryId: string, productId: string) => {
    if (!categoryId) {
      setAttributes([]);
      setAttributeValues({});
      setAttrErrors({});
      return;
    }
    setAttrLoading(true);
    try {
      console.log('🔄 EditModal: Loading attributes for category:', categoryId);
      const response = await apiService.categoryAttributes.getByCategory(categoryId);
      const attrs = response.attributes || [];
      console.log('🔄 EditModal: Raw attributes from API:', attrs);
      
      // Mapear atributos para que tengan la estructura correcta (igual que AddProductModal)
      const mappedAttrs = attrs.map(attr => ({
        ...attr,
        attributeId: attr.id || attr.attributeId, // Usar id si no hay attributeId
        id: attr.id,
        name: attr.name,
        type: attr.type,
        isRequired: attr.isRequired || false,
        values: attr.options || attr.values || [],
        options: attr.options || attr.values || [],
        unit: attr.unit || '',
        helpText: attr.helpText || attr.description || ''
      }));
      
      console.log('🔄 EditModal: Mapped attributes:', mappedAttrs.map(a => ({ id: a.attributeId, name: a.name })));
      setAttributes(mappedAttrs);
      
      // Obtener valores actuales del producto
      const prod = await apiService.products.getById(productId);
      console.log('🔄 EditModal: Product data:', prod);
      const attrVals: Record<string, any> = {};
      if (prod && prod.attributeValues) {
        console.log('🔄 EditModal: Product attribute values:', prod.attributeValues);
        for (const av of prod.attributeValues) {
          attrVals[av.attributeId] = av.value;
        }
      }
      console.log('🔄 EditModal: Final attribute values:', attrVals);
      setAttributeValues(attrVals);
    } catch {
      setAttributes([]);
      setAttributeValues({});
    } finally {
      setAttrLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    if (name === 'categoryId' && product) {
      loadAttributes(value, product.id);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  // Duplicate removeNewImage removed to fix redeclaration error

  // Duplicate removeExistingImage removed to fix redeclaration error


  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Producto
            <span className="text-sm font-normal text-muted-foreground">SKU: {product.sku}</span>
            {hasChanges && (
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                Cambios pendientes
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mostrar errores generales */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Información básica del producto */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Información básica</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre del producto */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nombre del producto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ingrese el nombre del producto"
                  className={fieldErrors.name ? 'border-destructive focus:ring-destructive' : ''}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>
                )}
              </div>

              {/* Marca */}
              <div className="space-y-2">
                <Label htmlFor="brand" className="text-sm font-medium">Marca</Label>
                <Input
                  id="brand"
                  value={formData.brand || ''}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  placeholder="Marca del producto"
                />
              </div>

              {/* Categoría */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Categoría</Label>
                <select
                  value={formData.categoryId || ''}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.level > 0 ? `→ ${cat.name}` : cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description" className="text-sm font-medium">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción detallada del producto"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* Precios e inventario */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Precios e inventario</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Precio de costo */}
              <div className="space-y-2">
                <Label htmlFor="costPrice" className="text-sm font-medium">
                  Precio de costo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.costPrice || ''}
                  onChange={(e) => handleInputChange('costPrice', e.target.value)}
                  className={fieldErrors.costPrice ? 'border-destructive' : ''}
                />
                {fieldErrors.costPrice && (
                  <p className="text-xs text-destructive mt-1">{fieldErrors.costPrice}</p>
                )}
              </div>

              {/* Precio de venta */}
              <div className="space-y-2">
                <Label htmlFor="salePrice" className="text-sm font-medium">
                  Precio de venta <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salePrice || ''}
                  onChange={(e) => handleInputChange('salePrice', e.target.value)}
                  className={fieldErrors.salePrice ? 'border-destructive' : ''}
                />
                {fieldErrors.salePrice && (
                  <p className="text-xs text-destructive mt-1">{fieldErrors.salePrice}</p>
                )}
              </div>

              {/* Stock actual */}
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-sm font-medium">
                  Stock actual <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock || ''}
                  onChange={(e) => handleInputChange('stock', e.target.value)}
                  className={fieldErrors.stock ? 'border-destructive' : ''}
                />
                {fieldErrors.stock && (
                  <p className="text-xs text-destructive mt-1">{fieldErrors.stock}</p>
                )}
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Estado</Label>
                <select
                  value={formData.status || 'ACTIVE'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                  <option value="DISCONTINUED">Discontinuado</option>
                </select>
              </div>

              {/* Stock mínimo */}
              <div className="space-y-2">
                <Label htmlFor="minStock" className="text-sm font-medium">Stock mínimo</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={formData.minStock || ''}
                  onChange={(e) => handleInputChange('minStock', e.target.value)}
                  className={fieldErrors.minStock ? 'border-destructive' : ''}
                />
                {fieldErrors.minStock && (
                  <p className="text-xs text-destructive mt-1">{fieldErrors.minStock}</p>
                )}
              </div>

              {/* Stock máximo */}
              <div className="space-y-2">
                <Label htmlFor="maxStock" className="text-sm font-medium">Stock máximo</Label>
                <Input
                  id="maxStock"
                  type="number"
                  min="0"
                  value={formData.maxStock || ''}
                  onChange={(e) => handleInputChange('maxStock', e.target.value)}
                  placeholder="Opcional"
                  className={fieldErrors.maxStock ? 'border-destructive' : ''}
                />
                {fieldErrors.maxStock && (
                  <p className="text-xs text-destructive mt-1">{fieldErrors.maxStock}</p>
                )}
              </div>
            </div>
          </div>

          {/* Imágenes */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Gestión de imágenes</h4>
            
            {/* Imágenes existentes */}
            {existingImages.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Imágenes actuales</Label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mt-2">
                  {existingImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url.startsWith('http') ? url : `http://localhost:3001${url}`}
                        alt={`Imagen ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeExistingImage(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nuevas imágenes */}
            {imagePreviews.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nuevas imágenes</Label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mt-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Nueva imagen ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-green-200"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeNewImage(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subir nuevas imágenes */}
            <div className="space-y-2">
              <Label htmlFor="images" className="text-sm font-medium">
                Agregar nuevas imágenes
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="images"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImagesChange}
                  className="cursor-pointer"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Máximo 5 imágenes total. Formatos: JPEG, PNG, WebP. Tamaño máximo: 5MB por imagen.
              </p>
            </div>
          </div>

          {/* Atributos dinámicos */}
          {(attributes.length > 0 || attrLoading) && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Atributos específicos</h4>

              {attrLoading && (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Cargando atributos...</span>
                </div>
              )}

              {!attrLoading && attributes.length === 0 && (
                <div className="border border-dashed rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Esta categoría no tiene atributos configurados.
                  </p>
                </div>
              )}

              {!attrLoading && attributes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attributes.map(attr => (
                    <div key={attr.attributeId} className="space-y-2">
                      <Label className="text-sm font-medium">
                        {attr.name}
                        {attr.isRequired && <span className="text-destructive">*</span>}
                        {attr.unit && <span className="text-muted-foreground"> ({attr.unit})</span>}
                      </Label>
                      
                      {attr.type === 'STRING' && (
                        <Input
                          value={attributeValues[attr.attributeId] || ''}
                          onChange={(e) => handleAttributeChange(attr.attributeId, e.target.value, attr)}
                          placeholder={`Ingrese ${attr.name.toLowerCase()}`}
                          className={attrErrors[attr.attributeId] ? 'border-destructive' : ''}
                        />
                      )}

                      {attr.type === 'NUMBER' && (
                        <Input
                          type="number"
                          step="0.01"
                          min={attr.minValue || undefined}
                          max={attr.maxValue || undefined}
                          value={attributeValues[attr.attributeId] || ''}
                          onChange={(e) => handleAttributeChange(attr.attributeId, e.target.value, attr)}
                          placeholder={`Ingrese ${attr.name.toLowerCase()}`}
                          className={attrErrors[attr.attributeId] ? 'border-destructive' : ''}
                        />
                      )}

                      {attr.type === 'BOOLEAN' && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={!!attributeValues[attr.attributeId]}
                            onCheckedChange={(checked) => handleAttributeChange(attr.attributeId, checked, attr)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {attributeValues[attr.attributeId] ? 'Sí' : 'No'}
                          </span>
                        </div>
                      )}

                      {attr.type === 'LIST' && (
                        <select
                          value={attributeValues[attr.attributeId] || ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            console.log(`🎯 EditModal: User selected "${newValue}" for attribute "${attr.name}" (ID: ${attr.attributeId})`);
                            console.log('🎯 EditModal: All current attribute values before selection:', { ...attributeValues });
                            console.log('🎯 EditModal: All attributes available:', attributes.map(a => ({ id: a.attributeId, name: a.name })));
                            
                            handleAttributeChange(attr.attributeId, newValue, attr);
                            
                            // Log después del cambio (con setTimeout para esperar el estado)
                            setTimeout(() => {
                              console.log('🎯 EditModal: All attribute values AFTER selection:', attributeValues);
                            }, 100);
                          }}
                          className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                        >
                          <option value="">Seleccionar {attr.name.toLowerCase()}</option>
                          {(() => {
                            const options = (attr.values || attr.options || attr.attribute?.options || [])
                              .filter((val: string) => val && val.trim() !== '');
                            
                            console.log(`🔍 EditModal: Options for attribute ${attr.name} (ID: ${attr.attributeId}):`, options);
                            
                            if (!attr.attributeId) {
                              console.error('⚠️ EditModal: Attribute without ID trying to render options:', attr);
                            }
                            
                            return options.map((val: string, index: number) => (
                              <option key={`${attr.attributeId}-${val}-${index}`} value={val}>
                                {val}
                              </option>
                            ));
                          })()}
                        </select>
                      )}

                      {attr.type === 'DATE' && (
                        <Input
                          type="date"
                          value={attributeValues[attr.attributeId] || ''}
                          onChange={(e) => handleAttributeChange(attr.attributeId, e.target.value, attr)}
                          className={attrErrors[attr.attributeId] ? 'border-destructive' : ''}
                        />
                      )}

                      {attrErrors[attr.attributeId] && (
                        <p className="text-xs text-destructive mt-1">{attrErrors[attr.attributeId]}</p>
                      )}

                      {attr.helpText && (
                        <p className="text-xs text-muted-foreground mt-1">{attr.helpText}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              {hasChanges ? (
                <span className="text-orange-600">⚠ Hay cambios sin guardar</span>
              ) : (
                <span>Sin cambios pendientes</span>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !hasChanges || Object.keys(fieldErrors).some(key => fieldErrors[key])}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
