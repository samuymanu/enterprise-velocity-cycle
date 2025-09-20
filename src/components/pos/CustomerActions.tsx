import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, UserPlus, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { apiService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  documentNumber: string;
  phone?: string;
  email?: string;
}

const createCustomerSchema = z.object({
  documentType: z.enum(['CI', 'PASSPORT', 'RIF']).default('CI'),
  documentNumber: z.string().min(1, 'Número de documento es requerido').max(20),
  firstName: z.string().min(1, 'Nombre es requerido').max(50),
  lastName: z.string().min(1, 'Apellido es requerido').max(50),
  companyName: z.string().max(100).optional(),
  customerType: z.enum(['INDIVIDUAL', 'COMPANY']).default('INDIVIDUAL'),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email('Email inválido').max(100).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  country: z.string().max(50).default('Venezuela'),
  isActive: z.boolean().default(true),
  notes: z.string().optional()
});

type CreateCustomerForm = z.infer<typeof createCustomerSchema>;

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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const toast = useToast();

  const form = useForm<CreateCustomerForm>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: { 
      documentType: 'CI',
      documentNumber: '',
      firstName: '',
      lastName: '',
      companyName: '',
      customerType: 'INDIVIDUAL',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      country: 'Venezuela',
      isActive: true,
      notes: ''
    }
  });

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
      // El método search ya devuelve { customers: [...] }
      setSuggestions(response.customers || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error buscando clientes:', error);
      // Mostrar mensaje de error pero no bloquear la UI
      setSuggestions([]);
      setShowSuggestions(false);
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

  const createCustomer = async (data: CreateCustomerForm) => {
    try {
      setCreatingCustomer(true);
      const response = await apiService.customers.create(data);
      
      if (response.success && response.customer) {
        toast.toast({
          title: 'Cliente creado',
          description: `${response.customer.firstName} ${response.customer.lastName} ha sido creado exitosamente.`,
          variant: 'default'
        });
        
        // Seleccionar automáticamente el cliente creado
        selectCustomer(response.customer);
        setCreateModalOpen(false);
        form.reset();
      } else {
        throw new Error(response.error || 'Error al crear cliente');
      }
    } catch (error: any) {
      console.error('Error creando cliente:', error);
      toast.toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el cliente. Intente nuevamente.',
        variant: 'destructive'
      });
    } finally {
      setCreatingCustomer(false);
    }
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
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setCreateModalOpen(true)}
            >
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

      {/* Modal de Crear Cliente */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(createCustomer)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Documento</FormLabel>
                      <FormControl>
                        <select {...field} className="w-full p-2 border rounded-md">
                          <option value="CI">CI</option>
                          <option value="PASSPORT">Pasaporte</option>
                          <option value="RIF">RIF</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número Documento</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12345678" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Juan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Pérez" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="customerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full p-2 border rounded-md">
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="COMPANY">Empresa</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('customerType') === 'COMPANY' && (
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Empresa</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Mi Empresa S.A." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+584121234567" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="cliente@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateModalOpen(false)}
                  disabled={creatingCustomer}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={creatingCustomer}
                >
                  {creatingCustomer ? 'Creando...' : 'Crear Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
