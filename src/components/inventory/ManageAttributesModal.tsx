import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Attribute {
  id: string;
  name: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'LIST' | 'DATE';
  unit?: string;
  options: string[];
  description?: string;
  isActive: boolean;
  categoryAttributes: Array<{
    category: {
      id: string;
      name: string;
    };
  }>;
  _count: {
    productValues: number;
  };
}

interface Category {
  id: string;
  name: string;
}

interface ManageAttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

const attributeTypes = [
  { value: 'STRING', label: 'Texto' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'BOOLEAN', label: 'Verdadero/Falso' },
  { value: 'LIST', label: 'Lista de opciones' },
  { value: 'DATE', label: 'Fecha' }
];

export function ManageAttributesModal({ isOpen, onClose, categories }: ManageAttributesModalProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'STRING' as Attribute['type'],
    unit: '',
    options: [] as string[],
    description: '',
    isActive: true,
    newOption: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchAttributes();
    }
  }, [isOpen]);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/attributes', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttributes(data.attributes);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los atributos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'STRING',
      unit: '',
      options: [],
      description: '',
      isActive: true,
      newOption: ''
    });
    setEditingAttribute(null);
    setIsCreating(false);
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
  };

  const startEditing = (attribute: Attribute) => {
    setFormData({
      name: attribute.name,
      type: attribute.type,
      unit: attribute.unit || '',
      options: [...attribute.options],
      description: attribute.description || '',
      isActive: attribute.isActive,
      newOption: ''
    });
    setEditingAttribute(attribute);
    setIsCreating(true);
  };

  const addOption = () => {
    if (formData.newOption.trim() && !formData.options.includes(formData.newOption.trim())) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, prev.newOption.trim()],
        newOption: ''
      }));
    }
  };

  const removeOption = (option: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter(opt => opt !== option)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive"
      });
      return;
    }

    if (formData.type === 'LIST' && formData.options.length === 0) {
      toast({
        title: "Error",
        description: "Los atributos de tipo lista deben tener al menos una opción",
        variant: "destructive"
      });
      return;
    }

    try {
      const url = editingAttribute ? `/api/attributes/${editingAttribute.id}` : '/api/attributes';
      const method = editingAttribute ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          unit: formData.unit.trim() || null,
          options: formData.type === 'LIST' ? formData.options : [],
          description: formData.description.trim() || null,
          isActive: formData.isActive
        })
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: editingAttribute ? "Atributo actualizado" : "Atributo creado",
        });
        fetchAttributes();
        resetForm();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Error al guardar atributo",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      });
    }
  };

  const deleteAttribute = async (attribute: Attribute) => {
    if (attribute._count.productValues > 0) {
      toast({
        title: "Error",
        description: "No se puede eliminar un atributo que tiene productos asociados",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`¿Está seguro de eliminar el atributo "${attribute.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/attributes/${attribute.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Atributo eliminado",
        });
        fetchAttributes();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Error al eliminar atributo",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { onClose(); resetForm(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Gestionar Atributos</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
          {/* Lista de atributos */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Atributos existentes</h3>
              <Button onClick={startCreating} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo
              </Button>
            </div>

            <div className="overflow-y-auto h-full border rounded-lg">
              {loading ? (
                <div className="p-4 text-center">Cargando...</div>
              ) : attributes.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No hay atributos creados
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {attributes.map((attribute) => (
                    <div key={attribute.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{attribute.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {attributeTypes.find(t => t.value === attribute.type)?.label}
                            </Badge>
                            {!attribute.isActive && (
                              <Badge variant="destructive" className="text-xs">
                                Inactivo
                              </Badge>
                            )}
                          </div>
                          {attribute.unit && (
                            <p className="text-sm text-muted-foreground">
                              Unidad: {attribute.unit}
                            </p>
                          )}
                          {attribute.description && (
                            <p className="text-sm text-muted-foreground">
                              {attribute.description}
                            </p>
                          )}
                          {attribute.options.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">Opciones:</p>
                              <div className="flex flex-wrap gap-1">
                                {attribute.options.map((option, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {option}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground">
                            Usado en {attribute._count.productValues} productos
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(attribute)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAttribute(attribute)}
                            disabled={attribute._count.productValues > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Formulario */}
          {isCreating && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  {editingAttribute ? 'Editar atributo' : 'Crear atributo'}
                </h3>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto h-full">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ej: Tamaño de rueda, Color, Material"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de dato</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: Attribute['type']) => 
                      setFormData(prev => ({ ...prev, type: value, options: value === 'LIST' ? prev.options : [] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {attributeTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(formData.type === 'NUMBER') && (
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidad (opcional)</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="ej: cm, kg, pulgadas"
                    />
                  </div>
                )}

                {formData.type === 'LIST' && (
                  <div className="space-y-2">
                    <Label>Opciones</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.newOption}
                        onChange={(e) => setFormData(prev => ({ ...prev, newOption: e.target.value }))}
                        placeholder="Agregar opción"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                      />
                      <Button type="button" onClick={addOption} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.options.map((option, idx) => (
                        <Badge key={idx} variant="secondary" className="cursor-pointer">
                          {option}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-1"
                            onClick={() => removeOption(option)}
                          >
                            ×
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del atributo"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Activo</Label>
                </div>

                <Button type="submit" className="w-full">
                  {editingAttribute ? 'Actualizar atributo' : 'Crear atributo'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}