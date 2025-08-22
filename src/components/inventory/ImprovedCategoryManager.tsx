import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Folder, 
  FolderPlus, 
  Settings,
  Trash2, 
  Plus, 
  Edit,
  ChevronRight,
  Tag,
  TreePine,
  Package
} from 'lucide-react';
import { apiService } from "@/lib/api";

interface Category {
  id: string;
  name: string;
  description?: string;
  code: string;
  isActive: boolean;
  parentId?: string;
  level: number;
  parent?: Category;
  children?: Category[];
  _count?: {
    products: number;
    children: number;
  };
}

interface ImprovedCategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange: () => void;
}

export function ImprovedCategoryManager({ isOpen, onClose, onDataChange }: ImprovedCategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tree' | 'create' | 'attributes'>('tree');
  
  // Estado para formularios
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    code: '',
    parentId: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await apiService.categories.getAll();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCategoryForm({ name: '', description: '', code: '', parentId: '' });
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    setSubmitting(true);
    try {
      if (categoryForm.parentId) {
        // Crear subcategoría
        await apiService.categories.createSubcategory({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
          parentId: categoryForm.parentId
        });
      } else {
        // Crear categoría principal
        await apiService.categories.create({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim()
        });
      }
      
      resetForm();
      await loadCategories();
      onDataChange();
      setActiveTab('tree');
    } catch (error: any) {
      alert('Error: ' + (error.message || 'Error desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`¿Eliminar "${category.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await apiService.categories.delete(category.id);
      await loadCategories();
      onDataChange();
    } catch (error: any) {
      alert('Error al eliminar: ' + (error.message || 'Error desconocido'));
    }
  };

  // Organizar categorías en árbol
  const organizeCategories = (categories: Category[]) => {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // Crear mapa de categorías
    categories.forEach(cat => categoryMap.set(cat.id, { ...cat, children: [] }));

    // Organizar jerarquía
    categories.forEach(cat => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parent = categoryMap.get(cat.parentId)!;
        parent.children!.push(category);
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  };

  const renderCategoryTree = (categories: Category[], level = 0) => {
    return categories.map(category => (
      <div key={category.id} className={`ml-${level * 4}`}>
        <Card className="mb-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {level === 0 ? (
                    <Folder className="h-5 w-5 text-blue-600" />
                  ) : (
                    <div className="flex items-center">
                      <div className="w-4 h-0.5 bg-gray-300 mr-1"></div>
                      <FolderPlus className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.name}</span>
                      <Badge variant={level === 0 ? "default" : "secondary"} className="text-xs">
                        Level {category.level}
                      </Badge>
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {category._count?.products || 0} productos
                      </span>
                      <span className="flex items-center gap-1">
                        <TreePine className="h-3 w-3" />
                        {category._count?.children || 0} subcategorías
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCategoryForm({ 
                      name: '', 
                      description: '', 
                      code: '', 
                      parentId: category.id 
                    });
                    setActiveTab('create');
                  }}
                  className="text-green-600 hover:text-green-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('attributes')}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(category)}
                  className="text-red-600 hover:text-red-700"
                  disabled={(category._count?.products || 0) > 0 || (category._count?.children || 0) > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {category.children && category.children.length > 0 && (
          <div className="ml-6 border-l-2 border-gray-200 pl-4">
            {renderCategoryTree(category.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const rootCategories = organizeCategories(categories);
  const parentCategories = categories.filter(cat => !cat.parentId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5" />
            Gestión Avanzada de Categorías
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tree" className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              Árbol de Categorías
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Crear Categoría
            </TabsTrigger>
            <TabsTrigger value="attributes" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Gestionar Atributos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tree" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Estructura de Categorías</h3>
                <Button
                  onClick={() => setActiveTab('create')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Categoría
                </Button>
              </div>
              
              {loading ? (
                <div className="text-center py-8">Cargando categorías...</div>
              ) : rootCategories.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <TreePine className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No hay categorías creadas</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setActiveTab('create')}
                    >
                      Crear primera categoría
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {renderCategoryTree(rootCategories)}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {categoryForm.parentId ? (
                    <>
                      <FolderPlus className="h-5 w-5 text-green-600" />
                      Crear Subcategoría
                    </>
                  ) : (
                    <>
                      <Folder className="h-5 w-5 text-blue-600" />
                      Crear Categoría Principal
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="parentId">Categoría Padre (opcional)</Label>
                      <Select 
                        value={categoryForm.parentId} 
                        onValueChange={(value) => setCategoryForm(prev => ({ ...prev, parentId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría padre" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Ninguna (Categoría principal)</SelectItem>
                          {parentCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="name">Nombre *</Label>
                      <Input
                        id="name"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ej: Bicicletas de Montaña"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripción opcional de la categoría"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Limpiar
                    </Button>
                    <Button type="submit" disabled={submitting || !categoryForm.name.trim()}>
                      {submitting ? 'Creando...' : (categoryForm.parentId ? 'Crear Subcategoría' : 'Crear Categoría')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attributes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Gestión de Atributos por Categoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Esta funcionalidad será implementada en el modal de atributos existente</p>
                  <p className="text-sm mt-2">Utiliza el botón de configuración en cada categoría del árbol</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
