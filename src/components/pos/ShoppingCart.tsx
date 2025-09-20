import { ShoppingCart as CartIcon, X, Plus, Minus, Trash2, AlertTriangle, CheckCircle, XCircle, StickyNote, Flag, Search, SortAsc, Package } from "lucide-react";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type CartItem = {
  id: string;
  name: string;
  sku?: string;
  brand?: string;
  quantity: number;
  price?: number;
  notes?: string; // Notas específicas del producto
  priority?: 'low' | 'normal' | 'high'; // Prioridad del producto
  category?: string; // Categoría para agrupación
};

export function ShoppingCart({ 
  items = [], 
  onRemove, 
  onQuantityChange,
  onClearCart,
  onItemUpdate // Nueva prop para actualizar items con notas/prioridad
}: { 
  items?: CartItem[]; 
  onRemove?: (id: string) => void;
  onQuantityChange?: (id: string, quantity: number) => void;
  onClearCart?: () => void;
  onItemUpdate?: (id: string, updates: Partial<CartItem>) => void;
}) {
  const { rates } = useExchangeRates();
  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Estados para funcionalidades avanzadas
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'quantity' | 'priority'>('name');
  const [groupBy, setGroupBy] = useState<'none' | 'category' | 'brand' | 'priority'>('none');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saleNotes, setSaleNotes] = useState('');
  const [selectedItemNotes, setSelectedItemNotes] = useState<{id: string, notes: string} | null>(null);

  // Función para obtener información de stock
  const getStockInfo = (productId: string) => {
    const product = useInventoryStore.getState().getProductById(productId);
    if (!product) return null;

    const availableStock = product.stock || 0;
    const minStock = product.minStock || 0;
    
    let status: 'normal' | 'low' | 'out' = 'normal';
    let statusText = '';
    let statusColor = '';
    let icon = null;

    if (availableStock === 0) {
      status = 'out';
      statusText = 'Sin stock';
      statusColor = 'text-red-600 dark:text-red-400';
      icon = <XCircle className="h-3 w-3" />;
    } else if (availableStock <= minStock) {
      status = 'low';
      statusText = `Stock bajo (${availableStock})`;
      statusColor = 'text-yellow-600 dark:text-yellow-400';
      icon = <AlertTriangle className="h-3 w-3" />;
    } else {
      status = 'normal';
      statusText = `${availableStock} disponibles`;
      statusColor = 'text-green-600 dark:text-green-400';
      icon = <CheckCircle className="h-3 w-3" />;
    }

    return { availableStock, minStock, status, statusText, statusColor, icon };
  };

  // Funciones para funcionalidades avanzadas
  const updateItemNotes = (id: string, notes: string) => {
    onItemUpdate?.(id, { notes });
  };

  const updateItemPriority = (id: string, priority: 'low' | 'normal' | 'high') => {
    onItemUpdate?.(id, { priority });
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'low': return '⚪';
      default: return '🟡';
    }
  };

  // Filtrar y ordenar items
  const filteredAndSortedItems = items
    .filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (b.price || 0) - (a.price || 0);
        case 'quantity':
          return b.quantity - a.quantity;
        case 'priority':
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          return (priorityOrder[b.priority || 'normal'] || 2) - (priorityOrder[a.priority || 'normal'] || 2);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // Agrupar items si es necesario
  const groupedItems = groupBy === 'none' ? { 'Todos los productos': filteredAndSortedItems } :
    filteredAndSortedItems.reduce((groups, item) => {
      const key = groupBy === 'category' ? (item.category || 'Sin categoría') :
                  groupBy === 'brand' ? (item.brand || 'Sin marca') :
                  (item.priority || 'normal');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, CartItem[]>);

  const formatCurrencyUSD = (value?: number) => {
    if (value == null) return '';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    } catch (err) {
      return `$${(value || 0).toFixed(2)}`;
    }
  };

  const formatCurrencyVES = (value?: number) => {
    if (value == null) return '';
    try {
      return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 0 }).format(value);
    } catch (err) {
      return `Bs.${(value || 0).toLocaleString('es-VE')}`;
    }
  };

  const convertToVES = (usdAmount: number) => usdAmount * rates.bcv;

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 min-h-[500px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CartIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Carrito de Compras</h3>
            </div>
            {totalItems > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Features Panel */}
        {items.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs"
              >
                ⚙️ Funciones Avanzadas
              </Button>
              
              {showAdvanced && (
                <div className="flex items-center gap-2">
                  {/* Búsqueda */}
                  <div className="relative">
                    <Search className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-7 text-xs pl-6 w-32"
                    />
                  </div>

                  {/* Ordenar */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-xs h-7 px-2 border rounded"
                  >
                    <option value="name">Ordenar por nombre</option>
                    <option value="price">Ordenar por precio</option>
                    <option value="quantity">Ordenar por cantidad</option>
                    <option value="priority">Ordenar por prioridad</option>
                  </select>

                  {/* Agrupar */}
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as any)}
                    className="text-xs h-7 px-2 border rounded"
                  >
                    <option value="none">Sin agrupar</option>
                    <option value="category">Agrupar por categoría</option>
                    <option value="brand">Agrupar por marca</option>
                    <option value="priority">Agrupar por prioridad</option>
                  </select>
                </div>
              )}
            </div>

            {/* Notas de venta */}
            {showAdvanced && (
              <div className="mt-2">
                <Textarea
                  placeholder="Notas de la venta (opcional)..."
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  className="text-xs h-16 resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                <CartIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Carrito vacío</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Busca y agrega productos desde el panel de búsqueda para comenzar una venta
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedItems).map(([groupName, groupItems]) => (
                <div key={groupName}>
                  {groupBy !== 'none' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {groupName} ({groupItems.length})
                      </span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {groupItems.map(item => (
                      <div key={item.id} className="group bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        {/* Main product row - Horizontal layout */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Product info - Compact */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm flex-1">{item.name}</h4>
                              
                              {/* Priority Badge */}
                              {item.priority && item.priority !== 'normal' && (
                                <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                                  {getPriorityIcon(item.priority)} {item.priority}
                                </Badge>
                              )}
                              
                              {item.brand && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-nowrap">
                                  {item.brand}
                                </span>
                              )}
                            </div>
                            
                            {/* Notes */}
                            {item.notes && (
                              <div className="flex items-center gap-1 mt-1">
                                <StickyNote className="h-3 w-3 text-blue-500" />
                                <span className="text-xs text-blue-600 dark:text-blue-400 truncate">{item.notes}</span>
                              </div>
                            )}
                            
                            {/* Indicador de Stock */}
                            {(() => {
                              const stockInfo = getStockInfo(item.id);
                              return stockInfo ? (
                                <div className={`flex items-center gap-1 mt-1 text-xs ${stockInfo.statusColor}`}>
                                  {stockInfo.icon}
                                  <span>{stockInfo.statusText}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Stock no disponible</span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Price - Compact */}
                          {typeof item.price === 'number' && (
                            <div className="text-right min-w-[70px] flex-shrink-0">
                              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                {formatCurrencyUSD(item.price)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatCurrencyVES(convertToVES(item.price))}
                              </div>
                            </div>
                          )}

                          {/* Quantity Controls - Ultra compact */}
                          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded">
                            <button
                              onClick={() => {
                                if (item.quantity > 1) {
                                  onQuantityChange?.(item.id, item.quantity - 1);
                                }
                              }}
                              className="px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 text-xs"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2 py-1 text-sm font-medium min-w-[1.5rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onQuantityChange?.(item.id, item.quantity + 1)}
                              className="px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Advanced Controls */}
                          <div className="flex items-center gap-1">
                            {/* Notes Button */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <button
                                  className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title="Agregar nota"
                                >
                                  <StickyNote className="h-3.5 w-3.5" />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Nota para {item.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Escribe una nota para este producto..."
                                    value={selectedItemNotes?.id === item.id ? selectedItemNotes.notes : item.notes || ''}
                                    onChange={(e) => {
                                      const notes = e.target.value;
                                      setSelectedItemNotes({ id: item.id, notes });
                                    }}
                                    className="min-h-[100px]"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => setSelectedItemNotes(null)}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        if (selectedItemNotes) {
                                          updateItemNotes(item.id, selectedItemNotes.notes);
                                          setSelectedItemNotes(null);
                                        }
                                      }}
                                    >
                                      Guardar
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {/* Priority Selector */}
                            <select
                              value={item.priority || 'normal'}
                              onChange={(e) => updateItemPriority(item.id, e.target.value as 'low' | 'normal' | 'high')}
                              className="text-xs h-6 px-1 border rounded bg-white dark:bg-gray-800"
                              title="Establecer prioridad"
                            >
                              <option value="low">Baja</option>
                              <option value="normal">Normal</option>
                              <option value="high">Alta</option>
                            </select>

                            {/* Remove Button */}
                            <button
                              onClick={() => onRemove?.(item.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Eliminar del carrito"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Total and Clear button */}
        {items.length > 0 && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'} en el carrito
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  Total: {formatCurrencyUSD(total)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrencyVES(convertToVES(total))}
                </div>
              </div>
            </div>
            <div className="mt-1 flex justify-end">
              <button
                onClick={() => onClearCart?.()}
                className="inline-flex items-center px-3 py-2 text-sm font-medium border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Carrito
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
