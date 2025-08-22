import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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
    minStock: '',
    maxStock: '',
    barcode: '',
    categoryId: '',
  });

  // Estado para atributos dinámicos
  const [attributes, setAttributes] = useState<any[]>([]);

  // Estado para errores generales del formulario
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Estado para atributos dinámicos con mejor manejo
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
  const [attributeSuggestions, setAttributeSuggestions] = useState<any[]>([]);
  const [existingAttributes, setExistingAttributes] = useState<any[]>([]);
  const [attrModalError, setAttrModalError] = useState('');

  // Estado para validación en tiempo real
  const [validationState, setValidationState] = useState<Record<string, boolean>>({});

  // Función de validación de campos
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
        const costPrice = parseFloat(newProduct.costPrice);
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
          const min = parseInt(newProduct.minStock);
          if (!isNaN(min) && maxStock < min) return 'El stock máximo no puede ser menor al mínimo';
        }
        return '';
      
      case 'barcode':
        if (value && !/^[0-9]{8,13}$/.test(value)) return 'El código de barras debe tener entre 8 y 13 dígitos';
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

  // Manejar cambios en el formulario con validación
  const handleInputChange = (name: string, value: string) => {
    setNewProduct(prev => ({ ...prev, [name]: value }));
    
    // Validar campo en tiempo real
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
    setValidationState(prev => ({ ...prev, [name]: !error }));
  };

  // Manejar cambios en atributos dinámicos
  const handleAttributeChange = (attributeId: string, value: any, attribute: any) => {
    console.log(`🔄 Setting attribute ${attributeId} (${attribute.name}) to value: ${value}`);
    console.log('📊 Current attributeValues state BEFORE change:', attributeValues);
    
    setAttributeValues(prev => {
      console.log('📊 Previous state in setter:', prev);
      const newValues = { ...prev, [attributeId]: value };
      console.log('📊 New state being set:', newValues);
      console.log('📊 All attribute IDs with values:', Object.keys(newValues));
      
      // Verificar si algún valor se está perdiendo
      const previousKeys = Object.keys(prev);
      const newKeys = Object.keys(newValues);
      const lostKeys = previousKeys.filter(key => key !== attributeId && !newKeys.includes(key));
      if (lostKeys.length > 0) {
        console.error('⚠️ Lost attribute values for keys:', lostKeys);
      }
      
      return newValues;
    });
    
    // Validar atributo
    const error = validateAttribute(attributeId, value, attribute);
    setAttrErrors(prev => ({ ...prev, [attributeId]: error }));
  };
  // Manejar selección de imágenes con validación mejorada
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
        errors.push(`${file.name}: Tipo de archivo no permitido. Use JPEG, PNG o WebP.`);
        continue;
      }
      
      if (file.size > maxSize) {
        errors.push(`${file.name}: Archivo muy grande. Máximo 5MB.`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (validFiles.length > maxFiles) {
      errors.push(`Máximo ${maxFiles} imágenes permitidas.`);
      validFiles.splice(maxFiles);
    }

    if (errors.length > 0) {
      setError(`Errores de imagen: ${errors.join(' ')}`);
    } else {
      setError('');
    }

    setSelectedImages(validFiles);
    
    // Limpiar previsualizaciones anteriores
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    
    // Crear nuevas previsualizaciones
    const previews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  // Remover imagen específica
  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // Limpiar URL de la imagen removida
    URL.revokeObjectURL(imagePreviews[index]);
    
    setSelectedImages(newImages);
    setImagePreviews(newPreviews);
  };

  // Funcionalidad de autocompletado para nombres de productos
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchProductSuggestions = async (query: string) => {
    if (query.length < 2) {
      setProductSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`/api/products/suggestions?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const suggestions = await response.json();
        setProductSuggestions(suggestions.slice(0, 5)); // Limitar a 5 sugerencias
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error buscando sugerencias:', error);
    }
  };

  // Generar SKU automático basado en categoría y nombre
  const generateSKU = (categoryName: string, productName: string): string => {
    const catPrefix = categoryName.substring(0, 3).toUpperCase();
    const prodPrefix = productName.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${catPrefix}-${prodPrefix}-${timestamp}`;
  };

  // Generar código de barras automático basado en SKU
  const generateBarcode = (sku: string): string => {
    // Convertir SKU a números para código de barras
    // Eliminar guiones y convertir letras a números
    const cleaned = sku.replace(/-/g, '');
    let barcode = '';
    
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (/[0-9]/.test(char)) {
        barcode += char;
      } else {
        // Convertir letra a número (A=1, B=2, etc.)
        barcode += (char.charCodeAt(0) - 64).toString().padStart(2, '0');
      }
    }
    
    // Asegurar que tenga al menos 12 dígitos para código de barras estándar
    if (barcode.length < 12) {
      barcode = barcode.padEnd(12, '0');
    } else if (barcode.length > 12) {
      barcode = barcode.substring(0, 12);
    }
    
    return barcode;
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

  // Manejar cambio de categoría principal
  const handleCategoryChange = async (value: string) => {
    console.log('🔄 Category change to:', value);
    console.log('🔄 Current attributeValues before category change:', attributeValues);
    
    setNewProduct(prev => ({
      ...prev,
      categoryId: value,
      parentCategoryId: value,
      subCategoryId: '',
    }));
    setSelectedParentCategory(value);
    const subs = categories.filter((cat: any) => cat.parentId === value);
    setSubCategories(subs);
    
    if (value) {
      setAttrLoading(true);
      console.log('🔄 Starting to load attributes for category:', value);
      try {
        const response = await apiService.categoryAttributes.getByCategory(value);
        console.log('🔄 Raw API response:', response);
        const attrs = response.attributes || [];
        console.log('🔄 Parsed attributes from response:', attrs);
        
        // Investigar la estructura de cada atributo
        attrs.forEach((attr, index) => {
          console.log(`🔍 Attribute ${index}:`, attr);
          console.log(`🔍 Attribute ${index} keys:`, Object.keys(attr));
          console.log(`🔍 Attribute ${index}.id:`, attr.id);
          console.log(`🔍 Attribute ${index}.attributeId:`, attr.attributeId);
          console.log(`🔍 Attribute ${index}.name:`, attr.name);
        });
        
        // Mapear atributos para que tengan la estructura correcta
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
        
        console.log('🔄 Mapped attributes:', mappedAttrs.map(a => ({ id: a.attributeId, name: a.name })));
        setExistingAttributes(mappedAttrs);
        setAttributes(mappedAttrs);
        console.log('🔄 Preserving existing attributeValues after category change');
        console.log('🔄 Final attributes state will be:', mappedAttrs);
      } catch (e) {
        console.error('❌ Error loading category attributes:', e);
        setExistingAttributes([]);
        setAttributes([]);
      }
      setAttrLoading(false);
    } else {
      console.log('🔄 No category selected, clearing attributes');
      setExistingAttributes([]);
      setAttributes([]);
    }
  };

  // Cargar atributos al seleccionar subcategoría
  useEffect(() => {
    const loadAttrs = async () => {
      const catId = newProduct.subCategoryId || newProduct.parentCategoryId;
      console.log('🔄 useEffect triggered - Loading attributes for category:', catId);
      console.log('🔄 subCategoryId:', newProduct.subCategoryId);
      console.log('🔄 parentCategoryId:', newProduct.parentCategoryId);
      console.log('🔄 Current attributeValues before loading:', attributeValues);
      
      if (!catId) {
        console.log('🔄 No category selected, clearing attributes and values');
        setAttributes([]);
        setAttributeValues({});
        setAttrErrors({});
        return;
      }

      // Solo cargar atributos si tenemos una subcategoría seleccionada
      // Si solo hay categoría principal, ya se cargó en handleCategoryChange
      if (!newProduct.subCategoryId) {
        console.log('🔄 No subcategory selected, skipping useEffect load (already loaded in handleCategoryChange)');
        return;
      }

      setAttrLoading(true);
      console.log('🔄 useEffect loading attributes for subcategory:', newProduct.subCategoryId);
      try {
        const response = await apiService.categoryAttributes.getByCategory(catId);
        const attrs = response.attributes || [];
        
        // Mapear atributos para que tengan la estructura correcta
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
        
        console.log('🔄 useEffect loaded attributes:', mappedAttrs.map(a => ({ id: a.attributeId, name: a.name })));
        setAttributes(mappedAttrs);
        setExistingAttributes(mappedAttrs);
        console.log('🔄 useEffect NOT clearing attributeValues to preserve user selections');
      } catch (error) {
        console.error('Error loading attributes for subcategory:', error);
        setAttributes([]);
        setExistingAttributes([]);
      } finally {
        setAttrLoading(false);
      }
    };
    loadAttrs();
  }, [newProduct.subCategoryId]);

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
        const value = newProduct[field as keyof typeof newProduct];
        if (!value || value.toString().trim() === '') {
          fieldValidationErrors[field] = 'Este campo es obligatorio';
        } else {
          const error = validateField(field, value.toString());
          if (error) fieldValidationErrors[field] = error;
        }
      }

      // 2. Validar categoría
      const finalCategoryId = newProduct.subCategoryId || newProduct.parentCategoryId;
      if (!finalCategoryId) {
        fieldValidationErrors['categoryId'] = 'Debe seleccionar una categoría';
      }

      // 3. Validar atributos dinámicos
      const attrValidationErrors: Record<string, string> = {};
      for (const attr of attributes) {
        const value = attributeValues[attr.attributeId];
        const error = validateAttribute(attr.attributeId, value, attr);
        if (error) attrValidationErrors[attr.attributeId] = error;
      }

      // 4. Validar que al menos tenga una imagen (opcional pero recomendado)
      if (selectedImages.length === 0) {
        console.warn('No se han seleccionado imágenes para el producto');
      }

      // 5. Verificar si hay errores
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

      // 6. Construir FormData para envío
      const formData = new FormData();
      
      // Debug: mostrar valores antes de enviar
      console.log('🚀 Frontend: About to send product data:');
      console.log('🚀 Stock value:', { stock: newProduct.stock, type: typeof newProduct.stock, truthy: !!newProduct.stock });
      console.log('🚀 All newProduct values:', {
        name: newProduct.name,
        stock: newProduct.stock,
        salePrice: newProduct.salePrice,
        costPrice: newProduct.costPrice,
        minStock: newProduct.minStock,
        maxStock: newProduct.maxStock
      });
      
      // Campos básicos
      formData.append('name', newProduct.name.trim());
      formData.append('description', newProduct.description.trim());
      formData.append('categoryId', finalCategoryId);
      formData.append('brand', newProduct.brand.trim());
      formData.append('costPrice', newProduct.costPrice);
      formData.append('salePrice', newProduct.salePrice);
      formData.append('stock', newProduct.stock);
      formData.append('minStock', newProduct.minStock || '10');
      
      // Campos opcionales
      if (newProduct.maxStock) formData.append('maxStock', newProduct.maxStock);

  // Generar SKU y código de barras automáticamente (usar barcode proporcionado si existe)
  const categoryName = categories.find(cat => cat.id === finalCategoryId)?.name || 'PROD';
  const autoSKU = generateSKU(categoryName, newProduct.name);
  const autoBarcode = generateBarcode(autoSKU);

  const finalBarcode = newProduct.barcode && newProduct.barcode.trim() !== '' ? newProduct.barcode.trim() : autoBarcode;

  formData.append('sku', autoSKU);
  formData.append('barcode', finalBarcode);

      // Imágenes
      selectedImages.forEach((file, index) => {
        formData.append('images', file);
      });

      // Atributos dinámicos (solo los que tienen valor)
      const attributesToSend = attributes
        .filter(attr => attributeValues[attr.attributeId] !== undefined && attributeValues[attr.attributeId] !== '')
        .map(attr => ({
          attributeId: attr.attributeId,
          value: attributeValues[attr.attributeId]
        }));

      if (attributesToSend.length > 0) {
        formData.append('attributes', JSON.stringify(attributesToSend));
      }

      // 7. Enviar a backend
      const newProductData = await apiService.products.create(formData);

      // 8. Resetear formulario completamente
      resetForm();

      // 9. Notificar éxito y cerrar modal
      console.log('✅ Producto creado exitosamente:', newProductData);
      onClose();
      onProductAdded();

    } catch (error: any) {
      console.error('❌ Error creando producto:', error);
      setError(`Error al crear producto: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para resetear el formulario
  const resetForm = () => {
    setNewProduct({
      name: '',
      description: '',
      parentCategoryId: '',
      subCategoryId: '',
      brand: '',
      costPrice: '',
      salePrice: '',
      stock: '',
      minStock: '',
      maxStock: '',
      barcode: '',
      categoryId: ''
    });
    setSelectedParentCategory('');
    setSubCategories([]);
    setSelectedImages([]);
    setImagePreviews([]);
    setAttributes([]);
    setAttributeValues({});
    setAttrErrors({});
    setFieldErrors({});
    setError('');
    setValidationState({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Función para crear atributo real en la base de datos
  const handleCreateRealAttribute = async () => {
    // Obtener la categoría seleccionada
    const finalCategoryId = newProduct.subCategoryId || newProduct.parentCategoryId;
    
    if (!newAttribute.name.trim()) {
      setAttrModalError('El nombre es obligatorio');
      return;
    }

    if (!finalCategoryId) {
      setAttrModalError('Primero debe seleccionar una categoría para el producto.');
      return;
    }

    // Validar que no exista un atributo con el mismo nombre
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

    try {
      setAttrModalError('Creando atributo...');
      
      // 1. Crear el atributo en la base de datos
      const attributeData = {
        categoryId: finalCategoryId,
        name: newAttribute.name.trim(),
        type: newAttribute.type,
        isRequired: false,
        options: newAttribute.type === 'LIST' ? 
          newAttribute.values.split(',').map(v => v.trim()).filter(Boolean) : [],
        unit: newAttribute.unit || '',
        description: `Atributo personalizado para ${newAttribute.name}`,
        isGlobal: false
      };

      console.log('🚀 About to create attribute with data:', attributeData);
      console.log('🚀 apiService.attributes.create function:', apiService.attributes.create);
      console.log('🚀 Current authToken in localStorage:', localStorage.getItem('authToken'));
      
      const createdAttribute = await apiService.attributes.create(attributeData);
      console.log('✅ Attribute created successfully:', createdAttribute);
      
      // El backend ya asigna automáticamente el atributo a la categoría si se proporciona categoryId
      // No necesitamos llamar a apiService.categoryAttributes.assign por separado
      
      // 2. Agregar el atributo a la lista local para que aparezca inmediatamente
      const newAttr = {
        attributeId: createdAttribute.attribute.id,
        name: createdAttribute.attribute.name,
        type: createdAttribute.attribute.type,
        isRequired: false,
        values: createdAttribute.attribute.options || createdAttribute.attribute.values || [],
        options: createdAttribute.attribute.options || createdAttribute.attribute.values || [],
        unit: createdAttribute.attribute.unit || '',
        helpText: createdAttribute.attribute.description || ''
      };
      
      setAttributes(prev => [...prev, newAttr]);
      
      // 3. Actualizar la lista de atributos existentes para futuras búsquedas
      setExistingAttributes(prev => [...prev, newAttr]);
      
      // 4. Recargar los atributos de la categoría para asegurar sincronización
      try {
        const updatedAttrs = await apiService.categoryAttributes.getByCategory(finalCategoryId);
        const attrs = updatedAttrs.attributes || [];
        
        // Aplicar el mismo mapeo que en handleCategoryChange
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
        
        setAttributes(mappedAttrs);
        setExistingAttributes(mappedAttrs);
      } catch (reloadError) {
        console.warn('No se pudieron recargar los atributos:', reloadError);
      }
      
      // 5. Resetear el formulario del modal y cerrar
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
      setAttrModalError('');
      setIsAttrModalOpen(false);
      
      console.log('✅ Atributo creado y asignado exitosamente:', createdAttribute.attribute.name);
      
    } catch (error: any) {
      console.error('❌ Error creando atributo:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response);
      
      // Si es un error 404, significa que la ruta no existe
      if (error.message && error.message.includes('404')) {
        setAttrModalError('Error: La ruta de atributos no está disponible en el backend. Verifique que el servidor esté funcionando correctamente.');
      } else {
        setAttrModalError(`Error al crear atributo: ${error.message || 'Error desconocido'}`);
      }
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
        <div>
          {/* Modal para agregar atributo personalizado */}
          <Dialog open={isAttrModalOpen} onOpenChange={setIsAttrModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar atributo personalizado</DialogTitle>
                <DialogDescription>
                  Crea un nuevo atributo que se guardará en la base de datos y estará disponible para productos de esta categoría.
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
                    onClick={handleCreateRealAttribute}
                  >
                    Guardar atributo
                  </Button>
                </div>
                {attrModalError && <div className="text-xs text-destructive">{attrModalError}</div>}
              </div>
            </DialogContent>
          </Dialog>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mostrar errores generales */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Información básica del producto */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Información básica</h4>
              
              {/* Nombre del producto */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nombre del producto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ingrese el nombre del producto"
                  className={fieldErrors.name ? 'border-destructive focus:ring-destructive' : ''}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>
                )}
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Descripción</Label>
                <Textarea
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descripción detallada del producto"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Marca */}
              <div className="space-y-2">
                <Label htmlFor="brand" className="text-sm font-medium">Marca</Label>
                <Input
                  id="brand"
                  value={newProduct.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  placeholder="Marca del producto"
                />
              </div>
            </div>

            {/* Categorización */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Categorización</h4>
              
              {/* Categoría principal */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Categoría principal <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedParentCategory}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className={fieldErrors.categoryId ? 'border-destructive' : ''}>
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
                {fieldErrors.categoryId && (
                  <p className="text-xs text-destructive mt-1">{fieldErrors.categoryId}</p>
                )}
              </div>

              {/* Subcategoría */}
              {subCategories.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Subcategoría</Label>
                  <Select
                    value={newProduct.subCategoryId}
                    onValueChange={(value) => handleInputChange('subCategoryId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar subcategoría (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {subCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Precios e inventario */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Precios e inventario</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    value={newProduct.costPrice}
                    onChange={(e) => handleInputChange('costPrice', e.target.value)}
                    placeholder="0.00"
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
                    value={newProduct.salePrice}
                    onChange={(e) => handleInputChange('salePrice', e.target.value)}
                    placeholder="0.00"
                    className={fieldErrors.salePrice ? 'border-destructive' : ''}
                  />
                  {fieldErrors.salePrice && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.salePrice}</p>
                  )}
                </div>

                {/* Stock inicial */}
                <div className="space-y-2">
                  <Label htmlFor="stock" className="text-sm font-medium">
                    Stock inicial <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={newProduct.stock}
                    onChange={(e) => handleInputChange('stock', e.target.value)}
                    placeholder="0"
                    className={fieldErrors.stock ? 'border-destructive' : ''}
                  />
                  {fieldErrors.stock && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.stock}</p>
                  )}
                </div>

                {/* Stock mínimo */}
                <div className="space-y-2">
                  <Label htmlFor="minStock" className="text-sm font-medium">Stock mínimo</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    value={newProduct.minStock}
                    onChange={(e) => handleInputChange('minStock', e.target.value)}
                    placeholder="10"
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
                    value={newProduct.maxStock}
                    onChange={(e) => handleInputChange('maxStock', e.target.value)}
                    placeholder="1000 (opcional)"
                    className={fieldErrors.maxStock ? 'border-destructive' : ''}
                  />
                  {fieldErrors.maxStock && (
                    <p className="text-xs text-destructive mt-1">{fieldErrors.maxStock}</p>
                  )}
                </div>

                {/* Campo Código de barras interactivo (acepta escáner) */}
                <div className="space-y-2">
                  <Label htmlFor="barcode" className="text-sm font-medium">Código de barras</Label>
                  <div className="flex gap-2">
                    <Input
                      id="barcode"
                      name="barcode"
                      type="text"
                      value={newProduct.barcode}
                      onChange={(e) => handleInputChange('barcode', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          // Evitar que el scanner envíe Enter y dispare el form
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                          // Si quieres auto-enviar tras escaneo, se puede llamar a handleSubmit aquí
                        }
                      }}
                      placeholder="Ingrese o escanee el código (8-13 dígitos)"
                    />
                    <button
                      type="button"
                      className="btn" 
                      onClick={() => {
                        // Hacer focus en el input para recibir el escaneo
                        const el = document.getElementById('barcode') as HTMLInputElement | null;
                        if (el) {
                          el.focus();
                          el.select();
                        }
                      }}
                    >
                      Escanear
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Si lo dejas vacío, se generará automáticamente; el servidor validará duplicados.</p>
                  {fieldErrors.barcode && <p className="text-xs text-destructive mt-1">{fieldErrors.barcode}</p>}
                </div>
              </div>
            </div>

            {/* Imágenes */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Imágenes del producto</h4>
              
              <div className="space-y-2">
                <Label htmlFor="images" className="text-sm font-medium">
                  Subir imágenes <span className="text-muted-foreground">(máximo 5, 5MB cada una)</span>
                </Label>
                <Input
                  id="images"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImagesChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Formatos permitidos: JPEG, PNG, WebP. Tamaño máximo: 5MB por imagen.
                </p>
              </div>

              {/* Vista previa de imágenes */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Atributos dinámicos mejorados */}
            {(newProduct.parentCategoryId || newProduct.subCategoryId) && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Atributos específicos</h4>

                {attrLoading && (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Cargando atributos...</span>
                  </div>
                )}

                {!attrLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Atributos existentes */}
                    {(() => {
                      console.log('🔍 Rendering attributes:', attributes.map(a => ({ id: a.attributeId, name: a.name })));
                      
                      // Filtrar atributos que tengan attributeId válido
                      const validAttributes = attributes.filter(attr => {
                        if (!attr.attributeId) {
                          console.warn('⚠️ Found attribute without attributeId:', attr);
                          return false;
                        }
                        return true;
                      });
                      
                      // Verificar duplicados
                      const ids = validAttributes.map(a => a.attributeId);
                      const uniqueIds = [...new Set(ids)];
                      if (ids.length !== uniqueIds.length) {
                        console.error('⚠️ Duplicate attribute IDs found:', ids);
                      }
                      
                      return validAttributes.map((attr, index) => (
                        <div key={`attr-${attr.attributeId || 'unknown'}-${index}`} className="space-y-2">
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
                              console.log(`🎯 User selected "${newValue}" for attribute "${attr.name}" (ID: ${attr.attributeId})`);
                              console.log('🎯 All current attribute values before selection:', { ...attributeValues });
                              console.log('🎯 All attributes available:', attributes.map(a => ({ id: a.attributeId, name: a.name })));
                              
                              handleAttributeChange(attr.attributeId, newValue, attr);
                              
                              // Log después del cambio (con setTimeout para esperar el estado)
                              setTimeout(() => {
                                console.log('🎯 All attribute values AFTER selection:', attributeValues);
                              }, 100);
                            }}
                            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                          >
                            <option value="">Seleccionar {attr.name.toLowerCase()}</option>
                            {(() => {
                              const options = (attr.values || attr.options || attr.attribute?.options || [])
                                .filter((val: string) => val && val.trim() !== '');
                              
                              console.log(`🔍 Options for attribute ${attr.name} (ID: ${attr.attributeId}):`, options);
                              
                              if (!attr.attributeId) {
                                console.error('⚠️ Attribute without ID trying to render options:', attr);
                                return [];
                              }
                              
                              return options.map((val: string, index: number) => (
                                <option key={`select-${attr.attributeId}-opt-${index}-${val.replace(/[^a-zA-Z0-9]/g, '-')}`} value={val}>
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
                    ));
                    })()}

                    {/* Card para crear nuevo atributo */}
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 hover:border-primary/50 hover:bg-muted/30 transition-all">
                      <div className="flex flex-col items-center justify-center space-y-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xl text-muted-foreground">+</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">
                            ¿Falta un atributo?
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Crea un nuevo atributo para esta categoría
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAttrModalOpen(true)}
                            className="w-full"
                          >
                            Crear nuevo atributo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mensaje cuando no hay categoría seleccionada */}
                {!attrLoading && !newProduct.parentCategoryId && !newProduct.subCategoryId && (
                  <div className="border border-dashed rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Selecciona una categoría para ver los atributos específicos.
                    </p>
                  </div>
                )}

                {/* Mensaje cuando no hay atributos en la categoría */}
                {!attrLoading && (newProduct.parentCategoryId || newProduct.subCategoryId) && attributes.length === 0 && (
                  <div className="border border-dashed rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Esta categoría no tiene atributos configurados aún.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAttrModalOpen(true)}
                    >
                      Crear el primer atributo
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-6 border-t">
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
                disabled={isSubmitting || Object.keys(fieldErrors).some(key => fieldErrors[key])}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  'Guardar producto'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}