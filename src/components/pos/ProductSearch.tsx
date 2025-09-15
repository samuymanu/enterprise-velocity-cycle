import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiService } from "@/lib/api";

type ProductSuggestion = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  brand?: { name?: string } | null;
  price?: number;
  // Marcadores opcionales para sugerencias especiales
  isBrand?: boolean;          // Sugerencia representa una marca (no un producto directo)
  brandName?: string;         // Nombre de la marca (redundante para claridad)
  productCount?: number;      // Cantidad de productos agrupados por esa marca
  isCategory?: boolean;       // Sugerencia representa una categoría
  categoryName?: string;      // Nombre legible de la categoría
  categoryId?: string;        // ID de la categoría (si se identifica)
};

export function ProductSearch({ onProductSelect }: { onProductSelect?: (product: ProductSuggestion) => void }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [parentCategories, setParentCategories] = useState<{ id: string; name: string; children?: any[] }[]>([]);
  const [subCategories, setSubCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string[]>>({});
  const [showAllCats, setShowAllCats] = useState(false);
  const [catQuery, setCatQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const typingStartRef = useRef<number | null>(null);
  const lastCharRef = useRef<number | null>(null);
  const scanDebounceRef = useRef<number | null>(null);
  const globalBufferRef = useRef<string>('');
  const globalLastTimeRef = useRef<number | null>(null);
  const globalClearTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await apiService.categories.getAll();
  const cats = res && Array.isArray(res) ? res : (res.categories || []);
  if (!mounted) return;
  setAllCategories(cats);
  // Categorías de primer nivel (sin parent)
  const parents = (cats || []).filter((c: any) => !c.parent).map((c: any) => ({ id: c.id, name: c.name, children: c.children || [] }));
  setParentCategories(parents);
      } catch (err) {
        console.error('Error loading categories', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Autofocus al montar para facilitar el escaneo con lectores físicos
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Listener global para detectar scanners que no enfocan el input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Si hay un Dialog (modal) abierto, no interferir (evita bloquear inputs del modal de pago)
      try {
        const anyOpenDialog = document.querySelector('[role="dialog"]');
        if (anyOpenDialog) return; // dejar que el modal maneje las teclas
      } catch {}
      // Si el foco está en otro input (por ejemplo el buscador de cliente), ignorar
      try {
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as any).isContentEditable)) {
          const id = (active as HTMLInputElement).id || '';
          if (id !== 'pos-product-search') return;
        }
      } catch (err) {
        // en entornos no DOM, seguir normalmente
      }

      // Ignorar si se usa con modificadores
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Si es Enter y tenemos buffer, procesar inmediatamente
      if (e.key === 'Enter') {
        const buf = globalBufferRef.current;
        console.log('🔍 Scanner Enter detectado, buffer:', JSON.stringify(buf));
        if (buf && buf.length > 0) {
          // evitar que otras acciones capturen este Enter
          e.preventDefault();
          lookupAndSelect(buf.trim());
          globalBufferRef.current = '';
        }
        return;
      }

      // Solo caracteres imprimibles
      if (e.key.length === 1) {
        const now = Date.now();
        const last = globalLastTimeRef.current || now;
        const delta = now - last;

        // Si mucho tiempo desde la última tecla, reiniciar buffer
        if (delta > 800) {
          globalBufferRef.current = e.key;
        } else {
          globalBufferRef.current += e.key;
        }

        globalLastTimeRef.current = now;

        // resetear timeout para procesar buffer después de inactivity
        if (globalClearTimeoutRef.current) window.clearTimeout(globalClearTimeoutRef.current);
        globalClearTimeoutRef.current = window.setTimeout(() => {
          const buf = globalBufferRef.current;
          console.log('🔍 Scanner timeout detectado, buffer:', JSON.stringify(buf));
          if (buf && buf.length >= 3) {
            // si la secuencia fue rápida (delta promedio pequeño), asumir scanner
            lookupAndSelect(buf.trim());
          }
          globalBufferRef.current = '';
          globalLastTimeRef.current = null;
        }, 400);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (globalClearTimeoutRef.current) window.clearTimeout(globalClearTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res: any = await apiService.products.getSuggestions(query);
        const raw = res && res.suggestions ? res.suggestions : (res || []);

        // Normalizar diferentes shapes que puede devolver el backend
  const normalized: ProductSuggestion[] = (raw || []).map((r: any) => {
          // Caso ideal: objeto de producto con id y name
          if (r && (r.id || r.productId) && (r.name || r.label)) {
            return {
              id: String(r.id || r.productId),
              name: String((r.name || r.label || '')).replace(/\n/g, ' ').trim(),
              sku: r.sku || undefined,
              barcode: r.barcode || undefined,
              brand: r.brand || null,
              price: (r.salePrice ?? r.price ?? r.sale_price) as number | undefined
            };
          }

          // Caso: sugerencia compacta { label, value }
          if (r && (r.label || r.value)) {
            const label = String(r.label || r.value).replace(/\n/g, ' ').trim();
            const brandMatch = label.match(/^Marca:\s*(.+)$/i);
            const categoryMatch = label.match(/^Categor[ií]a:\s*(.+)$/i);
            // extraer SKU si viene entre paréntesis al final del label: "Nombre (SKU)"
            let sku: string | undefined = undefined;
            const m = label.match(/\(([^)]+)\)\s*$/);
            if (m) sku = m[1];

            if (brandMatch) {
              const bName = brandMatch[1].trim();
              return {
                id: `brand:${bName.toLowerCase()}`,
                name: bName,
                isBrand: true,
                brandName: bName
              } as ProductSuggestion;
            }

            if (categoryMatch) {
              const cName = categoryMatch[1].trim();
              // Intentar resolver ID desde allCategories ya cargadas
              let catId: string | undefined = undefined;
              try {
                const found = (allCategories || []).find((c: any) => String(c.name).toLowerCase() === cName.toLowerCase());
                if (found) catId = found.id;
              } catch {}
              return {
                id: `category:${(catId || cName).toLowerCase()}`,
                name: cName,
                isCategory: true,
                categoryName: cName,
                categoryId: catId
              } as ProductSuggestion;
            }

            return {
              id: String(r.value || label),
              name: label,
              sku,
              barcode: String(r.value || '') || undefined,
              brand: null,
              price: (r.salePrice ?? r.price ?? r.sale_price) as number | undefined
            };
          }

          // Fallback genérico
          return {
            id: String(r.id || r.value || JSON.stringify(r)),
            name: String(r.name || r.label || r.value || 'Producto').replace(/\n/g, ' ').trim(),
            sku: r.sku || undefined,
            barcode: r.barcode || undefined,
            brand: null,
            price: (r.salePrice ?? r.price ?? r.sale_price) as number | undefined
          };
        });

        // Agrupar por marca si aún no se agregó sugerencia explícita
        const brandGroups: Record<string, number> = {};
        normalized.forEach(p => {
          if (p.isBrand) return; // ya es una sugerencia de marca
          const b = p.brand?.name?.trim();
          if (b) brandGroups[b] = (brandGroups[b] || 0) + 1;
        });

        const existingBrandIds = new Set(normalized.filter(p => p.isBrand).map(p => p.id));
        const extraBrandSuggestions: ProductSuggestion[] = Object.entries(brandGroups)
          .filter(([, count]) => count > 1)
          .filter(([bName]) => {
            const q = query.trim().toLowerCase();
            const bn = bName.toLowerCase();
            return q && (bn.startsWith(q) || bn === q);
          })
          .map(([bName, count]) => ({
            id: `brand:${bName.toLowerCase()}`,
            name: bName,
            isBrand: true,
            brandName: bName,
            productCount: count
          }))
          .filter(b => !existingBrandIds.has(b.id));

        const finalSuggestions = [...extraBrandSuggestions, ...normalized];
        setSuggestions(finalSuggestions);
        setOpen(finalSuggestions.length > 0);
      } catch (err) {
        console.error('Error fetching suggestions', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Cuando cambia la categoría seleccionada, cargar atributos dinámicos
  useEffect(() => {
    // Comunicar al panel de filtros que la categoría cambió (el panel cargará atributos)
    window.dispatchEvent(new CustomEvent('pos:categoryChanged', { detail: selectedCategory }));

    // Cuando el panel de filtros emite productos filtrados, actualizamos sugerencias
    const onFiltered = (e: any) => {
      const mapped = e?.detail || [];
      setSuggestions(mapped);
      setOpen(mapped.length > 0);
    };
    window.addEventListener('pos:filteredProducts', onFiltered as EventListener);

    return () => {
      window.removeEventListener('pos:filteredProducts', onFiltered as EventListener);
    };
  }, [selectedCategory]);

  // Helper para cargar productos con filtros de atributos
  const fetchProductsWithFilters = async (categoryId?: string) => {
    try {
      setLoading(true);
      const filtersPayload: Record<string, string> = {};
      // El backend espera keys con prefijo `attribute_<id>`
      Object.entries(attributeFilters).forEach(([attrId, values]) => {
        if (values && values.length > 0) filtersPayload[`attribute_${attrId}`] = values.join(',');
      });

      const params: any = { limit: 20 };
      if (categoryId) params.categoryId = categoryId;
      if (Object.keys(filtersPayload).length > 0) params.filters = filtersPayload;

      const res: any = await apiService.products.getAll(params);
      const prods = res && res.products ? res.products : (res || []);
      const mapped = (prods || []).map((p: any) => ({ 
        id: p.id, 
        name: p.name, 
        sku: p.sku, 
        barcode: p.barcode, 
        brand: p.brand || null,
        price: (p.salePrice ?? p.price ?? p.sale_price) as number | undefined
      }));
      setSuggestions(mapped);
      setOpen(mapped.length > 0);
    } catch (err) {
      console.error('Error cargando productos con filtros', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandSelect = async (brandName: string) => {
    try {
      setLoading(true);
      // Intentar cargar productos usando búsqueda por marca
      const res: any = await apiService.products.getAll({ search: brandName, limit: 50 });
      const prods = res && res.products ? res.products : (res || []);
      // Filtrar a solo los que coinciden exactamente con la marca para reducir ruido
      const filtered = (prods || []).filter((p: any) => {
        const bn = p?.brand?.name || p?.brandName || p?.brand_name;
        return bn && String(bn).toLowerCase() === brandName.toLowerCase();
      }).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        brand: p.brand || null,
        price: (p.salePrice ?? p.price ?? p.sale_price) as number | undefined
      }));
      setSuggestions(filtered);
      setOpen(true);
    } catch (err) {
      console.error('Error filtrando por marca', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (categoryName: string, categoryId?: string) => {
    try {
      setLoading(true);
      let catId = categoryId;
      if (!catId) {
        const found = (allCategories || []).find((c: any) => String(c.name).toLowerCase() === categoryName.toLowerCase());
        if (found) catId = found.id;
      }
      const params: any = { limit: 50 };
      if (catId) params.categoryId = catId;
      else params.search = categoryName; // fallback
      const res: any = await apiService.products.getAll(params);
      const prods = res && res.products ? res.products : (res || []);
      const filtered = (prods || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        brand: p.brand || null,
        price: (p.salePrice ?? p.price ?? p.sale_price) as number | undefined
      }));
      setSuggestions(filtered);
      setOpen(true);
      // Disparar evento global para sincronizar panel de filtros (categoría seleccionada)
      if (catId) window.dispatchEvent(new CustomEvent('pos:categoryChanged', { detail: catId }));
    } catch (err) {
      console.error('Error filtrando por categoría', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (p: ProductSuggestion) => {
    if (p.isBrand && p.brandName) {
      // No agregar al carrito; mostrar productos de esa marca
      handleBrandSelect(p.brandName);
      return;
    }
    if (p.isCategory && p.categoryName) {
      handleCategorySelect(p.categoryName, p.categoryId);
      return;
    }
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    if (onProductSelect) onProductSelect(p);
  };

  // Normaliza texto para comparar sku/barcode sin puntos/espacios/caracteres raros
  const normalize = (s: string | undefined) => String(s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  const lookupAndSelect = async (code: string) => {
    if (!code || code.trim().length === 0) {
      console.log('🔍 lookupAndSelect: código vacío');
      return false;
    }
    
    console.log('🔍 lookupAndSelect: buscando código:', JSON.stringify(code));
    console.log('🔍 lookupAndSelect: código normalizado:', JSON.stringify(normalize(code)));
    
    try {
      setLoading(true);
      
      // Estrategia 1: Búsqueda por search con el código original
      console.log('🔍 Estrategia 1: búsqueda con search =', code);
      let res: any = await apiService.products.getAll({ search: code, limit: 20 });
      console.log('🔍 Estrategia 1: respuesta del backend:', res);
      
      let prods = res && res.products ? res.products : (res || []);
      console.log('🔍 Estrategia 1: productos encontrados:', prods?.length || 0);
      
      // Estrategia 2: Si no encuentra nada, buscar sin filtros y revisar todos
      if (!prods || prods.length === 0) {
        console.log('🔍 Estrategia 2: búsqueda general sin filtros');
        res = await apiService.products.getAll({ limit: 50 });
        console.log('🔍 Estrategia 2: respuesta del backend:', res);
        prods = res && res.products ? res.products : (res || []);
        console.log('🔍 Estrategia 2: productos encontrados:', prods?.length || 0);
      }

      // Estrategia 3: Usar endpoint de sugerencias
      if (!prods || prods.length === 0) {
        console.log('🔍 Estrategia 3: usando endpoint de sugerencias');
        const sugRes: any = await apiService.products.getSuggestions(code);
        console.log('🔍 Estrategia 3: respuesta sugerencias:', sugRes);
        
        if (sugRes && sugRes.suggestions && sugRes.suggestions.length > 0) {
          // Convertir sugerencias a formato de productos
          prods = sugRes.suggestions.map((s: any) => ({
            id: s.id || s.value,
            name: s.label || s.value || s.name,
            sku: s.sku,
            barcode: s.barcode || s.value,
            brand: s.brand,
            price: (s.salePrice ?? s.price ?? s.sale_price) as number | undefined
          }));
          console.log('🔍 Estrategia 3: productos convertidos:', prods);
        }
      }
      
      if (!prods || prods.length === 0) {
        console.log('🔍 lookupAndSelect: no se encontraron productos en ninguna estrategia');
        return false;
      }

      const targetNorm = normalize(code);
      console.log('🔍 lookupAndSelect: comparando con target normalizado:', targetNorm);
      
      // buscar coincidencia exacta por sku o barcode (normalizada)
      const exact = prods.find((p: any) => {
        const sku = normalize(p.sku);
        const barcode = normalize(p.barcode);
        const name = normalize(p.name);
        
        console.log(`🔍 lookupAndSelect: producto ${p.id} (${p.name}):`, {
          sku: p.sku + ' → ' + sku,
          barcode: p.barcode + ' → ' + barcode,
          name: p.name + ' → ' + name,
          matches: {
            sku: sku === targetNorm,
            barcode: barcode === targetNorm,
            name: name === targetNorm
          }
        });
        
        return sku === targetNorm || barcode === targetNorm || name === targetNorm;
      });

      if (exact) {
        console.log('🔍 lookupAndSelect: ¡ENCONTRADO! producto exacto:', exact);
        const mapped = {
          id: exact.id,
          name: exact.name,
          sku: exact.sku,
          barcode: exact.barcode,
          brand: exact.brand || null,
          price: (exact.salePrice ?? exact.price ?? exact.sale_price) as number | undefined
        } as ProductSuggestion;
        handleSelect(mapped);
        return true;
      }

      console.log('🔍 lookupAndSelect: no se encontró coincidencia exacta, mostrando sugerencias');
      // Si no hay exact match, poblar sugerencias con los resultados para que el usuario elija
      const mappedList = (prods || []).map((p: any) => ({ 
        id: p.id, 
        name: p.name, 
        sku: p.sku, 
        barcode: p.barcode, 
        brand: p.brand || null,
        price: (p.salePrice ?? p.price ?? p.sale_price) as number | undefined
      }));
      setSuggestions(mappedList);
      setOpen(mappedList.length > 0);
      return false;
    } catch (err) {
      console.error('🔍 lookupAndSelect: Error buscando producto por código', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Búsqueda de Productos</h3>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          {/* Limpiar arriba del cuadro de búsqueda */}
          <div className="flex items-center justify-end mb-2">
            {selectedCategory && (
              <button
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                onClick={() => {
                  setSelectedCategory(null);
                  setSuggestions([]);
                  setOpen(false);
                }}
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  id="pos-product-search"
                  value={query}
                  onChange={(e) => {
                    const val = e.target.value;
                    const prev = query;
                    setQuery(val);

                    const now = Date.now();
                    if (!prev || prev.length === 0) {
                      typingStartRef.current = now;
                    }
                    lastCharRef.current = now;

                    if (scanDebounceRef.current) window.clearTimeout(scanDebounceRef.current);
                    scanDebounceRef.current = window.setTimeout(() => {
                      try {
                        if (val && val.length >= 3) {
                          const start = typingStartRef.current || now;
                          const end = lastCharRef.current || now;
                          const duration = end - start;
                          if (duration < 700) {
                            lookupAndSelect(val.trim());
                          }
                        }
                      } catch (err) {
                        // ignore
                      }
                    }, 250);
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (suggestions.length === 1) {
                        handleSelect(suggestions[0]);
                        return;
                      }

                      const found = await lookupAndSelect(query.trim());
                      if (found) return;

                      if (query && query.length >= 2) {
                        try {
                          setLoading(true);
                          const res: any = await apiService.products.getSuggestions(query);
                          const raw = res && res.suggestions ? res.suggestions : (res || []);
                          const normalized: ProductSuggestion[] = (raw || []).map((r: any) => {
                            if (r && (r.id || r.productId) && (r.name || r.label)) {
                              return {
                                id: String(r.id || r.productId),
                                name: String((r.name || r.label || '')).replace(/\n/g, ' ').trim(),
                                sku: r.sku || undefined,
                                barcode: r.barcode || undefined,
                                brand: r.brand || null
                              };
                            }

                            if (r && (r.label || r.value)) {
                              const label = String(r.label || r.value).replace(/\n/g, ' ').trim();
                              let sku: string | undefined = undefined;
                              const m = label.match(/\(([^)]+)\)\s*$/);
                              if (m) sku = m[1];

                              return {
                                id: String(r.value || label),
                                name: label,
                                sku,
                                barcode: String(r.value || '') || undefined,
                                brand: null
                              };
                            }

                            return {
                              id: String(r.id || r.value || JSON.stringify(r)),
                              name: String(r.name || r.label || r.value || 'Producto').replace(/\n/g, ' ').trim(),
                              sku: r.sku || undefined,
                              barcode: r.barcode || undefined,
                              brand: null
                            };
                          });
                          setSuggestions(normalized);
                          setOpen(normalized.length > 0);
                        } catch (err) {
                          console.error('Error fetching suggestions on enter', err);
                        } finally {
                          setLoading(false);
                        }
                      }
                    }
                  }}
                  placeholder="Buscar por código, nombre o escanear..."
                  onPaste={(e: any) => {
                    const pasted = e?.clipboardData?.getData('text') || '';
                    if (pasted) {
                      setQuery(pasted);
                      lookupAndSelect(pasted.trim());
                    }
                  }}
                  className="pr-10 border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                {loading && (
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                  </div>
                )}
              </div>
              <Button 
                className="px-4 bg-blue-600 hover:bg-blue-700 text-white transition-colors" 
                onClick={() => { if (query.length >= 2) setQuery(query); }}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggestions Dropdown */}
            {open && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mx-auto mb-2"></div>
                    Cargando productos...
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((s) => {
                    const isBrand = !!s.isBrand;
                    const isCategory = !!s.isCategory;
                    return (
                      <div
                        key={s.id}
                        className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors group ${isBrand ? 'bg-yellow-50/40 dark:bg-yellow-900/10' : ''} ${isCategory ? 'bg-violet-50/40 dark:bg-violet-900/10' : ''}`}
                        onClick={() => handleSelect(s)}
                        title={isBrand ? 'Ver productos de esta marca' : isCategory ? 'Ver productos de esta categoría' : 'Agregar al carrito'}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {isBrand ? `Marca: ${s.name}` : isCategory ? `Categoría: ${s.name}` : s.name}
                            </div>
                            {isBrand ? (
                              <div className="text-xs text-amber-700 dark:text-amber-300 mt-1 flex items-center gap-2">
                                <span>{s.productCount} productos</span>
                                <span className="inline-block bg-amber-100 dark:bg-amber-800 px-2 py-0.5 rounded text-[10px] tracking-wide">FILTRAR</span>
                              </div>
                            ) : isCategory ? (
                              <div className="text-xs text-violet-700 dark:text-violet-300 mt-1 flex items-center gap-2">
                                <span>Clic para filtrar</span>
                                <span className="inline-block bg-violet-100 dark:bg-violet-800 px-2 py-0.5 rounded text-[10px] tracking-wide">CATEGORÍA</span>
                              </div>
                            ) : (
                              (s.sku || s.barcode || s.brand?.name) && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {s.sku && <span className="inline-block bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs mr-2">SKU: {s.sku}</span>}
                                  {s.barcode && <span className="inline-block bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs mr-2">Código: {s.barcode}</span>}
                                  {s.brand?.name && <span className="text-blue-600 dark:text-blue-400">• {s.brand.name}</span>}
                                </div>
                              )
                            )}
                          </div>
                          <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className={`rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium ${isBrand ? 'bg-amber-200 dark:bg-amber-700 text-amber-900 dark:text-amber-100' : isCategory ? 'bg-violet-200 dark:bg-violet-700 text-violet-900 dark:text-violet-100' : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'}`}>
                              {isBrand || isCategory ? '→' : '+'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No se encontraron productos
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
          <div className="p-4">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Categorías</h4>
          </div>
          
          {parentCategories.length === 0 ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mx-auto mb-2"></div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Cargando categorías...</div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-2 text-sm font-medium rounded-md border transition-all duration-200 ${
                    selectedCategory === null
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  onClick={() => {
                    setSelectedCategory(null);
                    setSuggestions([]);
                    setOpen(false);
                  }}
                >
                  Todas
                </button>

                {parentCategories.slice(0, 5).map(cat => (
                  <button
                    key={cat.id}
                    className={`px-3 py-2 text-sm font-medium rounded-md border transition-all duration-200 truncate max-w-xs ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    title={cat.name}
                    onClick={async () => {
                      setSelectedCategory(cat.id);
                      const parent = parentCategories.find((a: any) => a.id === cat.id);
                      const children = parent && Array.isArray(parent.children) ? parent.children : [];
                      setSubCategories((children || []).map((c: any) => ({ id: c.id, name: c.name })));

                      try {
                        setLoading(true);
                        const res: any = await apiService.products.getAll({ categoryId: cat.id, limit: 20 });
                        const prods = res && res.products ? res.products : (res || []);
                        const mapped = (prods || []).map((p: any) => ({
                          id: p.id,
                          name: p.name,
                          sku: p.sku,
                          barcode: p.barcode,
                          brand: p.brand || null,
                          price: (p.salePrice ?? p.price ?? p.sale_price) as number | undefined
                        }));
                        setSuggestions(mapped);
                        setOpen(mapped.length > 0);
                      } catch (err) {
                        console.error('Error cargando productos por categoría', err);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <span className="block truncate">{cat.name}</span>
                  </button>
                ))}

                {parentCategories.length > 5 && (
                  <button
                    className="px-3 py-2 text-sm font-medium rounded-md border bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900 dark:to-blue-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-800 dark:hover:to-blue-800 transition-all duration-200"
                    onClick={() => setShowAllCats(true)}
                  >
                    Ver todas ({parentCategories.length})
                  </button>
                )}
              </div>

              {/* Modal for all categories */}
              {showAllCats && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/50 backdrop-blur-sm">
                  <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 mt-20">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Todas las Categorías</h3>
                        <button 
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          onClick={() => setShowAllCats(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Input
                          value={catQuery}
                          onChange={(e) => setCatQuery(e.target.value)}
                          placeholder="Buscar categoría..."
                          className="flex-1"
                        />
                        <button 
                          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
                          onClick={() => setCatQuery('')}
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <div className="p-4 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {parentCategories
                          .filter(c => c.name.toLowerCase().includes(catQuery.trim().toLowerCase()))
                          .map(cat => (
                            <button
                              key={cat.id}
                              className={`text-left px-3 py-2 rounded-md border text-sm transition-all duration-200 ${
                                selectedCategory === cat.id 
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                              onClick={async () => {
                                setShowAllCats(false);
                                setSelectedCategory(cat.id);
                                const children = cat.children || [];
                                setSubCategories((children || []).map((c: any) => ({ id: c.id, name: c.name })));
                                try {
                                  setLoading(true);
                                  const res: any = await apiService.products.getAll({ categoryId: cat.id, limit: 20 });
                                  const prods = res && res.products ? res.products : (res || []);
                                  const mapped = (prods || []).map((p: any) => ({
                                    id: p.id,
                                    name: p.name,
                                    sku: p.sku,
                                    barcode: p.barcode,
                                    brand: p.brand || null
                                  }));
                                  setSuggestions(mapped);
                                  setOpen(mapped.length > 0);
                                } catch (err) {
                                  console.error('Error cargando productos por categoría', err);
                                } finally {
                                  setLoading(false);
                                }
                              }}
                            >
                              <div className="truncate" title={cat.name}>{cat.name}</div>
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
