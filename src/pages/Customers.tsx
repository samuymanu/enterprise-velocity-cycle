import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormItem, FormLabel, FormControl, FormField, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { apiService } from "@/lib/api";
import { normalizeApiArray } from '@/lib/normalizeResponse';
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CurrencyDisplay } from "@/components/CurrencyDisplay";
import { useCurrency } from "@/utils/currencyUtils";
import { useExchangeRates } from "@/hooks/useExchangeRates";

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

export default function Customers() {
  const toast = useToast();
  const { refreshRates, rates } = useExchangeRates();
  const [customers, setCustomers] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditData, setCreditData] = useState<any[]>([]);
  const [apartadoModalOpen, setApartadoModalOpen] = useState(false);
  const [apartadoData, setApartadoData] = useState<any[]>([]);
  const [abonoModalOpen, setAbonoModalOpen] = useState(false);
  const [selectedApartado, setSelectedApartado] = useState<any | null>(null);
  const [nuevoAbonoModalOpen, setNuevoAbonoModalOpen] = useState(false);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [usdEquivalent, setUsdEquivalent] = useState('$0.00');
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);

  // Limpiar estado del modal de nuevo abono
  useEffect(() => {
    if (!nuevoAbonoModalOpen) {
      setAbonoAmount('');
      setUsdEquivalent('$0.00');
    }
  }, [nuevoAbonoModalOpen]);

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

  const fetchCustomers = async (opts: { page?: number; search?: string } = {}) => {
    setLoading(true);
    try {
  const resp: any = await apiService.customers.getAll({ page: opts.page || page, limit: 20, search: opts.search ?? search });
  const list = normalizeApiArray(resp);
  setCustomers(list);
  // try to read pagination info if present
  setTotalPages(resp?.meta?.totalPages || resp?.meta?.total_pages || 1);
    } catch (e: any) {
      toast.toast({ title: 'Error', description: e?.message || 'No se pudo cargar clientes' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers({ page: 1, search: '' });
    fetchDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refrescar tasas BCV cuando se abre el modal de apartados
  useEffect(() => {
    if (apartadoModalOpen) {
      refreshRates();
    }
  }, [apartadoModalOpen, refreshRates]);

  // Escuchar cambios en la tasa BCV para actualizar automáticamente el modal de apartados
  useEffect(() => {
    if (apartadoModalOpen && selectedCustomer && rates.bcv) {
      console.log('🔄 Customers - Tasa BCV cambió a:', rates.bcv, '- recargando datos del apartado');
      setIsUpdatingRates(true);
      // Recargar datos del apartado cuando cambia la tasa
      const reloadApartadoData = async () => {
        try {
          const resp = await apiService.credits.getByCustomer(selectedCustomer.id);
          const credits = resp.layaways || resp.data || resp || [];
          if (Array.isArray(credits)) {
            setApartadoData(credits);
            console.log('✅ Customers - Datos del apartado recargados por cambio de tasa BCV:', rates.bcv);
          }
        } catch (error) {
          console.error('❌ Customers - Error recargando datos por cambio de tasa:', error);
        } finally {
          setIsUpdatingRates(false);
        }
      };
      reloadApartadoData();
    }
  }, [rates.bcv, apartadoModalOpen, selectedCustomer]); // Se ejecuta cuando cambia la tasa BCV

  const fetchDashboardStats = async () => {
    try {
      const resp: any = await apiService.dashboard.getStats();
      // backend returns { stats: { ... }, recentSales, activeServiceOrders }
      if (resp && resp.stats) {
        setDashboardStats(resp.stats);
      } else if (resp && resp.totalCustomers !== undefined) {
        // compatibility fallback
        setDashboardStats(resp);
      } else {
        setDashboardStats(null);
      }
    } catch (err: any) {
      // no toast here to avoid spamming on page load
      setDashboardStats(null);
    }
  };

  return (
    <AppLayout>
      <div className="container-enterprise py-8 space-y-8">
      {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestión de Clientes</h1>
            <p className="text-foreground-secondary">
              Base de datos completa de clientes y cuentas por cobrar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary-hover">➕ Nuevo Cliente</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Cliente</DialogTitle>
                </DialogHeader>

                <Form {...form as any}>
                  <form onSubmit={form.handleSubmit(async (values) => {
                    try {
                      const payload = {
                        documentType: values.documentType,
                        documentNumber: values.documentNumber,
                        firstName: values.firstName,
                        lastName: values.lastName,
                        companyName: values.companyName,
                        customerType: values.customerType,
                        phone: values.phone,
                        email: values.email,
                        address: values.address,
                        city: values.city,
                        state: values.state,
                        country: values.country,
                        isActive: values.isActive,
                        notes: values.notes
                      };
                      const res: any = await apiService.customers.create(payload);
                      // if backend returns success + customer
                      if (res && (res.success || res.customer)) {
                        toast.toast({ title: 'Cliente creado', description: 'El cliente se ha creado correctamente' });
                        setCreateOpen(false);
                        form.reset();
                        // refresh list
                        fetchCustomers({ page: 1, search: '' });
                        return;
                      }
                      // fallback
                      toast.toast({ title: 'Creado', description: 'Respuesta inesperada del servidor' });
                    } catch (err: any) {
                      toast.toast({ title: 'Error', description: err?.message || 'No se pudo crear el cliente' });
                    }
                  })}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField name="documentType" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Documento</FormLabel>
                            <FormControl>
                              <select {...field} className="enterprise-input">
                                <option value="CI">Cédula (CI)</option>
                                <option value="PASSPORT">Pasaporte</option>
                                <option value="RIF">RIF</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField name="documentNumber" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Documento *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="12345678" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField name="firstName" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nombre" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField name="lastName" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apellido *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Apellido" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField name="customerType" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Cliente</FormLabel>
                          <FormControl>
                            <select {...field} className="enterprise-input">
                              <option value="INDIVIDUAL">Persona Natural</option>
                              <option value="COMPANY">Empresa</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField name="email" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="cliente@ejemplo.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField name="phone" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+58 412-1234567" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField name="address" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Dirección completa" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField name="city" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Caracas" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                        <FormField name="state" control={form.control} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Distrito Capital" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                        <Button type="submit">Guardar cliente</Button>
                      </div>
                    </div>
                  </form>
                </Form>

                <DialogFooter />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-primary">{dashboardStats ? Intl.NumberFormat('es-VE').format(dashboardStats.totalCustomers || 0) : '—'}</p>
            <p className="text-sm text-foreground-secondary">Total Clientes</p>
          </Card>

          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-warning">{dashboardStats ? (dashboardStats.creditCount !== undefined ? Intl.NumberFormat('es-VE').format(dashboardStats.creditCount) : '—') : '—'}</p>
            <p className="text-sm text-foreground-secondary">Créditos</p>
          </Card>

          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-success">{dashboardStats && dashboardStats.apartados !== undefined ? Intl.NumberFormat('es-VE').format(dashboardStats.apartados) : '—'}</p>
            <p className="text-sm text-foreground-secondary">Apartados</p>
          </Card>

          <Card className="enterprise-card p-6 text-center">
            <p className="text-3xl font-bold text-info">{dashboardStats && dashboardStats.vencidos !== undefined ? Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(dashboardStats.vencidos) : '—'}</p>
            <p className="text-sm text-foreground-secondary">Vencidos</p>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="enterprise-card p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              id="customers-search"
              name="customers-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchCustomers({ page: 1, search }); }}
              type="text"
              placeholder="Buscar por documento, nombre, email o teléfono..."
              className="enterprise-input flex-1"
            />
            <div className="flex gap-2">
              <Button onClick={() => fetchCustomers({ page: 1, search })}>🔍 Filtrar</Button>
            </div>
          </div>
        </Card>

        {/* Customers Table */}
        <Card className="enterprise-card">
          <div className="p-6 border-b border-card-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Lista de Clientes</h3>
              <div className="flex items-center gap-2">
                <input id="customers-import-file" type="file" accept=".csv,text/csv" className="hidden" />
                <Button variant="outline" size="sm" onClick={() => document.getElementById('customers-import-file')?.click()}>📥 Importar</Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const blob = await apiService.customers.export();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'customers-export.csv';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (err: any) {
                    toast.toast({ title: 'Error', description: err?.message || 'No se pudo exportar clientes' });
                  }
                }}>📤 Exportar</Button>
                <Button variant="outline" size="sm">💌 Email Masivo</Button>
              </div>

              {/* File input handler */}
              <script dangerouslySetInnerHTML={{ __html: `
                (function(){
                  const input = document.getElementById('customers-import-file');
                  if (!input) return;
                  input.addEventListener('change', async function(){
                    const file = (this as HTMLInputElement).files && (this as HTMLInputElement).files[0];
                    if (!file) return;
                    try {
                      // use global apiService via window (module import not available in inline script)
                      const resp = await (window as any).apiService.customers.import(file);
                      alert('Import result: ' + JSON.stringify(resp));
                      // recargar clientes vía fetchCustomers
                      window.location.reload();
                    } catch (e) {
                      alert('Error importing file: ' + (e && e.message ? e.message : e));
                    }
                    (this as HTMLInputElement).value = '';
                  });
                })();
              ` }} />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Cliente</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Contacto</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Tipo</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Estado</th>
                  <th className="text-left p-4 font-medium text-foreground-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-center">Cargando clientes...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center">No hay clientes</td></tr>
                ) : customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-card-border hover:bg-background-secondary/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{customer.companyName || `${customer.firstName || ''} ${customer.lastName || ''}`}</p>
                        <p className="text-sm text-foreground-secondary font-mono">{customer.documentNumber}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p>{customer.email}</p>
                        <p className="text-foreground-secondary">{customer.phone}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <Badge variant="outline">
                          {customer.customerType === "INDIVIDUAL" ? "👤 Persona" : "🏢 Empresa"}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={customer.isActive ? 'outline' : 'destructive'}>
                        {customer.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-2 rounded hover:bg-muted focus:outline-none"
                          title="Ver perfil"
                          onClick={() => { setSelectedCustomer(customer); setProfileOpen(true); }}
                        >
                          {/* Ojo (ver) */}
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button
                          className="p-2 rounded hover:bg-muted focus:outline-none"
                          title="Editar"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCreateOpen(true);
                            try {
                              (form.reset as any)({
                                documentType: customer.documentType || 'CI',
                                documentNumber: customer.documentNumber || '',
                                firstName: customer.firstName || '',
                                lastName: customer.lastName || '',
                                companyName: customer.companyName || '',
                                customerType: customer.customerType || 'INDIVIDUAL',
                                phone: customer.phone || '',
                                email: customer.email || '',
                                address: customer.address || '',
                                city: customer.city || '',
                                state: customer.state || '',
                                country: customer.country || 'Venezuela',
                                isActive: customer.isActive ?? true,
                                notes: customer.notes || ''
                              });
                            } catch (e) {}
                          }}
                        >
                          {/* Editar (lápiz) */}
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M16.475 5.408l2.117 2.117a1.5 1.5 0 010 2.121l-9.192 9.192a2 2 0 01-.708.464l-3.13 1.043a.5.5 0 01-.632-.632l1.043-3.13a2 2 0 01.464-.708l9.192-9.192a1.5 1.5 0 012.121 0z"></path></svg>
                        </button>
                        <button
                          className="p-2 rounded hover:bg-muted focus:outline-none"
                          title="Créditos (deuda)"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            // Simulación de datos de crédito (reemplazar por fetch real cuando esté disponible)
                            setCreditData([
                              {
                                id: '1',
                                fechaCompra: '2025-08-10',
                                producto: 'Bicicleta Montaña XTR',
                                monto: 1200,
                                abonos: [
                                  { fecha: '2025-08-12', metodo: 'Transferencia', monto: 400 },
                                  { fecha: '2025-08-15', metodo: 'Efectivo', monto: 200 }
                                ],
                                notas: 'Cliente pidió prórroga de 1 semana.',
                                fechaPago: '2025-08-25',
                                vencido: true
                              },
                              {
                                id: '2',
                                fechaCompra: '2025-07-20',
                                producto: 'Cascos Pro',
                                monto: 300,
                                abonos: [
                                  { fecha: '2025-07-22', metodo: 'Pago móvil', monto: 100 }
                                ],
                                notas: '',
                                fechaPago: '2025-08-01',
                                vencido: false
                              }
                            ]);
                            setCreditModalOpen(true);
                          }}
                        >
                          {/* Tarjeta de crédito */}
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"></path></svg>
                        </button>
        {/* Modal de Créditos (Deudas) */}
        <Dialog open={creditModalOpen} onOpenChange={setCreditModalOpen}>
          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="border-b border-card-border px-6 pt-6 pb-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-warning/10 text-warning text-xl mr-2">
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"></path></svg>
                </span>
                Créditos y Deudas de {selectedCustomer?.companyName || `${selectedCustomer?.firstName || ''} ${selectedCustomer?.lastName || ''}`}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4 space-y-6">
              {creditData.length === 0 ? (
                <div className="text-center text-foreground-secondary py-8">No hay créditos ni deudas registrados para este cliente.</div>
              ) : (
                <div className="space-y-6">
                  {creditData.map((credito) => (
                    <div key={credito.id} className="border rounded-lg p-4 bg-background-secondary shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-lg">{credito.producto}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-warning">Bs.S {Intl.NumberFormat('es-VE').format(credito.monto)}</span>
                          {credito.vencido ? (
                            <Badge variant="destructive">Vencido</Badge>
                          ) : (
                            <Badge variant="outline">Al día</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-foreground-secondary">Fecha compra:</span> {credito.fechaCompra}
                        </div>
                        <div>
                          <span className="text-foreground-secondary">Fecha acordada pago:</span> {credito.fechaPago}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="text-foreground-secondary">Abonos:</span>
                        {credito.abonos && credito.abonos.length > 0 ? (
                          <ul className="list-disc ml-6 mt-1">
                            {credito.abonos.map((abono: any, idx: number) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span>{abono.fecha}</span>
                                <span className="text-xs bg-muted px-2 py-0.5 rounded">{abono.metodo}</span>
                                <span className="font-medium">Bs.S {Intl.NumberFormat('es-VE').format(abono.monto)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="ml-2">Sin abonos</span>
                        )}
                      </div>
                      <div className="mb-2">
                        <span className="text-foreground-secondary">Notas:</span> {credito.notas || <span className="text-muted">—</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setCreditModalOpen(false)}>Cerrar</Button>
              </div>
            </div>
            <DialogFooter />
          </DialogContent>
        </Dialog>
                        <button
                          className="p-2 rounded hover:bg-muted focus:outline-none"
                          title="Apartado"
                          onClick={async () => {
                            setSelectedCustomer(customer);
                            console.log('🔍 Customers - Consultando apartados para cliente:', {
                              id: customer.id,
                              name: `${customer.firstName} ${customer.lastName}`,
                              document: customer.documentNumber,
                              customerIdToQuery: customer.id
                            });
                            try {
                              console.log('🌐 Customers - Iniciando consulta de apartados...');
                              const resp = await apiService.credits.getByCustomer(customer.id);
                              console.log('📥 Customers - Respuesta completa de credits:', resp);
                              console.log('📥 Customers - Tipo de respuesta:', typeof resp);
                              console.log('📥 Customers - Keys de respuesta:', Object.keys(resp || {}));

                              const credits = resp.layaways || resp.data || resp || [];
                              console.log('📋 Customers - Estructura de respuesta:', {
                                resp,
                                layaways: resp.layaways,
                                data: resp.data,
                                success: resp.success,
                                credits
                              });
                              console.log('📊 Customers - Número de apartados:', Array.isArray(credits) ? credits.length : 0);
                              console.log('🔗 Customers - Customer ID usado en consulta:', customer.id);

                              // Verificar si credits es un array válido
                              if (Array.isArray(credits)) {
                                console.log('✅ Customers - Credits es un array válido con', credits.length, 'elementos');
                                console.log('📋 Customers - Primer elemento:', credits[0]);
                                setApartadoData(credits);
                              } else {
                                console.log('❌ Customers - Credits no es un array:', credits);
                                setApartadoData([]);
                              }

                              setApartadoModalOpen(true);
                              console.log('🔍 Customers - Modal de apartados abierto');
                              // Usar el estado actualizado para el log
                              setTimeout(() => {
                                console.log('🔍 Customers - Datos finales del modal:', apartadoData);
                              }, 100);
                            } catch (e: any) {
                              console.error('❌ Customers - Error al obtener créditos:', e);
                              console.error('❌ Customers - Detalles del error:', e.response?.data || e.message);
                              console.error('🔗 Customers - Customer ID que causó error:', customer.id);
                              toast.toast({ title: 'Error', description: e?.message || 'No se pudieron cargar los apartados' });
                              // Mostrar modal vacío para que el usuario sepa que no hay apartados
                              setApartadoData([]);
                              setApartadoModalOpen(true);
                            }
                          }}
                        >
                          {/* Caja/paquete */}
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"></path></svg>
                        </button>
                        <button
                          className="p-2 rounded hover:bg-muted focus:outline-none"
                          title="Eliminar cliente"
                          onClick={async () => {
                            if (window.confirm('¿Seguro que deseas eliminar este cliente?')) {
                              try {
                                await apiService.customers.delete(customer.id);
                                toast.toast({ title: 'Eliminado', description: 'Cliente eliminado correctamente' });
                                fetchCustomers({ page: 1, search });
                              } catch (e: any) {
                                toast.toast({ title: 'Error', description: e?.message || 'No se pudo eliminar el cliente' });
                              }
                            }
                          }}
                        >
                          {/* Papelera (eliminar) */}
                          <svg width="20" height="20" fill="none" stroke="#e3342f" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-7 0v12a2 2 0 002 2h2a2 2 0 002-2V7"></path><path d="M10 11v6M14 11v6"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 border-t border-card-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground-secondary">
                Mostrando {customers.length} clientes
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(p => Math.max(1, p - 1)); fetchCustomers({ page: Math.max(1, page - 1), search }); }}>« Anterior</Button>
                <span className="text-sm text-foreground-secondary">Página {page} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage(p => Math.min(totalPages, p + 1)); fetchCustomers({ page: Math.min(totalPages, page + 1), search }); }}>Siguiente »</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Perfil de cliente (Dialog) */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="border-b border-card-border px-6 pt-6 pb-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary text-2xl mr-2">
                  {selectedCustomer?.companyName
                    ? '🏢'
                    : '👤'}
                </span>
                Perfil de cliente
              </DialogTitle>
            </DialogHeader>
            {selectedCustomer ? (
              <div className="px-6 py-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-4xl">
                      {selectedCustomer.companyName
                        ? selectedCustomer.companyName[0]?.toUpperCase() || '🏢'
                        : (selectedCustomer.firstName?.[0]?.toUpperCase() || '👤')}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">
                        {selectedCustomer.companyName || `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`}
                      </span>
                      <span>
                        <Badge variant="outline" className="ml-1">
                          {selectedCustomer.customerType === 'COMPANY' ? 'Empresa' : 'Persona'}
                        </Badge>
                        <Badge variant={selectedCustomer.isActive ? 'outline' : 'destructive'} className="ml-1">
                          {selectedCustomer.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </span>
                    </div>
                    <div className="text-xs text-foreground-secondary font-mono">
                      {selectedCustomer.documentType} - {selectedCustomer.documentNumber}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-card-border pt-4">
                  <div>
                    <p className="text-xs text-foreground-secondary mb-1">Email</p>
                    <p className="font-medium break-all">{selectedCustomer.email || <span className="text-muted">—</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-secondary mb-1">Teléfono</p>
                    <p className="font-medium">{selectedCustomer.phone || <span className="text-muted">—</span>}</p>
                  </div>
                </div>

                <div className="border-t border-card-border pt-4">
                  <p className="text-xs text-foreground-secondary mb-1">Dirección</p>
                  <p className="font-medium whitespace-pre-line">{selectedCustomer.address || <span className="text-muted">—</span>}</p>
                </div>

                <div className="border-t border-card-border pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-foreground-secondary mb-1">Ciudad</p>
                    <p className="font-medium">{selectedCustomer.city || <span className="text-muted">—</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-secondary mb-1">Estado</p>
                    <p className="font-medium">{selectedCustomer.state || <span className="text-muted">—</span>}</p>
                  </div>
                </div>

                <div className="border-t border-card-border pt-4">
                  <p className="text-xs text-foreground-secondary mb-1">Notas</p>
                  <p className="font-medium whitespace-pre-line">{selectedCustomer.notes || <span className="text-muted">—</span>}</p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setProfileOpen(false)}>Cerrar</Button>
                  <Button onClick={() => {
                    setCreateOpen(true);
                    try {
                      (form.reset as any)({
                        documentType: selectedCustomer.documentType || 'CI',
                        documentNumber: selectedCustomer.documentNumber || '',
                        firstName: selectedCustomer.firstName || '',
                        lastName: selectedCustomer.lastName || '',
                        companyName: selectedCustomer.companyName || '',
                        customerType: selectedCustomer.customerType || 'INDIVIDUAL',
                        phone: selectedCustomer.phone || '',
                        email: selectedCustomer.email || '',
                        address: selectedCustomer.address || '',
                        city: selectedCustomer.city || '',
                        state: selectedCustomer.state || '',
                        country: selectedCustomer.country || 'Venezuela',
                        isActive: selectedCustomer.isActive ?? true,
                        notes: selectedCustomer.notes || ''
                      });
                    } catch (e) {}
                    setProfileOpen(false);
                  }}>Editar</Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-foreground-secondary">Cargando...</div>
            )}
            <DialogFooter />
          </DialogContent>
        </Dialog>

        {/* Modal de Apartados Mejorado */}
        <Dialog open={apartadoModalOpen} onOpenChange={setApartadoModalOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="border-b border-card-border px-6 pt-6 pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="7" width="18" height="13" rx="2"/>
                    <path d="M16 3v4M8 3v4M3 11h18"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xl">Apartados de {selectedCustomer?.companyName || `${selectedCustomer?.firstName || ''} ${selectedCustomer?.lastName || ''}`}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {apartadoData.length} apartado{apartadoData.length !== 1 ? 's' : ''} registrado{apartadoData.length !== 1 ? 's' : ''}
                    <span className="ml-2 text-blue-600 dark:text-blue-400">• Tasa BCV: {rates.bcv} Bs/USD</span>
                    {isUpdatingRates && (
                      <span className="ml-2 inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Actualizando...
                      </span>
                    )}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 py-6">
              {apartadoData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                    <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-gray-400">
                      <rect x="3" y="7" width="18" height="13" rx="2"/>
                      <path d="M16 3v4M8 3v4M3 11h18"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay apartados registrados</h3>
                  <p className="text-muted-foreground">Este cliente aún no tiene apartados activos.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Estadísticas rápidas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-bold">{apartadoData.length}</span>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Apartados</p>
                          <p className="font-semibold text-blue-700 dark:text-blue-300">Activos</p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <span className="text-green-600 dark:text-green-400 font-bold">
                            {apartadoData.filter(a => a.status === 'COMPLETADO').length}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Completados</p>
                          <p className="font-semibold text-green-700 dark:text-green-300">
                            {Math.round((apartadoData.filter(a => a.status === 'COMPLETADO').length / apartadoData.length) * 100)}%
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                          <div className="text-center">
                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 leading-tight">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2
                              }).format(apartadoData.reduce((sum, a) => sum + (a.amount || a.total || 0), 0))}
                            </div>
                            <div className="text-xs text-orange-500 dark:text-orange-500 leading-tight -mt-1">
                              ≈ {new Intl.NumberFormat('es-VE', {
                                style: 'currency',
                                currency: 'VES',
                                minimumFractionDigits: 2
                              }).format(apartadoData.reduce((sum, a) => sum + (a.amount || a.total || 0), 0) * rates.bcv)}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 ml-4">
                          <p className="text-base font-medium text-muted-foreground mb-1">Monto Total</p>
                          <p className="text-lg font-bold text-orange-700 dark:text-orange-300">Pendiente de Pago</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {apartadoData.length} apartado{apartadoData.length !== 1 ? 's' : ''} activo{apartadoData.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Lista de apartados */}
                  <div className="space-y-4">
                    {apartadoData.map((apartado) => {
                      const totalAmount = apartado.amount || apartado.total || 0;
                      const paidAmount = apartado.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
                      const remainingAmount = totalAmount - paidAmount;
                      const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

                      const isOverdue = apartado.dueDate && new Date(apartado.dueDate) < new Date() && apartado.status !== 'COMPLETADO';
                      const isCompleted = apartado.status === 'COMPLETADO';

                      return (
                        <Card key={apartado.id} className={`p-6 transition-all duration-200 hover:shadow-md ${
                          isOverdue ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10' :
                          isCompleted ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10' :
                          'border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                isCompleted ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                                isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              }`}>
                                {isCompleted ? (
                                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M20 6L9 17l-5-5"/>
                                  </svg>
                                ) : isOverdue ? (
                                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M12 8v4M12 16h.01"/>
                                  </svg>
                                ) : (
                                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <rect x="3" y="7" width="18" height="13" rx="2"/>
                                    <path d="M16 3v4M8 3v4M3 11h18"/>
                                  </svg>
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">Apartado #{apartado.id.slice(-8)}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Creado: {new Date(apartado.createdAt).toLocaleDateString('es-VE')}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <CurrencyDisplay amount={totalAmount} className="mb-1" primaryCurrency="USD" />
                              <Badge variant={
                                isCompleted ? 'default' :
                                isOverdue ? 'destructive' :
                                'outline'
                              } className="text-xs">
                                {isCompleted ? 'Completado' :
                                 isOverdue ? 'Vencido' :
                                 'Activo'}
                              </Badge>
                            </div>
                          </div>

                          {/* Barra de progreso */}
                          {!isCompleted && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Progreso de pago</span>
                                <span className="font-medium">{Math.round(progressPercentage)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    progressPercentage >= 100 ? 'bg-green-500' :
                                    progressPercentage >= 75 ? 'bg-blue-500' :
                                    progressPercentage >= 50 ? 'bg-yellow-500' :
                                    'bg-orange-500'
                                  }`}
                                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-5">
                              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                  <span className="text-sm font-medium text-muted-foreground">Monto total:</span>
                                  <CurrencyDisplay amount={totalAmount} showBoth={true} size="sm" primaryCurrency="USD" className="font-bold" />
                                </div>
                                {!isCompleted && (
                                  <>
                                    <div className="flex justify-between items-start mb-4">
                                      <span className="text-sm font-medium text-muted-foreground">Pagado:</span>
                                      <CurrencyDisplay amount={paidAmount} showBoth={true} size="sm" className="text-green-600 dark:text-green-400 font-bold" primaryCurrency="USD" />
                                    </div>
                                    <div className="flex justify-between items-start">
                                      <span className="text-sm font-medium text-muted-foreground">Restante:</span>
                                      <CurrencyDisplay amount={remainingAmount} showBoth={true} size="sm" className="text-orange-600 dark:text-orange-400 font-bold" primaryCurrency="USD" />
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="space-y-5">
                              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                  <span className="text-sm font-medium text-muted-foreground">Fecha límite:</span>
                                  <span className={`text-sm font-semibold ${
                                    isOverdue ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                                  }`}>
                                    {apartado.dueDate ? new Date(apartado.dueDate).toLocaleDateString('es-VE') : 'No especificada'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-start mb-4">
                                  <span className="text-sm font-medium text-muted-foreground">Venta:</span>
                                  <span className="text-sm font-semibold">{apartado.sale?.saleNumber || 'N/A'}</span>
                                </div>
                                {apartado.payments && apartado.payments.length > 0 && (
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium text-muted-foreground">Abonos:</span>
                                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                      {apartado.payments.length} realizado{apartado.payments.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Productos */}
                          {apartado.sale?.saleItems && apartado.sale.saleItems.length > 0 && (
                            <div className="mb-6">
                              <h4 className="font-semibold mb-3 text-base text-foreground">Productos apartados:</h4>
                              <div className="space-y-3">
                                {apartado.sale.saleItems.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                          {item.quantity}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-foreground">{item.product?.name || 'Producto'}</span>
                                        <p className="text-xs text-muted-foreground">Cant: {item.quantity}</p>
                                      </div>
                                    </div>
                                    <CurrencyDisplay amount={item.total} showBoth={true} size="md" primaryCurrency="USD" className="font-semibold" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Historial de abonos */}
                          {apartado.payments && apartado.payments.length > 0 && (
                            <div className="mb-6">
                              <h4 className="font-semibold mb-3 text-base text-foreground">Últimos abonos:</h4>
                              <div className="space-y-3 max-h-40 overflow-y-auto">
                                {apartado.payments.slice(-3).map((abono: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 rounded-lg p-4 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-green-600 dark:text-green-400">
                                          <path d="M20 6L9 17l-5-5"/>
                                        </svg>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium">{new Date(abono.date).toLocaleDateString('es-VE')}</span>
                                        <Badge variant="outline" className="text-xs ml-2">{abono.method || 'Método'}</Badge>
                                      </div>
                                    </div>
                                    <CurrencyDisplay amount={abono.amount} showBoth={true} size="md" className="text-green-600 dark:text-green-400 font-semibold" primaryCurrency="USD" />
                                  </div>
                                ))}
                                {apartado.payments.length > 3 && (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    +{apartado.payments.length - 3} abonos más...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Notas */}
                          {apartado.notes && (
                            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-start gap-2">
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                <div>
                                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Notas del apartado:</p>
                                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{apartado.notes}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Acciones */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedApartado(apartado);
                                  setAbonoModalOpen(true);
                                }}
                                className="flex items-center gap-2"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M12 5v14M5 12h14"/>
                                </svg>
                                Abonar
                              </Button>
                              <Button size="sm" variant="outline" className="flex items-center gap-2">
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Editar
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" className="flex items-center gap-2">
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14,2 14,8 20,8"/>
                                </svg>
                                Imprimir
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  if (window.confirm('¿Seguro que deseas eliminar este apartado?')) {
                                    try {
                                      await apiService.credits.delete(apartado.id);
                                      toast.toast({ title: 'Eliminado', description: 'Apartado eliminado correctamente' });
                                      // Recargar apartados
                                      const resp = await apiService.credits.getByCustomer(selectedCustomer.id);
                                      const credits = resp.layaways || resp.data || resp || [];
                                      setApartadoData(credits);
                                    } catch (e: any) {
                                      toast.toast({ title: 'Error', description: e?.message || 'No se pudo eliminar el apartado' });
                                    }
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" onClick={() => setApartadoModalOpen(false)} className="px-8">
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Abono a Apartado */}
        <Dialog open={abonoModalOpen} onOpenChange={setAbonoModalOpen}>
          <DialogContent className="max-w-3xl p-0">
            <DialogHeader className="border-b border-card-border px-6 pt-6 pb-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-success/10 text-success text-xl mr-2">
                  💰
                </span>
                Registro de Abonos - {selectedApartado?.sale?.product?.name || 'Apartado'}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4 space-y-6">
              {selectedApartado ? (
                <>
                  <div className="bg-background-secondary p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-foreground-secondary">Monto total:</span>
                        <div className="ml-2">
                          <CurrencyDisplay amount={selectedApartado.amount || selectedApartado.total} showBoth={true} size="sm" primaryCurrency="USD" />
                        </div>
                      </div>
                      <div>
                        <span className="text-foreground-secondary">Estado:</span>
                        <Badge variant={selectedApartado.status === 'COMPLETADO' ? 'default' : 'outline'} className="ml-2">
                          {selectedApartado.status === 'COMPLETADO' ? 'Completado' : 'Activo'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Historial de Abonos</h3>
                    {selectedApartado.payments && selectedApartado.payments.length > 0 ? (
                      <div className="space-y-3">
                        {selectedApartado.payments.map((abono: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-4 bg-background-secondary">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">Abono #{idx + 1}</div>
                              <div className="flex items-center gap-2">
                                <CurrencyDisplay amount={abono.amount} showBoth={true} size="md" className="text-success font-bold" primaryCurrency="USD" />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Función para imprimir recibo
                                    const printWindow = window.open('', '_blank');
                                    if (printWindow) {
                                      printWindow.document.write(`
                                        <html>
                                        <head>
                                          <title>Recibo de Abono</title>
                                          <style>
                                            body { font-family: Arial, sans-serif; margin: 20px; }
                                            .header { text-align: center; margin-bottom: 30px; }
                                            .details { margin: 20px 0; }
                                            .amount { font-size: 24px; font-weight: bold; color: #22c55e; }
                                          </style>
                                        </head>
                                        <body>
                                          <div class="header">
                                            <h1>Recibo de Abono</h1>
                                            <h2>${selectedApartado?.sale?.product?.name || 'Apartado'}</h2>
                                          </div>
                                          <div class="details">
                                            <p><strong>Cliente:</strong> ${selectedCustomer?.companyName || `${selectedCustomer?.firstName || ''} ${selectedCustomer?.lastName || ''}`}</p>
                                            <p><strong>Fecha del Abono:</strong> ${new Date(abono.date).toLocaleDateString('es-VE')}</p>
                                            <p><strong>Método de Pago:</strong> ${abono.method || 'No especificado'}</p>
                                            <p><strong>Monto:</strong> <span class="amount">$${Intl.NumberFormat('en-US').format(Number((abono.amount / 45.50).toFixed(2)))} USD<br><small style="color: #6b7280;">Bs.S ${Intl.NumberFormat('es-VE').format(abono.amount)}</small></span></p>
                                            ${abono.notes ? `<p><strong>Notas:</strong> ${abono.notes}</p>` : ''}
                                          </div>
                                          <div style="text-align: center; margin-top: 50px;">
                                            <p>______________________________</p>
                                            <p>Firma del Cliente</p>
                                          </div>
                                        </body>
                                        </html>
                                      `);
                                      printWindow.document.close();
                                      printWindow.print();
                                    }
                                  }}
                                >
                                  Imprimir Recibo
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-foreground-secondary">Fecha:</span> {new Date(abono.date).toLocaleDateString('es-VE')}
                              </div>
                              <div>
                                <span className="text-foreground-secondary">Método de pago:</span> {abono.method || 'No especificado'}
                              </div>
                            </div>
                            {abono.notes && (
                              <div className="mt-2">
                                <span className="text-foreground-secondary">Notas:</span> {abono.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-foreground-secondary py-8">No hay abonos registrados para este apartado.</div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-card-border">
                    <Button variant="outline" onClick={() => setAbonoModalOpen(false)}>Cerrar</Button>
                    <Button
                      onClick={() => {
                        setNuevoAbonoModalOpen(true);
                      }}
                    >
                      Agregar Nuevo Abono
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center text-foreground-secondary py-8">Cargando...</div>
              )}
            </div>
            <DialogFooter />
          </DialogContent>
        </Dialog>

        {/* Modal de Nuevo Abono Mejorado */}
        <Dialog open={nuevoAbonoModalOpen} onOpenChange={setNuevoAbonoModalOpen}>
          <DialogContent className="max-w-lg p-0">
            <DialogHeader className="border-b border-card-border px-6 pt-6 pb-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <DialogTitle className="text-xl font-bold flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </div>
                <div>
                  <div className="text-lg">Nuevo Abono</div>
                  <div className="text-sm text-muted-foreground">
                    Apartado #{selectedApartado?.id?.slice(-8) || 'N/A'}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 py-6 space-y-6">
              {/* Información del apartado */}
              <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <div className="text-sm text-muted-foreground mb-2">Monto restante del apartado:</div>
                <CurrencyDisplay
                  amount={(selectedApartado?.amount || selectedApartado?.total || 0) - (selectedApartado?.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0)}
                  className="text-xl font-bold text-blue-600 dark:text-blue-400"
                />
              </Card>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Monto del Abono (Bs.S)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      id="abono-amount"
                      value={abonoAmount}
                      onChange={(e) => setAbonoAmount(e.target.value)}
                      className="pl-12 text-lg"
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-medium">
                      Bs.S
                    </span>
                  </div>
                  {/* Conversión automática a USD */}
                  <div className="mt-2 text-sm text-muted-foreground">
                    Equivalente en USD: <span className="font-medium text-green-600 dark:text-green-400">{usdEquivalent}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Método de Pago</label>
                  <select
                    className="w-full p-3 border border-input rounded-md bg-background text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    id="abono-method"
                  >
                    <option value="EFECTIVO">💵 Efectivo</option>
                    <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                    <option value="PAGO_MOVIL">📱 Pago Móvil</option>
                    <option value="TARJETA">💳 Tarjeta de Crédito/Débito</option>
                    <option value="CHEQUE">📄 Cheque</option>
                    <option value="OTRO">🔄 Otro Método</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Notas (opcional)</label>
                  <Input
                    placeholder="Agregar notas sobre este abono..."
                    id="abono-notes"
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setNuevoAbonoModalOpen(false)}
                  className="px-6"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    const amount = parseFloat(abonoAmount);
                    const paymentMethod = (document.getElementById('abono-method') as HTMLSelectElement).value;
                    const notes = (document.getElementById('abono-notes') as HTMLInputElement).value;

                    if (!amount || amount <= 0) {
                      toast.toast({
                        title: 'Monto inválido',
                        description: 'Por favor ingrese un monto mayor a cero',
                        variant: 'destructive'
                      });
                      // Enfocar el input de monto
                      const amountInput = document.getElementById('abono-amount') as HTMLInputElement;
                      amountInput?.focus();
                      return;
                    }

                    const remainingAmount = (selectedApartado?.amount || selectedApartado?.total || 0) -
                      (selectedApartado?.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0);

                    if (amount > remainingAmount) {
                      toast.toast({
                        title: 'Monto excedido',
                        description: `El monto no puede ser mayor al restante: Bs.S ${Intl.NumberFormat('es-VE').format(remainingAmount)}`,
                        variant: 'destructive'
                      });
                      // Enfocar el input de monto
                      const amountInput = document.getElementById('abono-amount') as HTMLInputElement;
                      amountInput?.focus();
                      return;
                    }

                    try {
                      await apiService.credits.addInstallment(selectedApartado.id, {
                        amount,
                        method: paymentMethod,
                        notes: notes || null
                      });

                      toast.toast({
                        title: '✅ Abono registrado',
                        description: `Se agregó un abono de Bs.S ${Intl.NumberFormat('es-VE').format(amount)} correctamente`,
                      });

                      setNuevoAbonoModalOpen(false);

                      // Recargar información del apartado
                      const resp = await apiService.credits.getById(selectedApartado.id);
                      setSelectedApartado(resp.layaway || resp);

                      // Recargar lista de apartados del cliente
                      const creditsResp = await apiService.credits.getByCustomer(selectedCustomer.id);
                      const credits = creditsResp.layaways || creditsResp.data || creditsResp || [];
                      setApartadoData(credits);

                    } catch (e: any) {
                      toast.toast({
                        title: 'Error al registrar abono',
                        description: e?.message || 'No se pudo procesar el abono. Intente nuevamente.',
                        variant: 'destructive'
                      });
                    }
                  }}
                  className="px-6 bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Registrar Abono
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Management Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">💳</div>
              <h3 className="font-semibold text-foreground">Cuentas por Cobrar</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Gestionar créditos y pagos pendientes
              </p>
            </div>
          </Card>
          
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-semibold text-foreground">Análisis de Clientes</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Segmentación y comportamiento de compra
              </p>
            </div>
          </Card>
          
          <Card className="enterprise-card p-6 hover:shadow-enterprise-lg cursor-pointer">
            <div className="text-center">
              <div className="text-4xl mb-3">💌</div>
              <h3 className="font-semibold text-foreground">Marketing</h3>
              <p className="text-sm text-foreground-secondary mt-2">
                Campañas y comunicación masiva
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}