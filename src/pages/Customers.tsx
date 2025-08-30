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
                            try {
                              const resp = await apiService.credits.getByCustomer(customer.id);
                              console.log('Respuesta de credits:', resp); // Para debugging
                              const credits = resp.layaways || resp.data || resp || [];
                              setApartadoData(Array.isArray(credits) ? credits : []);
                              setApartadoModalOpen(true);
                            } catch (e: any) {
                              console.error('Error al obtener créditos:', e); // Para debugging
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

        {/* Modal de Apartados */}
        <Dialog open={apartadoModalOpen} onOpenChange={setApartadoModalOpen}>
          <DialogContent className="max-w-4xl p-0">
            <DialogHeader className="border-b border-card-border px-6 pt-6 pb-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-info/10 text-info text-xl mr-2">
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"></path></svg>
                </span>
                Apartados de {selectedCustomer?.companyName || `${selectedCustomer?.firstName || ''} ${selectedCustomer?.lastName || ''}`}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4 space-y-6">
              {apartadoData.length === 0 ? (
                <div className="text-center text-foreground-secondary py-8">No hay apartados registrados para este cliente.</div>
              ) : (
                <div className="space-y-6">
                  {apartadoData.map((apartado) => (
                    <div key={apartado.id} className="border rounded-lg p-4 bg-background-secondary shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-lg">{apartado.sale?.product?.name || 'Producto'}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-info">Bs.S {Intl.NumberFormat('es-VE').format(apartado.amount || apartado.total)}</span>
                          <Badge variant={apartado.status === 'COMPLETADO' ? 'default' : 'outline'}>
                            {apartado.status === 'COMPLETADO' ? 'Completado' : 'Activo'}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-foreground-secondary">Fecha apartado:</span> {new Date(apartado.createdAt).toLocaleDateString('es-VE')}
                        </div>
                        <div>
                          <span className="text-foreground-secondary">Fecha límite:</span> {apartado.dueDate ? new Date(apartado.dueDate).toLocaleDateString('es-VE') : 'No especificada'}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="text-foreground-secondary">Abonos realizados:</span>
                        {apartado.payments && apartado.payments.length > 0 ? (
                          <ul className="list-disc ml-6 mt-1">
                            {apartado.payments.map((abono: any, idx: number) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span>{new Date(abono.date).toLocaleDateString('es-VE')}</span>
                                <span className="text-xs bg-muted px-2 py-0.5 rounded">{abono.method || 'Método'}</span>
                                <span className="font-medium">Bs.S {Intl.NumberFormat('es-VE').format(abono.amount)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="ml-2">Sin abonos</span>
                        )}
                      </div>
                      <div className="mb-4">
                        <span className="text-foreground-secondary">Notas:</span> {apartado.notes || <span className="text-muted">—</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApartado(apartado);
                            setAbonoModalOpen(true);
                          }}
                        >
                          Abonar
                        </Button>
                        <Button size="sm" variant="outline">
                          Editar
                        </Button>
                        <Button size="sm" variant="outline">
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
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setApartadoModalOpen(false)}>Cerrar</Button>
              </div>
            </div>
            <DialogFooter />
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
                        <span className="font-bold ml-2">Bs.S {Intl.NumberFormat('es-VE').format(selectedApartado.amount || selectedApartado.total)}</span>
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
                                <span className="text-lg font-bold text-success">Bs.S {Intl.NumberFormat('es-VE').format(abono.amount)}</span>
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
                                            <p><strong>Monto:</strong> <span class="amount">Bs.S ${Intl.NumberFormat('es-VE').format(abono.amount)}</span></p>
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

        {/* Modal de Nuevo Abono */}
        <Dialog open={nuevoAbonoModalOpen} onOpenChange={setNuevoAbonoModalOpen}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="border-b border-card-border px-6 pt-6 pb-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-success/10 text-success text-xl mr-2">
                  ➕
                </span>
                Agregar Nuevo Abono
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Monto del Abono</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  id="abono-amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Método de Pago</label>
                <select
                  className="w-full p-2 border border-input rounded-md bg-background"
                  id="abono-method"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="PAGO_MOVIL">Pago Móvil</option>
                  <option value="TARJETA">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notas (opcional)</label>
                <Input
                  placeholder="Notas del abono"
                  id="abono-notes"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setNuevoAbonoModalOpen(false)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    const amount = parseFloat((document.getElementById('abono-amount') as HTMLInputElement).value);
                    const paymentMethod = (document.getElementById('abono-method') as HTMLSelectElement).value;
                    const notes = (document.getElementById('abono-notes') as HTMLInputElement).value;

                    if (!amount || amount <= 0) {
                      toast.toast({ title: 'Error', description: 'Ingrese un monto válido' });
                      return;
                    }

                    try {
                      await apiService.credits.addInstallment(selectedApartado.id, {
                        amount,
                        method: paymentMethod,
                        notes: notes || null
                      });
                      toast.toast({ title: 'Abono Agregado', description: 'El abono se agregó correctamente' });
                      setNuevoAbonoModalOpen(false);
                      // Recargar abonos
                      const resp = await apiService.credits.getById(selectedApartado.id);
                      setSelectedApartado(resp.layaway || resp);
                    } catch (e: any) {
                      toast.toast({ title: 'Error', description: e?.message || 'No se pudo agregar el abono' });
                    }
                  }}
                >
                  Agregar Abono
                </Button>
              </div>
            </div>
            <DialogFooter />
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