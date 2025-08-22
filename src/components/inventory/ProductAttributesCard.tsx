import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  CheckCircle, XCircle, Calendar, CircleDot, ListOrdered, 
  TextIcon, Hash, Globe, Star, Pencil, Search, Filter,
  Grid3X3, List, SortAsc, SortDesc, Eye, EyeOff, Info
} from 'lucide-react';

interface Attribute {
  attributeId: string;
  name: string;
  type: string;
  value: any;
  unit?: string;
  helpText?: string;
  isGlobal?: boolean;
  dependsOn?: string;
  minValue?: number | null;
  maxValue?: number | null;
  regex?: string;
  required?: boolean;
  category?: string;
}

interface ProductAttributesCardProps {
  attributes: Attribute[];
  isEditable?: boolean;
  onEditAttribute?: (attributeId: string) => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'type' | 'category';
type SortDirection = 'asc' | 'desc';

export const ProductAttributesCard: React.FC<ProductAttributesCardProps> = ({ 
  attributes, 
  isEditable = false, 
  onEditAttribute 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showEmptyValues, setShowEmptyValues] = useState(true);

  // Filter and sort attributes
  const filteredAndSortedAttributes = useMemo(() => {
    let filtered = attributes.filter(attr => {
      const matchesSearch = searchTerm === '' || 
        attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attr.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (attr.category && attr.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const hasValue = attr.value !== null && attr.value !== undefined && attr.value !== '';
      const showAttribute = showEmptyValues || hasValue;
      
      return matchesSearch && showAttribute;
    });

    // Sort attributes
    filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        case 'category':
          aValue = (a.category || 'sin categoría').toLowerCase();
          bValue = (b.category || 'sin categoría').toLowerCase();
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [attributes, searchTerm, sortBy, sortDirection, showEmptyValues]);

  // Group filtered attributes
  const groupedAttributes = {
    all: filteredAndSortedAttributes,
    technical: filteredAndSortedAttributes.filter(attr => !attr.isGlobal),
    global: filteredAndSortedAttributes.filter(attr => attr.isGlobal)
  };

  if (!attributes || attributes.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Atributos del producto</h3>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-md">
            <CircleDot className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-muted-foreground text-sm font-medium">No hay atributos configurados</span>
            <span className="text-muted-foreground text-xs mt-1">Este producto no tiene atributos personalizados</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get category color
  const getCategoryColor = (category?: string) => {
    if (!category) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    const colors = {
      'dimensiones': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'material': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'rendimiento': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'seguridad': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      'conectividad': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
    };
    return colors[category.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  // Get icon for attribute type with better styling
  const getAttributeIcon = (type: string) => {
    const iconClass = "h-3.5 w-3.5";
    switch (type) {
      case 'STRING': return <TextIcon className={iconClass} />;
      case 'NUMBER': return <Hash className={iconClass} />;
      case 'BOOLEAN': return <CheckCircle className={iconClass} />;
      case 'LIST': return <ListOrdered className={iconClass} />;
      case 'DATE': return <Calendar className={iconClass} />;
      default: return <CircleDot className={iconClass} />;
    }
  };

  // Format attribute value for display
  const formatAttributeValue = (attr: Attribute) => {
    if (attr.value === null || attr.value === undefined || attr.value === '') {
      return 'No especificado';
    }

    switch (attr.type) {
      case 'BOOLEAN':
        return attr.value === true || attr.value === 'true' ? 'Sí' : 'No';
      case 'DATE':
        try {
          return new Date(attr.value).toLocaleDateString('es-ES');
        } catch {
          return attr.value;
        }
      case 'NUMBER':
        const numValue = parseFloat(attr.value);
        return isNaN(numValue) ? attr.value : numValue.toLocaleString('es-ES');
      default:
        return attr.value;
    }
  };

  // Render attribute in grid mode
  const renderAttributeGrid = (attr: Attribute) => (
    <TooltipProvider key={attr.attributeId}>
      <div 
        className={`
          relative group flex flex-col p-3 rounded-lg border transition-all duration-200
          ${attr.isGlobal ? 'bg-primary/5 border-primary/20 hover:border-primary/40' : 'bg-background/50 hover:border-border'}
          ${isEditable ? 'hover:shadow-md cursor-pointer' : ''}
        `}
        onClick={() => isEditable && onEditAttribute?.(attr.attributeId)}
      >
        {/* Header with icon and actions */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${attr.isGlobal ? 'bg-primary/10' : 'bg-muted'}`}>
              {attr.isGlobal ? (
                <Globe className="h-4 w-4 text-primary" />
              ) : (
                getAttributeIcon(attr.type)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h4 className="font-medium text-sm truncate">{attr.name}</h4>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{attr.name}</p>
                  {attr.helpText && <p className="text-xs text-muted-foreground mt-1">{attr.helpText}</p>}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {isEditable && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEditAttribute?.(attr.attributeId);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Value display */}
        <div className="mb-2">
          {attr.type === 'BOOLEAN' ? (
            <Badge 
              variant={attr.value === true || attr.value === 'true' ? 'default' : 'destructive'} 
              className="text-xs font-normal"
            >
              {attr.value === true || attr.value === 'true' ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Sí
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  No
                </span>
              )}
            </Badge>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{formatAttributeValue(attr)}</span>
              {attr.unit && (
                <Badge variant="outline" className="text-xs font-normal">
                  {attr.unit}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Metadata badges */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {attr.category && (
            <Badge variant="outline" className={`text-xs font-normal ${getCategoryColor(attr.category)}`}>
              {attr.category}
            </Badge>
          )}
          
          {attr.required && (
            <Badge variant="destructive" className="text-xs font-normal">
              Requerido
            </Badge>
          )}
          
          {attr.dependsOn && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs font-normal border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  Dependiente
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Depende de: {attr.dependsOn}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {attr.type === 'NUMBER' && (attr.minValue !== null || attr.maxValue !== null) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs font-normal">
                  <Hash className="h-3 w-3 mr-1" />
                  Rango
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Rango: {attr.minValue ?? '-'} a {attr.maxValue ?? '-'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );

  // Render attribute in list mode
  const renderAttributeList = (attr: Attribute) => (
    <TooltipProvider key={attr.attributeId}>
      <div 
        className={`
          relative group flex items-center p-3 rounded-lg border transition-all duration-200
          ${attr.isGlobal ? 'bg-primary/5 border-primary/20 hover:border-primary/40' : 'bg-background/50 hover:border-border'}
          ${isEditable ? 'hover:shadow-md cursor-pointer' : ''}
        `}
        onClick={() => isEditable && onEditAttribute?.(attr.attributeId)}
      >
        {/* Icon */}
        <div className={`mr-3 p-1.5 rounded-md flex-shrink-0 ${attr.isGlobal ? 'bg-primary/10' : 'bg-muted'}`}>
          {attr.isGlobal ? (
            <Globe className="h-4 w-4 text-primary" />
          ) : (
            getAttributeIcon(attr.type)
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="font-medium text-sm truncate">{attr.name}</h4>
              {attr.category && (
                <Badge variant="outline" className={`text-xs font-normal ${getCategoryColor(attr.category)}`}>
                  {attr.category}
                </Badge>
              )}
            </div>
            
            {/* Value */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              {attr.type === 'BOOLEAN' ? (
                <Badge 
                  variant={attr.value === true || attr.value === 'true' ? 'default' : 'destructive'} 
                  className="text-xs font-normal"
                >
                  {attr.value === true || attr.value === 'true' ? 'Sí' : 'No'}
                </Badge>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-mono">{formatAttributeValue(attr)}</span>
                  {attr.unit && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {attr.unit}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Help text */}
          {attr.helpText && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{attr.helpText}</p>
          )}
        </div>

        {/* Edit button */}
        {isEditable && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onEditAttribute?.(attr.attributeId);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
    </TooltipProvider>
  );

  return (
    <Card className="mb-4">
      {/* Header with search and controls */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CircleDot className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">Atributos del producto</h3>
            <Badge variant="outline" className="text-xs font-normal">
              {filteredAndSortedAttributes.length} de {attributes.length}
            </Badge>
          </div>
          
          {/* View controls */}
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Filters dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  Filtros
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setShowEmptyValues(!showEmptyValues)}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    {showEmptyValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Valores vacíos
                  </span>
                  {showEmptyValues && <CheckCircle className="h-3 w-3" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2">
                  {sortDirection === 'asc' ? <SortAsc className="h-3.5 w-3.5 mr-1" /> : <SortDesc className="h-3.5 w-3.5 mr-1" />}
                  Ordenar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onClick={() => {
                    if (sortBy === 'name') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('name');
                      setSortDirection('asc');
                    }
                  }}
                >
                  Nombre {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (sortBy === 'type') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('type');
                      setSortDirection('asc');
                    }
                  }}
                >
                  Tipo {sortBy === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (sortBy === 'category') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('category');
                      setSortDirection('asc');
                    }
                  }}
                >
                  Categoría {sortBy === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar atributos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-8"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="all" className="text-xs">
              Todos ({groupedAttributes.all.length})
            </TabsTrigger>
            <TabsTrigger value="technical" className="text-xs">
              Técnicos ({groupedAttributes.technical.length})
            </TabsTrigger>
            <TabsTrigger value="global" className="text-xs">
              Globales ({groupedAttributes.global.length})
            </TabsTrigger>
          </TabsList>
          
          {Object.entries(groupedAttributes).map(([tab, attrs]) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              {attrs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-md">
                  <Info className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-muted-foreground text-sm font-medium">
                    {searchTerm ? 'No se encontraron atributos' : `No hay atributos ${tab === 'global' ? 'globales' : tab === 'technical' ? 'técnicos' : ''}`}
                  </span>
                  {searchTerm && (
                    <span className="text-muted-foreground text-xs mt-1">
                      Intenta con otros términos de búsqueda
                    </span>
                  )}
                </div>
              ) : (
                <div className={
                  viewMode === 'grid' 
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" 
                    : "space-y-3"
                }>
                  {attrs.map(attr => 
                    viewMode === 'grid' 
                      ? renderAttributeGrid(attr)
                      : renderAttributeList(attr)
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
