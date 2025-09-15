import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, UserPlus, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { apiService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  documentNumber: string;
  phone?: string;
  email?: string;
}

export function CustomerActions({ 
  selectedCustomer, 
  onCustomerChange 
}: { 
  selectedCustomer?: Customer | null;
  onCustomerChange?: (customer: Customer | null) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();

  // Buscar clientes en tiempo real
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchCustomers();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const searchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiService.customers.search(searchQuery);
      setSuggestions(response.customers || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error buscando clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = (customer: Customer | null) => {
    onCustomerChange?.(customer);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const getCustomerDisplayName = (customer: Customer) => {
    if (customer.companyName) return customer.companyName;
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.documentNumber;
  };

  const currentCustomerName = selectedCustomer ? getCustomerDisplayName(selectedCustomer) : 'Cliente General';

  return (
    <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cliente:</span>
        
        {/* Cliente seleccionado */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {currentCustomerName}
          </span>
          
          {selectedCustomer && (
            <button
              onClick={() => selectCustomer(null)}
              className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Búsqueda de clientes */}
        <div className="relative flex-1">
          <div className="flex gap-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, cédula o teléfono..."
              className="text-sm"
            />
            <Button size="sm" variant="outline">
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Sugerencias de clientes */}
          {showSuggestions && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mx-auto mb-1"></div>
                  Buscando...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                  >
                    <div className="font-medium text-sm">{getCustomerDisplayName(customer)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {customer.documentNumber} • {customer.phone || customer.email || 'Sin contacto'}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-sm text-gray-500">
                  No se encontraron clientes
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
