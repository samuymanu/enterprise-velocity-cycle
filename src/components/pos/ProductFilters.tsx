import React, { useEffect, useState } from 'react';
import { apiService } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Filter, X } from 'lucide-react';

export function ProductFilters({ onCollapse, onExpand, collapsed }: { onCollapse?: () => void; onExpand?: () => void; collapsed?: boolean }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onCategory = (e: any) => {
      const id = e?.detail || null;
      setSelectedCategory(id);
    };

    window.addEventListener('pos:categoryChanged', onCategory as EventListener);
    return () => window.removeEventListener('pos:categoryChanged', onCategory as EventListener);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!selectedCategory) {
        setAttributes([]);
        setAttributeFilters({});
        return;
      }
      try {
        setLoading(true);
        const res: any = await apiService.categoryAttributes.getByCategory(selectedCategory);
        const attrs = res && res.attributes ? res.attributes : (res || []);
        setAttributes(attrs);
        setAttributeFilters({});
      } catch (err) {
        console.error('Error cargando atributos en ProductFilters', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCategory]);

  const fetchProductsWithFilters = async (categoryId?: string | null) => {
    try {
      setLoading(true);
      const filtersPayload: Record<string, string> = {};
      Object.entries(attributeFilters).forEach(([attrId, values]) => {
        if (values && values.length > 0) filtersPayload[`attribute_${attrId}`] = values.join(',');
      });

      const params: any = { limit: 20 };
      if (categoryId) params.categoryId = categoryId;
      if (Object.keys(filtersPayload).length > 0) params.filters = filtersPayload;

      const res: any = await apiService.products.getAll(params);
      const prods = res && res.products ? res.products : (res || []);
      const mapped = (prods || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, brand: p.brand || null }));

      window.dispatchEvent(new CustomEvent('pos:filteredProducts', { detail: mapped }));
    } catch (err) {
      console.error('Error fetching products from ProductFilters', err);
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    setAttributeFilters({});
    fetchProductsWithFilters(selectedCategory || null);
  };

  const hasActiveFilters = Object.values(attributeFilters).some(values => values.length > 0);

  // If the panel is collapsed, render a compact rail with an expand button so the user can open it again
  if (collapsed) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
          <div className="p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filtros</h3>
            </div>
            <div className="flex items-center gap-2">
              {onExpand ? (
                <button
                  onClick={onExpand}
                  className="px-2 py-1 text-xs border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title="Mostrar filtros"
                >
                  Mostrar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filtros</h3>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {Object.values(attributeFilters).flat().length}
                </span>
              )}
              {onCollapse ? (
                <button
                  onClick={onCollapse}
                  className="px-2 py-1 text-xs border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title="Colapsar panel de filtros"
                >
                  Ocultar
                </button>
              ) : null}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Limpiar todos los filtros"
                >
                  <X className="h-3 w-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {!selectedCategory && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selecciona una categoría en el buscador para ver filtros específicos
              </p>
            </div>
          )}

          {selectedCategory && attributes.length === 0 && !loading && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay filtros disponibles para esta categoría
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                Cargando filtros...
              </div>
            </div>
          )}

          {!loading && attributes.length > 0 && (
            <div className="space-y-4">
              {attributes.map((attr: any) => (
                <div key={attr.id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      {attr.name}
                    </label>
                  </div>

                  {Array.isArray(attr.options) && attr.options.length > 0 ? (
                    <div className="space-y-2">
                      {attr.options.map((opt: any) => {
                        const selected = attributeFilters[attr.id] && attributeFilters[attr.id].includes(String(opt));
                        return (
                          <label 
                            key={opt} 
                            className="flex items-center text-sm cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={() => {
                                const prev = attributeFilters[attr.id] || [];
                                let next = [...prev];
                                if (selected) {
                                  next = next.filter((v) => v !== String(opt));
                                } else {
                                  next.push(String(opt));
                                }
                                const newFilters = { ...attributeFilters, [attr.id]: next };
                                setAttributeFilters(newFilters);
                                fetchProductsWithFilters(selectedCategory || null);
                              }}
                              className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                            />
                            <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                              {opt}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <Input
                      value={attributeFilters[attr.id] ? attributeFilters[attr.id][0] || '' : ''}
                      onChange={(e) => {
                        const val = (e.target as HTMLInputElement).value;
                        const newFilters = { ...attributeFilters, [attr.id]: val ? [val] : [] };
                        setAttributeFilters(newFilters);
                        fetchProductsWithFilters(selectedCategory || null);
                      }}
                      className="w-full text-sm border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors bg-white dark:bg-gray-700"
                      placeholder={`Buscar por ${attr.name.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
