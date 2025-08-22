import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, FolderPlus, Settings } from "lucide-react";
import { apiService } from "@/lib/api";
import { CategoryAttributesModal } from "./CategoryAttributesModal";

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange: () => void;
}

export function ManageCategoriesModal({ isOpen, onClose, onDataChange }: ManageCategoriesModalProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para crear categoría principal
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  
  // Estado para crear subcategoría
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryDescription, setNewSubcategoryDescription] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [creatingSubcategory, setCreatingSubcategory] = useState(false);

  // Estado para gestión de atributos
  const [selectedCategoryForAttributes, setSelectedCategoryForAttributes] = useState<any>(null);
  const [attributesModalOpen, setAttributesModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const categoriesData = await apiService.categories.getAll();
      setCategories(categoriesData.categories || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCreatingCategory(true);
    try {
      await apiService.categories.create({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim()
      });
      
      setNewCategoryName('');
      setNewCategoryDescription('');
      setNewCategoryCode('');
      await loadData();
      onDataChange();
    } catch (error: any) {
      alert('Error al crear categoría: ' + (error.message || 'Error desconocido'));
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubcategoryName.trim() || !selectedParentId) return;

    setCreatingSubcategory(true);
    try {
      await apiService.categories.createSubcategory({
        name: newSubcategoryName.trim(),
        description: newSubcategoryDescription.trim(),
        parentId: selectedParentId
      });
      
      setNewSubcategoryName('');
      setNewSubcategoryDescription('');
      setSelectedParentId('');
      await loadData();
      onDataChange();
    } catch (error: any) {
      alert('Error al crear subcategoría: ' + (error.message || 'Error desconocido'));
    } finally {
      setCreatingSubcategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoryName}"?`)) {
      return;
    }

    try {
      await apiService.categories.delete(categoryId);
      await loadData();
      onDataChange();
    } catch (error: any) {
      alert('Error al eliminar categoría: ' + (error.message || 'Error desconocido'));
    }
  };

  const openAttributesModal = (category: any) => {
    setSelectedCategoryForAttributes(category);
    setAttributesModalOpen(true);
  };

  const getParentCategories = () => categories.filter(cat => !cat.parentId);
  const getSubcategories = (parentId: string) => categories.filter(cat => cat.parentId === parentId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Categorías</DialogTitle>
          <DialogDescription>
            Cree y administre las categorías principales y subcategorías del inventario.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="categories">Categorías</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-6">
            {/* Crear Categoría Principal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderPlus className="h-5 w-5" />
                  Nueva Categoría Principal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-info/10 border border-info/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-info-foreground">
                    <strong>🔧 Códigos Automáticos:</strong> Se generará automáticamente un código de 3 letras 
                    para generar SKUs (ej: Bicicletas → BIC, Motocicletas → MOT).
                  </p>
                </div>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <Label htmlFor="categoryName">Nombre de Categoría *</Label>
                    <Input
                      id="categoryName"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ej: Bicicletas, Motocicletas, Accesorios"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="categoryDescription">Descripción (opcional)</Label>
                    <Textarea
                      id="categoryDescription"
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      placeholder="Descripción de la categoría"
                    />
                  </div>
                  <Button type="submit" disabled={creatingCategory || !newCategoryName.trim()}>
                    {creatingCategory ? 'Creando...' : 'Crear Categoría'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Crear Subcategoría */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Nueva Subcategoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateSubcategory} className="space-y-4">
                  <div>
                    <Label htmlFor="parentCategory">Categoría Principal</Label>
                    <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría principal" />
                      </SelectTrigger>
                      <SelectContent>
                        {getParentCategories().length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">No hay categorías principales disponibles</div>
                        ) : (
                          getParentCategories().map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subcategoryName">Nombre</Label>
                    <Input
                      id="subcategoryName"
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      placeholder="Ej: Cauchos de Bicicleta"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="subcategoryDescription">Descripción (opcional)</Label>
                    <Textarea
                      id="subcategoryDescription"
                      value={newSubcategoryDescription}
                      onChange={(e) => setNewSubcategoryDescription(e.target.value)}
                      placeholder="Descripción de la subcategoría"
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={creatingSubcategory || !newSubcategoryName.trim() || !selectedParentId || getParentCategories().length === 0}
                  >
                    {creatingSubcategory ? 'Creando...' : 'Crear Subcategoría'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Lista de Categorías */}
            <Card>
              <CardHeader>
                <CardTitle>Categorías Existentes</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Cargando categorías...</p>
                ) : (
                  <div className="space-y-4">
                    {getParentCategories().map((category) => (
                      <div key={category.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{category.name}</h4>
                              {category.code && (
                                <Badge variant="secondary" className="text-xs">
                                  Código: {category.code}
                                </Badge>
                              )}
                            </div>
                            {category.description && (
                              <p className="text-sm text-muted-foreground">{category.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAttributesModal(category)}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Atributos
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Subcategorías */}
                        <div className="ml-4 space-y-2">
                          {getSubcategories(category.id).map((subcategory) => (
                            <div key={subcategory.id} className="flex items-center justify-between p-2 bg-muted rounded">
                              <div>
                                <span className="text-sm">{subcategory.name}</span>
                                {subcategory.description && (
                                  <p className="text-xs text-muted-foreground">{subcategory.description}</p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openAttributesModal(subcategory)}
                                >
                                  <Settings className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCategory(subcategory.id, subcategory.name)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <CategoryAttributesModal
          isOpen={attributesModalOpen}
          onClose={() => setAttributesModalOpen(false)}
          category={selectedCategoryForAttributes}
        />
      </DialogContent>
    </Dialog>
  );
}
