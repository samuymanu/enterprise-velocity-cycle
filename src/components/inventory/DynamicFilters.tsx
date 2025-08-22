import { useEffect, useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiService } from "@/lib/api";
import { 
  X, Filter, ChevronDown, Save, Bookmark, BookmarkPlus,
  Zap, Minimize2, Maximize2, RotateCcw, Settings2,
  Calendar, Hash, TextIcon, CheckCircle, ListOrdered
} from "lucide-react";
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
  category?: string;
  priority?: number;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  isDefault?: boolean;
  createdAt: Date;
}

interface QuickFilter {
  id: string;
  name: string;
  icon: React.ReactNode;
  filter: Record<string, any>;
  color: string;
}

interface DynamicFiltersProps {
  categoryId: string | null;
  onFilterChange: (filters: Record<string, string>) => void;
  expanded?: boolean;
  compact?: boolean;
  showQuickFilters?: boolean;
}

export function DynamicFilters({ 
  categoryId, 
  onFilterChange, 
  expanded = false,
  compact = false,
  showQuickFilters = true 
}: DynamicFiltersProps) {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [isCompact, setIsCompact] = useState(compact);
  const [rangeValues, setRangeValues] = useState<Record<string, [number, number]>>({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [availableValues, setAvailableValues] = useState<Record<string, string[]>>({});
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Quick filters for common scenarios
  const quickFilters = useMemo<QuickFilter[]>(() => [
    {
      id: 'in-stock',
      name: 'En stock',
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      filter: { 'stock_status': 'in_stock' },
      color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
    },
    {
      id: 'low-stock',
      name: 'Stock bajo',
      icon: <Hash className="h-3.5 w-3.5" />,
      filter: { 'stock_status': 'low_stock' },
      color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'
    },
    {
      id: 'out-of-stock',
      name: 'Sin stock',
      icon: <X className="h-3.5 w-3.5" />,
      filter: { 'stock_status': 'out_of_stock' },
      color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
    },
    {
      id: 'new-arrivals',
      name: 'Nuevos',
      icon: <Zap className="h-3.5 w-3.5" />,
      filter: { 'created_recently': 'true' },
      color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
    }
  ], []);

  // Memoized filter processing
  const processedFilters = useMemo(() => {
    const stringFilters: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        stringFilters[key] = String(value);
      }
    });
    return stringFilters;
  }, [filters]);

  // Debounced filter change callback
  const debouncedFilterChange = useMemo(
    () => {
      let timeout: NodeJS.Timeout;
      return (newFilters: Record<string, string>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => onFilterChange(newFilters), 300);
      };
    },
    [onFilterChange]
  );

  // Apply quick filter
  const applyQuickFilter = useCallback((quickFilter: QuickFilter) => {
    setFilters(prev => ({
      ...prev,
      ...quickFilter.filter
    }));
  }, []);

  // Save current filters as preset
  const saveAsPreset = useCallback(() => {
    if (!presetName.trim()) return;
    
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: { ...filters },
      createdAt: new Date()
    };

    setFilterPresets(prev => [...prev, newPreset]);
    setPresetName('');
    setShowPresetSave(false);
    
    // Save to localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('filterPresets') || '[]');
      localStorage.setItem('filterPresets', JSON.stringify([...saved, newPreset]));
    } catch (error) {
      console.warn('Error saving filter preset:', error);
    }
  }, [presetName, filters]);

  // Load preset
  const loadPreset = useCallback((preset: FilterPreset) => {
    setFilters(preset.filters);
  }, []);

  // Delete preset
  const deletePreset = useCallback((presetId: string) => {
    setFilterPresets(prev => prev.filter(p => p.id !== presetId));
    
    try {
      const saved = JSON.parse(localStorage.getItem('filterPresets') || '[]');
      const updated = saved.filter((p: FilterPreset) => p.id !== presetId);
      localStorage.setItem('filterPresets', JSON.stringify(updated));
    } catch (error) {
      console.warn('Error deleting filter preset:', error);
    }
  }, []);

  // Load filter presets from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('filterPresets');
      if (saved) {
        const presets = JSON.parse(saved);
        setFilterPresets(presets);
      }
    } catch (error) {
      console.warn('Error loading filter presets:', error);
    }
  }, []);

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
  apiService.attributes.getAttributesByCategory(categoryId)
      .then((data) => {
        const attrs = data.attributes || [];
        
        // Sort attributes by priority and name
        attrs.sort((a: Attribute, b: Attribute) => {
          if (a.priority && b.priority) {
            return a.priority - b.priority;
          }
          if (a.priority) return -1;
          if (b.priority) return 1;
          return a.name.localeCompare(b.name);
        });
        
        // Initialize range values for numeric attributes
        const ranges: Record<string, [number, number]> = {};
        attrs.forEach((attr: Attribute) => {
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
    const activeCount = Object.values(filters).filter(v => v !== '' && v !== undefined && v !== null).length;
    setActiveFiltersCount(activeCount);
    debouncedFilterChange(processedFilters);
  }, [filters, debouncedFilterChange, processedFilters]);

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

  // Get attribute type icon
  const getAttributeTypeIcon = (type: string) => {
    switch (type) {
      case 'STRING': return <TextIcon className="h-3.5 w-3.5" />;
      case 'NUMBER': return <Hash className="h-3.5 w-3.5" />;
      case 'BOOLEAN': return <CheckCircle className="h-3.5 w-3.5" />;
      case 'LIST': return <ListOrdered className="h-3.5 w-3.5" />;
      case 'DATE': return <Calendar className="h-3.5 w-3.5" />;
      default: return <Filter className="h-3.5 w-3.5" />;
    }
  };

  // If no category selected
  if (!categoryId) {
    return (
      <Card className="mb-4 bg-muted/10">
        <div className="flex items-center justify-center p-6">
          <div className="text-center">
            <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">Seleccione una categoría</p>
            <p className="text-xs text-muted-foreground">Los filtros aparecerán aquí</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="mb-4 overflow-hidden">
        {/* Header with controls */}
        <div className="p-3 bg-primary/5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 p-1"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <Filter className="h-4 w-4 mr-2" />
                <span className="font-medium">Filtros</span>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
                <ChevronDown 
                  className={`h-4 w-4 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                />
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Compact mode toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setIsCompact(!isCompact)}
                  >
                    {isCompact ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCompact ? 'Modo expandido' : 'Modo compacto'}
                </TooltipContent>
              </Tooltip>

              {/* Presets dropdown */}
              {filterPresets.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Bookmark className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {filterPresets.map(preset => (
                      <DropdownMenuItem
                        key={preset.id}
                        onClick={() => loadPreset(preset)}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate">{preset.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePreset(preset.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Reset filters */}
              {activeFiltersCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={clearAllFilters}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Limpiar todos los filtros
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Quick filters */}
          {showQuickFilters && isExpanded && (
            <div className="mt-3 flex flex-wrap gap-2">
              {quickFilters.map(quickFilter => (
                <Button
                  key={quickFilter.id}
                  variant="outline"
                  size="sm"
                  className={`h-7 text-xs border ${quickFilter.color}`}
                  onClick={() => applyQuickFilter(quickFilter)}
                >
                  {quickFilter.icon}
                  <span className="ml-1">{quickFilter.name}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Active filters display */}
        {activeFiltersCount > 0 && isExpanded && (
          <div className="p-3 bg-background border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Filtros activos</span>
              <div className="flex items-center gap-2">
                {/* Save preset button */}
                {!showPresetSave ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={() => setShowPresetSave(true)}
                  >
                    <BookmarkPlus className="h-3 w-3 mr-1" />
                    Guardar
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder="Nombre del filtro"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="h-6 text-xs w-32"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveAsPreset();
                        if (e.key === 'Escape') setShowPresetSave(false);
                      }}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={saveAsPreset}
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => setShowPresetSave(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-xs"
                  onClick={clearAllFilters}
                >
                  Limpiar todo
                </Button>
              </div>
            </div>
            
            {/* Active filter badges */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => {
                if (!value && value !== false) return null;
                
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
                  <Badge 
                    key={key} 
                    variant="secondary"
                    className="flex items-center gap-1 text-xs bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    {attr && getAttributeTypeIcon(attr.type)}
                    <span className="font-medium">{label}:</span>
                    <span>{displayValue}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-4 w-4 p-0 rounded-full hover:bg-primary/30 ml-1"
                      onClick={() => clearFilter(key)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters content */}
        {isExpanded && (
          <div className={`p-4 ${isCompact ? 'space-y-3' : ''}`}>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Cargando filtros...</span>
                </div>
              </div>
            ) : attributes.length === 0 ? (
              <div className="flex items-center justify-center p-6">
                <div className="text-center">
                  <Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Sin filtros disponibles</p>
                  <p className="text-xs text-muted-foreground">Esta categoría no tiene atributos configurados</p>
                </div>
              </div>
            ) : (
              renderFiltersContent()
            )}
          </div>
        )}
      </Card>
    </TooltipProvider>
  );

  // Render filters content based on compact mode
  function renderFiltersContent() {
    // Group attributes by type for better organization
    const groupedAttributes = {
      list: attributes.filter(attr => attr.type === 'LIST'),
      boolean: attributes.filter(attr => attr.type === 'BOOLEAN'),
      number: attributes.filter(attr => attr.type === 'NUMBER'),
      string: attributes.filter(attr => attr.type === 'STRING'),
      date: attributes.filter(attr => attr.type === 'DATE')
    };

    if (isCompact) {
      // Compact mode: show all filters in a grid
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* List filters */}
          {groupedAttributes.list.map(attr => (
            <div key={attr.attributeId} className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                {getAttributeTypeIcon(attr.type)}
                {attr.name}
              </Label>
              <Select
                value={filters[`attr_${attr.attributeId}`] || ''}
                onValueChange={(value) => {
                  if (value) {
                    setFilters(f => ({ ...f, [`attr_${attr.attributeId}`]: value }));
                  } else {
                    clearFilter(`attr_${attr.attributeId}`);
                  }
                }}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {(availableValues[attr.attributeId] || attr.values).map(value => (
                    <SelectItem key={value} value={value}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Boolean filters */}
          {groupedAttributes.boolean.map(attr => (
            <div key={attr.attributeId} className="flex items-center justify-between space-x-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                {getAttributeTypeIcon(attr.type)}
                {attr.name}
              </Label>
              <Switch
                checked={filters[`attr_${attr.attributeId}`] === 'true'}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFilters(f => ({ ...f, [`attr_${attr.attributeId}`]: 'true' }));
                  } else {
                    clearFilter(`attr_${attr.attributeId}`);
                  }
                }}
              />
            </div>
          ))}

          {/* String filters */}
          {groupedAttributes.string.map(attr => (
            <div key={attr.attributeId} className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                {getAttributeTypeIcon(attr.type)}
                {attr.name}
              </Label>
              <Input
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
                className="h-8"
              />
            </div>
          ))}
        </div>
      );
    }

    // Expanded mode: use accordion
    return (
      <Accordion type="multiple" className="w-full">
        {/* List filters */}
        {groupedAttributes.list.length > 0 && (
          <AccordionItem value="list-filters" className="border-b">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4" />
                Opciones ({groupedAttributes.list.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedAttributes.list.map(attr => (
                  <div key={attr.attributeId} className="space-y-2">
                    <Label className="font-medium">{attr.name}</Label>
                    <div className="space-y-2">
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
                            className="text-sm cursor-pointer leading-none"
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
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Rangos ({groupedAttributes.number.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6">
                {groupedAttributes.number.map(attr => (
                  <div key={attr.attributeId} className="space-y-3">
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
                        <div className="flex justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">Min:</span>
                            <Input
                              type="number"
                              value={rangeValues[attr.attributeId]?.[0] || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (!isNaN(val)) {
                                  handleRangeChange(attr.attributeId, [val, rangeValues[attr.attributeId]?.[1] || attr.maxValue!]);
                                }
                              }}
                              className="h-8 w-24 text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">Max:</span>
                            <Input
                              type="number"
                              value={rangeValues[attr.attributeId]?.[1] || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (!isNaN(val)) {
                                  handleRangeChange(attr.attributeId, [rangeValues[attr.attributeId]?.[0] || attr.minValue!, val]);
                                }
                              }}
                              className="h-8 w-24 text-xs"
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
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Sí/No ({groupedAttributes.boolean.length})
              </div>
            </AccordionTrigger>
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

        {/* String filters */}
        {groupedAttributes.string.length > 0 && (
          <AccordionItem value="text-filters" className="border-b">
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2">
                <TextIcon className="h-4 w-4" />
                Texto ({groupedAttributes.string.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {groupedAttributes.string.map(attr => (
                  <div key={attr.attributeId} className="space-y-2">
                    <Label htmlFor={`text-${attr.attributeId}`} className="font-medium">
                      {attr.name}
                    </Label>
                    <Input
                      id={`text-${attr.attributeId}`}
                      placeholder={`Buscar por ${attr.name.toLowerCase()}`}
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
            <AccordionTrigger className="py-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fechas ({groupedAttributes.date.length})
              </div>
            </AccordionTrigger>
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
    );
  }
}
