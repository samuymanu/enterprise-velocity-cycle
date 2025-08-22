import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, AlertTriangle, Grid } from 'lucide-react';
import { apiService } from '@/lib/api';

interface SimpleSearchProps {
  onResults: (products: any[]) => void;
  onLoading: (loading: boolean) => void;
}

export const SimpleSearch: React.FC<SimpleSearchProps> = ({ onResults, onLoading }) => {
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Función para hacer búsqueda directa al backend
  const searchProducts = async (filters: any) => {
    console.log('🔍 Searching with filters:', filters);
    setIsSearching(true);
    onLoading(true);

    try {
      const response = await apiService.products.getAll(filters);
      console.log('✅ Search results:', response);
      onResults(response.products || []);
    } catch (error) {
      console.error('❌ Search error:', error);
      onResults([]);
    } finally {
      setIsSearching(false);
      onLoading(false);
    }
  };

  // Búsqueda por texto
  const handleTextSearch = () => {
    if (searchText.trim()) {
      searchProducts({ 
        search: searchText.trim(),
        status: 'ACTIVE'
      });
    } else {
      searchProducts({ status: 'ACTIVE' });
    }
  };

  // Filtros rápidos
  const handleSinStock = () => {
    console.log('🔍 Sin Stock clicked');
    searchProducts({
      stockRange_min: 0,
      stockRange_max: 0,
      status: 'ACTIVE'
    });
  };

  const handleStockBajo = () => {
    console.log('🔍 Stock Bajo clicked');
    searchProducts({
      stockRange_min: 1,
      stockRange_max: 3,
      status: 'ACTIVE'
    });
  };

  const handleTodos = () => {
    console.log('🔍 Todos clicked');
    searchProducts({
      status: 'ACTIVE'
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSearch();
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow-sm border">
      {/* Búsqueda por texto */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Buscar productos por nombre, SKU, marca..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
          disabled={isSearching}
        />
        <Button 
          onClick={handleTextSearch} 
          variant="outline"
          disabled={isSearching}
        >
          <Search className="h-4 w-4 mr-2" />
          {isSearching ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleSinStock}
          variant="destructive"
          size="sm"
          disabled={isSearching}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Sin Stock (0)
        </Button>
        
        <Button
          onClick={handleStockBajo}
          variant="secondary"
          size="sm"
          disabled={isSearching}
        >
          <Package className="h-4 w-4 mr-2" />
          Stock Bajo (1-3)
        </Button>
        
        <Button
          onClick={handleTodos}
          variant="outline"
          size="sm"
          disabled={isSearching}
        >
          <Grid className="h-4 w-4 mr-2" />
          Todos los Productos
        </Button>
      </div>
    </div>
  );
};
