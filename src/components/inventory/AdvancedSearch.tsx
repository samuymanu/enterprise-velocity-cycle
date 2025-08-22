import { useState, useEffect, useRef } from "react";
import { Search, X, Filter, ChevronDown, Calendar, DollarSign, Package, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { apiService } from "@/lib/api";

interface SearchFilter {
  id: string;
  type: 'text' | 'select' | 'range' | 'date' | 'boolean';
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  value?: any;
}

interface AdvancedSearchProps {
  onSearch: (filters: any) => void;
  onClear: () => void;
  categories?: any[];
  loading?: boolean;
  className?: string;
}

interface SearchSuggestion {
  type: 'product' | 'category' | 'subcategory' | 'brand' | 'sku';
  value: string;
  label: string;
  count?: number;
  categoryId?: string;
  parentId?: string;
}

export function AdvancedSearch({ onSearch, onClear, categories = [], loading = false, className = "" }: AdvancedSearchProps) {
  // Estados principales
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Referencias
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Configuración de filtros avanzados
  const advancedFilters: SearchFilter[] = [
    {
      id: 'categoryId',
      type: 'select',
      label: 'Categoría',
      placeholder: 'Seleccionar categoría',
      options: [
        // Categorías principales
        ...categories.filter(cat => !cat.parentId).map(cat => ({ 
          value: cat.id, 
          label: cat.name 
        })),
        // Subcategorías con formato jerárquico
        ...categories.filter(cat => cat.parentId).map(cat => {
          const parent = categories.find(p => p.id === cat.parentId);
          return {
            value: cat.id, 
            label: `${parent?.name} > ${cat.name}`
          };
        })
      ]
    },
    {
      id: 'status',
      type: 'select',
      label: 'Estado',
      placeholder: 'Seleccionar estado',
      options: [
        { value: 'ACTIVE', label: 'Activo' },
        { value: 'INACTIVE', label: 'Inactivo' },
        { value: 'STOCK_BAJO', label: 'Stock Bajo' },
        { value: 'SIN_STOCK', label: 'Sin Stock' }
      ]
    },
    {
      id: 'priceRange',
      type: 'range',
      label: 'Rango de Precio',
      min: 0,
      max: 1000000
    },
    {
      id: 'stockRange',
      type: 'range',
      label: 'Rango de Stock',
      min: 0,
      max: 10000
    },
    {
      id: 'createdDate',
      type: 'date',
      label: 'Fecha de Creación'
    },
    {
      id: 'hasImages',
      type: 'boolean',
      label: 'Con Imágenes'
    },
    {
      id: 'hasBarcode',
      type: 'boolean',
      label: 'Con Código de Barras'
    }
  ];

  // Operadores de búsqueda
  // Operadores de búsqueda (ocultados en la UI para simplificar la experiencia)

  // quick search removed: improved UX by using suggestions & advanced filters instead

  // Efecto para sugerencias automáticas
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        await fetchSuggestions(searchQuery);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Función para obtener sugerencias
  const fetchSuggestions = async (query: string) => {
    try {
      setIsLoadingSuggestions(true);
      const response = await apiService.products.getSuggestions(query);
      setSuggestions(response.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // Fallback: sugerencias básicas locales
      const localSuggestions: SearchSuggestion[] = [
        { type: 'sku', value: query, label: `Buscar SKU: ${query}` },
        { type: 'product', value: query, label: `Buscar producto: ${query}` },
        { type: 'brand', value: query, label: `Buscar marca: ${query}` }
      ];
      setSuggestions(localSuggestions);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Función para manejar la búsqueda
  const handleSearch = () => {
    const filters: any = { ...activeFilters };
    
    if (searchQuery.trim()) {
      // Procesar prefijos tipo "sku:ABC", "brand:Trek" y operadores
      let processedQuery = searchQuery.trim();
      let searchType = 'contains';
      let searchField: string | undefined;

      // Detectar prefijo de campo (campo:valor)
      const fieldMatch = processedQuery.match(/^([a-zA-Z]+):\s*(.*)$/);
      if (fieldMatch) {
        const field = fieldMatch[1].toLowerCase();
        const val = fieldMatch[2] || '';
        // Mapear aliases a campos conocidos
        if (['sku', 'name', 'brand', 'category', 'barcode'].includes(field)) {
          searchField = field;
          processedQuery = val.trim();
        }
      }

      // Procesar operadores de búsqueda sobre el valor restante
      if (processedQuery.startsWith('"') && processedQuery.endsWith('"')) {
        processedQuery = processedQuery.slice(1, -1);
        searchType = 'exact';
      } else if (processedQuery.startsWith('^')) {
        processedQuery = processedQuery.slice(1);
        searchType = 'starts';
      } else if (processedQuery.endsWith('$')) {
        processedQuery = processedQuery.slice(0, -1);
        searchType = 'ends';
      } else if (processedQuery.startsWith('-')) {
        processedQuery = processedQuery.slice(1);
        searchType = 'not';
      }

      // Si es búsqueda por categoría (prefix category:), aplicarla como filtro de categoría
      if (searchField === 'category') {
        filters.category = processedQuery;
      } else {
        filters.search = processedQuery;
        filters.searchType = searchType;
        if (searchField) filters.searchField = searchField;
      }
    }
    
    onSearch(filters);
    setShowSuggestions(false);
  };

  // Función para limpiar filtros
  const handleClear = () => {
    setSearchQuery("");
    setActiveFilters({});
    setShowSuggestions(false);
    onClear();
  };

  // Función para aplicar filtro
  const applyFilter = (filterId: string, value: any) => {
    const newFilters = { ...activeFilters };
    if (value && value !== '' && value !== null && value !== undefined) {
      newFilters[filterId] = value;
    } else {
      delete newFilters[filterId];
    }
    setActiveFilters(newFilters);
  };

  // Función para remover filtro específico
  const removeFilter = (filterId: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterId];
    setActiveFilters(newFilters);
  };

  // Función para seleccionar sugerencia
  const selectSuggestion = (suggestion: SearchSuggestion) => {
    // Para categorías y subcategorías, aplicar filtro específico
    if (suggestion.type === 'category' || suggestion.type === 'subcategory') {
      const newFilters = { ...activeFilters };
      newFilters.categoryId = suggestion.categoryId;
      setActiveFilters(newFilters);
      setSearchQuery('');
      setShowSuggestions(false);
      // Aplicar búsqueda con filtro de categoría
      onSearch(newFilters);
    } else {
      // Para productos, marcas y SKUs, usar búsqueda de texto
      setSearchQuery(suggestion.value);
      setShowSuggestions(false);
      // Auto-buscar al seleccionar sugerencia
      setTimeout(() => handleSearch(), 100);
    }
  };

  // Función para manejar click fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Contar filtros activos
  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <Card className={`p-6 ${className}`}>
      {/* Búsqueda principal */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Búsqueda inteligente: SKU, nombre, marca, código... (Usa ^ $ '' - para operadores)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
              className="pl-10 pr-4 h-12 text-base"
              disabled={loading}
            />
            
            {/* Sugerencias automáticas */}
            {showSuggestions && (
              <div 
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
              >
                {isLoadingSuggestions ? (
                  <div className="p-3 text-center text-muted-foreground">
                    <span className="animate-spin">⏳</span> Buscando...
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      <span className="text-xs">
                        {suggestion.type === 'product' && '📦'}
                        {suggestion.type === 'category' && '📁'}
                        {suggestion.type === 'subcategory' && '📂'}
                        {suggestion.type === 'brand' && '🏢'}
                        {suggestion.type === 'sku' && '🏷️'}
                      </span>
                      <span className="flex-1">{suggestion.label}</span>
                      {suggestion.count && (
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.count}
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-muted-foreground">
                    No se encontraron sugerencias
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Botones de acción */}
          <Button onClick={handleSearch} disabled={loading} className="h-12 px-6">
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
          
          <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-12 px-4" disabled={loading}>
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 bg-background border border-border shadow-lg backdrop-blur-sm" align="end">
              <div className="p-4 bg-background/95">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Filtros Avanzados</h4>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleClear}>
                      <X className="h-4 w-4 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {advancedFilters.map((filter) => (
                    <div key={filter.id} className="space-y-2">
                      <Label htmlFor={filter.id} className="text-sm font-medium">
                        {filter.label}
                      </Label>
                      
                      {filter.type === 'select' && (
                        <Select
                          value={activeFilters[filter.id] || ''}
                          onValueChange={(value) => applyFilter(filter.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={filter.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {filter.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {filter.type === 'range' && (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Mín"
                            min={filter.min}
                            max={filter.max}
                            value={activeFilters[`${filter.id}_min`] || ''}
                            onChange={(e) => applyFilter(`${filter.id}_min`, e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="Máx"
                            min={filter.min}
                            max={filter.max}
                            value={activeFilters[`${filter.id}_max`] || ''}
                            onChange={(e) => applyFilter(`${filter.id}_max`, e.target.value)}
                          />
                        </div>
                      )}
                      
                      {filter.type === 'date' && (
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={activeFilters[`${filter.id}_from`] || ''}
                            onChange={(e) => applyFilter(`${filter.id}_from`, e.target.value)}
                          />
                          <Input
                            type="date"
                            value={activeFilters[`${filter.id}_to`] || ''}
                            onChange={(e) => applyFilter(`${filter.id}_to`, e.target.value)}
                          />
                        </div>
                      )}
                      
                      {filter.type === 'boolean' && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={filter.id}
                            checked={activeFilters[filter.id] === true}
                            onCheckedChange={(checked) => applyFilter(filter.id, checked)}
                          />
                          <Label htmlFor={filter.id} className="text-sm">
                            Sí
                          </Label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex gap-2">
                  <Button onClick={handleSearch} className="flex-1">
                    Aplicar Filtros
                  </Button>
                  <Button variant="outline" onClick={handleClear}>
                    Limpiar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {(searchQuery || activeFilterCount > 0) && (
            <Button variant="ghost" size="icon" onClick={handleClear} className="h-12 w-12">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Filtros activos */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(activeFilters).map(([key, value]) => {
              const filter = advancedFilters.find(f => f.id === key || key.startsWith(f.id));
              if (!filter || !value) return null;
              
              return (
                <Badge key={key} variant="secondary" className="flex items-center gap-1">
                  {filter.label}: {String(value)}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => removeFilter(key)}
                  />
                </Badge>
              );
            })}
          </div>
        )}
      </div>
      
  {/* Quick search buttons removed — rely on suggestions and advanced filters for better UX */}
      
  {/* Operadores de búsqueda ocultos para mejorar la experiencia; se usan internamente ("^" "$(fin)" "-" '"' ) */}
    </Card>
  );
}
