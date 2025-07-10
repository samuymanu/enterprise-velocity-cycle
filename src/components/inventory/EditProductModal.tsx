import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { X, Upload } from 'lucide-react';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any; // El producto a editar
  categories: any[];
  onProductUpdated: () => void;
}

export function EditProductModal({ isOpen, onClose, product, categories, onProductUpdated }: EditProductModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        brand: product.brand || '',
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
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageUrl: string) => {
    setExistingImages(prev => prev.filter(img => img !== imageUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);



    // Limpiar imágenes existentes: solo rutas válidas, sin duplicados ni vacíos
    const cleanedExistingImages = Array.from(new Set(
      (existingImages || [])
        .map(img => typeof img === 'string' ? img.trim() : '')
        .filter(img => img && img.startsWith('/uploads/'))
    ));

    const submissionData = new FormData();
    Object.keys(formData).forEach(key => {
      submissionData.append(key, formData[key]);
    });
    cleanedExistingImages.forEach(imageUrl => {
      submissionData.append('images', imageUrl);
    });
    imageFiles.forEach(file => {
      submissionData.append('images', file);
    });

    try {
      await apiService.products.update(product.id, submissionData);
      toast({ title: "Éxito", description: "Producto actualizado correctamente." });
      onProductUpdated();
      onClose();
    } catch (error: any) { 
      console.error("Error actualizando producto:", error);
      toast({ title: "Error", description: `No se pudo actualizar el producto: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Producto (SKU: {product.sku})</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoría</Label>
              <Select name="categoryId" value={formData.categoryId} onValueChange={(value) => handleSelectChange('categoryId', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.level === 0).map(cat => (
                    <optgroup key={cat.id} label={cat.name}>
                      {categories.filter(sub => sub.parentId === cat.id).map(subcat => (
                        <SelectItem key={subcat.id} value={subcat.id}>{subcat.name}</SelectItem>
                      ))}
                    </optgroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" name="brand" value={formData.brand} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Precio de Costo</Label>
              <Input id="costPrice" name="costPrice" type="number" value={formData.costPrice} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Precio de Venta</Label>
              <Input id="salePrice" name="salePrice" type="number" value={formData.salePrice} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Actual</Label>
              <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Stock Mínimo</Label>
              <Input id="minStock" name="minStock" type="number" value={formData.minStock} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxStock">Stock Máximo</Label>
              <Input id="maxStock" name="maxStock" type="number" value={formData.maxStock} onChange={handleChange} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select name="status" value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  <SelectItem value="DISCONTINUED">Discontinuado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imágenes</Label>
            <div className="flex flex-wrap gap-2">
              {existingImages.map(url => (
                <div key={url} className="relative w-24 h-24">
                  <img src={`http://localhost:3001${url}`} alt="Producto" className="w-full h-full object-cover rounded-md" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-0 right-0 h-6 w-6" onClick={() => removeExistingImage(url)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {imageFiles.map((file, index) => (
                <div key={index} className="relative w-24 h-24">
                  <img src={URL.createObjectURL(file)} alt="Previsualización" className="w-full h-full object-cover rounded-md" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-0 right-0 h-6 w-6" onClick={() => removeNewImage(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="icon" className="w-24 h-24" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-6 w-6" />
              </Button>
            </div>
            <Input type="file" multiple ref={fileInputRef} onChange={handleImageChange} className="hidden" />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
