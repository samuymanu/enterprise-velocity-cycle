import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { apiService } from "@/lib/api";
import { X, Filter, ChevronDown } from "lucide-react";
import { DynamicFilters as DynamicFiltersType } from "@/types/inventory";

interface Attribute {
  attributeId: string;
  name: string;
  type: string;
  isRequired: boolean;
  values: string[];
  unit?: string;
  minValue?: number;
  maxValue?: number;
  helpText?: string;
}

interface DynamicFiltersProps {
  categoryId: string | null;
  onFilterChange: (filters: Record<string, string>) => void;
  expanded?: boolean;
}

export function DynamicFilters({ categoryId, onFilterChange, expanded = false }: DynamicFiltersProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [rangeValues, setRangeValues] = useState<Record<string, [number, number]>>({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [availableValues, setAvailableValues] = useState<Record<string, string[]>>({});

  // Load attributes based on category
  useEffect(() => {
    if (!categoryId) {
      setAttributes([]);
      setFilters({});
      setRangeValues({});
      return;
    }
    
    setLoading(true);
    
    // Get attributes from server
    apiService.products.getAttributesByCategory(categoryId)
      .then((data) => {
        const attrs = data.attributes || [];
        
        // Initialize range values for numeric attributes
        const ranges: Record<string, [number, number]> = {};
        attrs.forEach(attr => {
          if (attr.type === 'NUMBER' && attr.minValue !== undefined && attr.maxValue !== undefined) {
            ranges[attr.attributeId] = [attr.minValue, attr.maxValue];
          }
        });
        
        setAttributes(attrs);
        setRangeValues(ranges);
        setFilters({});
        
        // Get available values for each attribute by querying the inventory endpoint
        fetch(`${apiService.getApiUrl()}/inventory/filters?categoryId=${categoryId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.filters) {
              const values: Record<string, string[]> = {};
              data.filters.forEach((filter: any) => {
                values[filter.id] = filter.values || [];
              });
              setAvailableValues(values);
            }
          })
          .catch(err => console.error('Error loading filter values:', err));
      })
      .finally(() => setLoading(false));
  }, [categoryId]);

  // Update filter count and notify parent component when filters change
  useEffect(() => {
    const activeCount = Object.values(filters).filter(v => v !== '' && v !== undefined).length;
    setActiveFiltersCount(activeCount);
    
    // Convert all filter values to strings for the API
    const stringFilters: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) {
        stringFilters[key] = String(value);
      }
    });
    
    onFilterChange(stringFilters);
  }, [filters, onFilterChange]);

  // Handle range filter change
  const handleRangeChange = (attributeId: string, values: [number, number]) => {
    setRangeValues(prev => ({
      ...prev,
      [attributeId]: values
    }));
  };

  // Apply range filter
  const applyRangeFilter = (attributeId: string) => {
    const values = rangeValues[attributeId];
    if (values) {
      setFilters(prev => ({
        ...prev,
        [`attr_${attributeId}_min`]: values[0],
        [`attr_${attributeId}_max`]: values[1]
      }));
    }
  };

  // Clear a single filter
  const clearFilter = (key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({});
    
    // Reset range values to original min/max
    const ranges: Record<string, [number, number]> = {};
    attributes.forEach(attr => {
      if (attr.type === 'NUMBER' && attr.minValue !== undefined && attr.maxValue !== undefined) {
        ranges[attr.attributeId] = [attr.minValue, attr.maxValue];
      }
    });
    setRangeValues(ranges);
  };

  // Toggle expanded state
  const toggleExpanded = () => setIsExpanded(!isExpanded);

  // If no category or attributes, show placeholder
  if (!categoryId) {
    return (
      <Card className="p-4 mb-4 bg-muted/10">
        <div className="flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">Seleccione una categoría para ver filtros</p>
        </div>
      </Card>
    );
  }

  // Group attributes by type for better organization
  const groupedAttributes = {
    list: attributes.filter(attr => attr.type === 'LIST'),
    boolean: attributes.filter(attr => attr.type === 'BOOLEAN'),
    number: attributes.filter(attr => attr.type === 'NUMBER'),
    string: attributes.filter(attr => attr.type === 'STRING'),
    date: attributes.filter(attr => attr.type === 'DATE')
  };

  return (
    <Card className="mb-4 overflow-hidden">
      {/* Header with filter count and expand/collapse */}
      <div 
        className="p-3 flex items-center justify-between bg-primary/5 border-b cursor-pointer"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Filtros</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <ChevronDown 
          className={`h-5 w-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
        />
      </div>
      
      {/* Active filters */}
      {activeFiltersCount > 0 && (
        <div className="p-3 bg-background border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Filtros activos</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={clearAllFilters}
            >
              Limpiar todo
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              // Extract attribute info from key
              const attributeId = key.startsWith('attr_') 
                ? key.replace('attr_', '').split('_')[0]
                : '';
              
              const attr = attributes.find(a => a.attributeId === attributeId);
              let label = attributeId ? (attr?.name || attributeId) : key;
              
              // Format value display
              let displayValue = String(value);
              if (key.endsWith('_min')) {
                label = `${attr?.name || 'Valor'} mínimo`;
              } else if (key.endsWith('_max')) {
                label = `${attr?.name || 'Valor'} máximo`;
              } else if (attr?.type === 'BOOLEAN') {
                displayValue = value ? 'Sí' : 'No';
              }
              
              return (
                <div 
                  key={key} 
                  className="flex items-center gap-1 text-xs bg-primary/10 rounded-full pl-3 pr-1 py-1"
                >
                  <span className="font-medium">{label}:</span>
                  <span>{displayValue}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0 rounded-full hover:bg-primary/20"
                    onClick={() => clearFilter(key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Filter content - only show when expanded */}
      {isExpanded && (
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">Cargando filtros...</p>
            </div>
          ) : attributes.length === 0 ? (
            <div className="flex items-center justify-center p-4">
              <p className="text-sm text-muted-foreground">Esta categoría no tiene atributos configurados</p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {/* List filters (most common first) */}
              {groupedAttributes.list.length > 0 && (
                <AccordionItem value="list-filters" className="border-b">
                  <AccordionTrigger className="py-2">Opciones</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-4">
                      {groupedAttributes.list.map(attr => (
                        <div key={attr.attributeId} className="space-y-2">
                          <Label className="font-medium">{attr.name}</Label>
                          <div className="space-y-1">
                            {(availableValues[attr.attributeId] || attr.values).map(value => (
                              <div key={value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${attr.attributeId}-${value}`}
                                  checked={filters[`attr_${attr.attributeId}`] === value}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFilters(f => ({ ...f, [`attr_${attr.attributeId}`]: value }));
                                    } else {
                                      clearFilter(`attr_${attr.attributeId}`);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`${attr.attributeId}-${value}`}
                                  className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {value}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {/* Number range filters */}
              {groupedAttributes.number.length > 0 && (
                <AccordionItem value="number-filters" className="border-b">
                  <AccordionTrigger className="py-2">Rangos</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {groupedAttributes.number.map(attr => (
                        <div key={attr.attributeId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="font-medium">
                              {attr.name} {attr.unit ? `(${attr.unit})` : ''}
                            </Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => applyRangeFilter(attr.attributeId)}
                              className="h-7 text-xs"
                            >
                              Aplicar
                            </Button>
                          </div>
                          
                          {/* Range slider */}
                          {attr.minValue !== undefined && attr.maxValue !== undefined && (
                            <>
                              <Slider
                                defaultValue={[attr.minValue, attr.maxValue]}
                                min={attr.minValue}
                                max={attr.maxValue}
                                step={(attr.maxValue - attr.minValue) / 100}
                                value={rangeValues[attr.attributeId]}
                                onValueChange={(values) => handleRangeChange(attr.attributeId, values as [number, number])}
                                className="py-4"
                              />
                              <div className="flex justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">Min:</span>
                                  <Input
                                    type="number"
                                    value={rangeValues[attr.attributeId]?.[0]}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      if (!isNaN(val)) {
                                        handleRangeChange(attr.attributeId, [val, rangeValues[attr.attributeId]?.[1] || attr.maxValue!]);
                                      }
                                    }}
                                    className="h-7 w-20 text-xs"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">Max:</span>
                                  <Input
                                    type="number"
                                    value={rangeValues[attr.attributeId]?.[1]}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      if (!isNaN(val)) {
                                        handleRangeChange(attr.attributeId, [rangeValues[attr.attributeId]?.[0] || attr.minValue!, val]);
                                      }
                                    }}
                                    className="h-7 w-20 text-xs"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {/* Boolean filters */}
              {groupedAttributes.boolean.length > 0 && (
                <AccordionItem value="boolean-filters" className="border-b">
                  <AccordionTrigger className="py-2">Sí/No</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {groupedAttributes.boolean.map(attr => (
                        <div key={attr.attributeId} className="flex items-center justify-between space-x-2">
                          <Label htmlFor={`switch-${attr.attributeId}`} className="font-medium">
                            {attr.name}
                          </Label>
                          <Switch
                            id={`switch-${attr.attributeId}`}
                            checked={filters[`attr_${attr.attributeId}`] === 'true'}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(f => ({ ...f, [`attr_${attr.attributeId}`]: 'true' }));
                              } else if (filters[`attr_${attr.attributeId}`] === 'true') {
                                clearFilter(`attr_${attr.attributeId}`);
                              } else {
                                setFilters(f => ({ ...f, [`attr_${attr.attributeId}`]: 'false' }));
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {/* Text search filters */}
              {groupedAttributes.string.length > 0 && (
                <AccordionItem value="text-filters" className="border-b">
                  <AccordionTrigger className="py-2">Texto</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {groupedAttributes.string.map(attr => (
                        <div key={attr.attributeId} className="space-y-2">
                          <Label htmlFor={`text-${attr.attributeId}`} className="font-medium">
                            {attr.name}
                          </Label>
                          <Input
                            id={`text-${attr.attributeId}`}
                            placeholder={`Buscar por ${attr.name}`}
                            value={filters[`attr_${attr.attributeId}`] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                setFilters(f => ({ ...f, [`attr_${attr.attributeId}`]: val }));
                              } else {
                                clearFilter(`attr_${attr.attributeId}`);
                              }
                            }}
                          />
                          {attr.helpText && (
                            <p className="text-xs text-muted-foreground">{attr.helpText}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              
              {/* Date filters */}
              {groupedAttributes.date.length > 0 && (
                <AccordionItem value="date-filters" className="border-b">
                  <AccordionTrigger className="py-2">Fechas</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {groupedAttributes.date.map(attr => (
                        <div key={attr.attributeId} className="space-y-2">
                          <Label htmlFor={`date-${attr.attributeId}`} className="font-medium">
                            {attr.name}
                          </Label>
                          <Input
                            id={`date-${attr.attributeId}`}
                            type="date"
                            value={filters[`attr_${attr.attributeId}`] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                setFilters(f => ({ ...f, [`attr_${attr.attributeId}`]: val }));
                              } else {
                                clearFilter(`attr_${attr.attributeId}`);
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </div>
      )}
    </Card>
  );
}
