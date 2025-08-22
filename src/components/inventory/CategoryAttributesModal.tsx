import { useState, useEffect } from "react";
import { apiService } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Attribute {
  id: string;
  name: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'LIST' | 'DATE';
  unit?: string;
  options: string[];
  description?: string;
  isActive: boolean;
}

interface CategoryAttribute {
  id: string;
  categoryId: string;
  attributeId: string;
  isRequired: boolean;
  sortOrder: number;
  attribute: Attribute;
}

interface Category {
  id: string;
  name: string;
}

interface CategoryAttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
}

const attributeTypes = [
  { value: 'STRING', label: 'Texto' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'BOOLEAN', label: 'Verdadero/Falso' },
  { value: 'LIST', label: 'Lista de opciones' },
  { value: 'DATE', label: 'Fecha' }
];

export function CategoryAttributesModal({ isOpen, onClose, category }: CategoryAttributesModalProps) {
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>('');
  const [isRequired, setIsRequired] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && category) {
      fetchCategoryAttributes();
      fetchAvailableAttributes();
    }
  }, [isOpen, category]);

  const fetchCategoryAttributes = async () => {
    if (!category) return;
    try {
      setLoading(true);
      const data = await apiService.categoryAttributes.getByCategory(category.id);
      // La API devuelve un formato diferente, necesitamos mapear los datos
      const mappedAttributes = data.attributes?.map((attr: any) => ({
        id: `${category.id}-${attr.id}`, // ID único para la asignación
        categoryId: category.id,
        attributeId: attr.id,
        isRequired: attr.isRequired || attr.categoryAssignment?.isRequired || false,
        sortOrder: attr.sortOrder || attr.categoryAssignment?.sortOrder || 0,
        attribute: {
          id: attr.id,
          name: attr.name,
          type: attr.type,
          unit: attr.unit,
          options: attr.options || [],
          description: attr.description,
          isActive: attr.isActive
        }
      })) || [];
      setCategoryAttributes(mappedAttributes);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los atributos de la categoría",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAttributes = async () => {
    try {
      const data = await apiService.categoryAttributes.getAllAttributes();
      // La API devuelve { success: true, attributes: [...] }
      setAvailableAttributes((data.attributes || []).filter((attr: Attribute) => attr.isActive));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los atributos disponibles",
        variant: "destructive"
      });
    }
  };

  const assignAttribute = async () => {
    if (!category || !selectedAttributeId) return;
    try {
      await apiService.categoryAttributes.assign(category.id, selectedAttributeId, isRequired, categoryAttributes.length + 1);
      toast({
        title: "Éxito",
        description: "Atributo asignado a la categoría",
      });
      fetchCategoryAttributes();
      setSelectedAttributeId('');
      setIsRequired(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al asignar atributo",
        variant: "destructive"
      });
    }
  };

  const unassignAttribute = async (attributeId: string) => {
    if (!category) return;
    if (!confirm('¿Está seguro de desasignar este atributo de la categoría?')) return;
    try {
      await apiService.categoryAttributes.unassign(category.id, attributeId);
      toast({
        title: "Éxito",
        description: "Atributo desasignado de la categoría",
      });
      fetchCategoryAttributes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al desasignar atributo",
        variant: "destructive"
      });
    }
  };

  const getAssignedAttributeIds = () => {
    return categoryAttributes.map(ca => ca.attributeId);
  };

  const getAvailableForAssignment = () => {
    const assignedIds = getAssignedAttributeIds();
    return availableAttributes.filter(attr => !assignedIds.includes(attr.id));
  };

  if (!category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Atributos de la categoría: {category.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 h-[70vh] overflow-y-auto">
          {/* Asignar nuevo atributo */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-medium">Asignar atributo</h3>
            
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="attribute">Atributo</Label>
                <Select
                  value={selectedAttributeId}
                  onValueChange={setSelectedAttributeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar atributo" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableForAssignment().map((attribute) => (
                      <SelectItem key={attribute.id} value={attribute.id}>
                        <div className="flex items-center gap-2">
                          <span>{attribute.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {attributeTypes.find(t => t.value === attribute.type)?.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isRequired"
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
                <Label htmlFor="isRequired">Requerido</Label>
              </div>

              <Button
                onClick={assignAttribute}
                disabled={!selectedAttributeId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Asignar
              </Button>
            </div>
          </div>

          {/* Lista de atributos asignados */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Atributos asignados</h3>

            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : categoryAttributes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay atributos asignados a esta categoría
              </div>
            ) : (
              <div className="space-y-3">
                {categoryAttributes.map((categoryAttribute) => (
                  <div
                    key={categoryAttribute.id}
                    className="border rounded-lg p-4 flex justify-between items-start"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{categoryAttribute.attribute.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {attributeTypes.find(t => t.value === categoryAttribute.attribute.type)?.label}
                        </Badge>
                        {categoryAttribute.isRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Requerido
                          </Badge>
                        )}
                      </div>

                      {categoryAttribute.attribute.unit && (
                        <p className="text-sm text-muted-foreground mb-1">
                          Unidad: {categoryAttribute.attribute.unit}
                        </p>
                      )}

                      {categoryAttribute.attribute.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {categoryAttribute.attribute.description}
                        </p>
                      )}

                      {categoryAttribute.attribute.options.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Opciones:</p>
                          <div className="flex flex-wrap gap-1">
                            {categoryAttribute.attribute.options.map((option, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {option}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unassignAttribute(categoryAttribute.attributeId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}