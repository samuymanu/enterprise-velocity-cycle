import { useState, useEffect } from "react";
import { Search, Package, AlertTriangle, Grid, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiService } from "@/lib/api";

interface EnterpriseSearchProps {
  onResults: (products: any[]) => void;
  onLoading: (loading: boolean) => void;
  className?: string;
}

type FilterType = 'ALL' | 'NO_STOCK' | 'LOW_STOCK' | 'SEARCH';

export function EnterpriseSearch({ 
  onResults, 
  onLoading,
  className = "" 
}: EnterpriseSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [hasLoaded, setHasLoaded] = useState(false);

  // Función de búsqueda simple y directa
  const doSearch = async (params: any, filterType: FilterType) => {
    if (isSearching) return; // Evitar múltiples llamadas
    
    setIsSearching(true);
    onLoading(true);
    setActiveFilter(filterType);

    try {
      const response = await apiService.products.getAll({ ...params, status: 'ACTIVE' });
      if (response?.products) {
        onResults(response.products);
      } else {
        onResults([]);
      }
    } catch (error) {
      onResults([]);
    } finally {
      setIsSearching(false);
      onLoading(false);
    }
  };

  // Carga inicial - SOLO UNA VEZ
  useEffect(() => {
    if (!hasLoaded) {
      setHasLoaded(true);
      doSearch({}, 'ALL');
    }
  }, [hasLoaded]);

  // Handlers simples - SIN dependencias complejas
  const handleSinStock = () => {
    if (!isSearching) {
      doSearch({ stockRange_min: 0, stockRange_max: 0 }, 'NO_STOCK');
    }
  };

  const handleStockBajo = () => {
    if (!isSearching) {
      doSearch({ stockRange_min: 1, stockRange_max: 3 }, 'LOW_STOCK');
    }
  };

  const handleShowAll = () => {
    if (!isSearching) {
      doSearch({}, 'ALL');
      setSearchQuery("");
    }
  };

  const handleTextSearch = () => {
    if (!isSearching) {
      const query = searchQuery.trim();
      if (query) {
        doSearch({ search: query }, 'SEARCH');
      } else {
        handleShowAll();
      }
    }
  };

  const handleClear = () => {
    if (!isSearching) {
      setSearchQuery("");
      handleShowAll();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSearch();
    }
  };

  const getButtonVariant = (filter: FilterType) => {
    if (filter === 'NO_STOCK') return activeFilter === filter ? 'destructive' : 'outline';
    return activeFilter === filter ? 'secondary' : 'outline';
  };

  return (
    <div className={cn("w-full space-y-4 p-4 bg-white rounded-lg shadow-sm border", className)}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre, SKU, marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10"
            disabled={isSearching}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleTextSearch} disabled={isSearching || !searchQuery}>
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Buscando...' : 'Buscar'}
          </Button>
          <Button onClick={handleClear} variant="ghost" disabled={isSearching}>
            Limpiar
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleSinStock}
          variant={getButtonVariant('NO_STOCK')}
          size="sm"
          disabled={isSearching}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Sin Stock
        </Button>
        
        <Button
          onClick={handleStockBajo}
          variant={getButtonVariant('LOW_STOCK')}
          size="sm"
          disabled={isSearching}
        >
          <Package className="h-4 w-4 mr-2" />
          Stock Bajo (1-3)
        </Button>
        
        <Button
          onClick={handleShowAll}
          variant={getButtonVariant('ALL')}
          size="sm"
          disabled={isSearching}
        >
          <Grid className="h-4 w-4 mr-2" />
          Todos
        </Button>
      </div>
    </div>
  );
}
