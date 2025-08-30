import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { setApiBaseUrl } from '@/lib/api';
import { useExchangeRates } from '@/hooks/useExchangeRates';

export default function Settings() {
  const { rates, isLoading, updateBcvRate, updateParallelRate, refreshRates } = useExchangeRates();

  const [dbHost, setDbHost] = React.useState('localhost');
  const [dbPort, setDbPort] = React.useState('5432');
  const [dbName, setDbName] = React.useState('bicicentro_erp');
  const [dbUser, setDbUser] = React.useState('postgres');
  const [dbPass, setDbPass] = React.useState('');
  const [serverUrl, setServerUrl] = React.useState<string>(() => {
    try {
      return localStorage.getItem('app:apiUrl') || '';
    } catch (e) {
      return '';
    }
  });

  const [autoBackup, setAutoBackup] = React.useState(true);
  const [notifications, setNotifications] = React.useState(true);
  const [multiuser, setMultiuser] = React.useState(false);
  const [debugMode, setDebugMode] = React.useState(false);

  return (
    <AppLayout>
      <div className="w-full p-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Configuración</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Ajustes del sistema y parámetros de negocio</p>
        </div>

        <div className="space-y-6">
          {/* Tasas de cambio */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Tasas de Cambio del Bolívar</h2>
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-6">
                <label className="text-xs text-gray-500">Tasa Paralelo (USD/Bs)</label>
                <Input
                  value={rates.parallel}
                  onChange={(e) => updateParallelRate(Number(e.target.value) || 0)}
                  type="number"
                  step="0.01"
                />
              </div>
              <div className="col-span-6">
                <label className="text-xs text-gray-500">Tasa BCV (USD/Bs)</label>
                <Input
                  value={rates.bcv}
                  onChange={(e) => updateBcvRate(Number(e.target.value) || 0)}
                  type="number"
                  step="0.01"
                />
              </div>
              <div className="col-span-12 text-sm text-gray-500">
                Última actualización: {new Date(rates.lastUpdated).toLocaleString('es-VE')} — Tasas actuales: BCV: {rates.bcv} Bs. - Paralelo: {rates.parallel} Bs.
              </div>
              <div className="col-span-12 text-right">
                <Button onClick={refreshRates} disabled={isLoading}>
                  {isLoading ? 'Actualizando...' : 'Actualizar Tasas'}
                </Button>
              </div>
            </div>
          </div>

          {/* Conexión al servidor (PC Servidor en LAN) */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Conexión al Servidor</h2>
            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-12">
                <label className="text-xs text-gray-500">URL o IP del servidor (ej: 192.168.1.100:3001)</label>
                <Input value={serverUrl} onChange={(e) => setServerUrl((e.target as HTMLInputElement).value)} />
              </div>
              <div className="col-span-12 text-right">
                <Button onClick={async () => {
                  const raw = (serverUrl || '').trim();
                  if (!raw) {
                    // clear stored url
                    setApiBaseUrl(null);
                    alert('URL borrada. Se usará el valor por defecto.');
                    return;
                  }

                  // normalize for test: add scheme if missing and remove trailing slashes
                  let target = raw;
                  if (!/^https?:\/\//i.test(target)) target = 'http://' + target;
                  target = target.replace(/\/+$/, '');
                  const healthUrl = target.endsWith('/api') ? `${target}/health` : `${target}/api/health`;

                  try {
                    const resp = await fetch(healthUrl, { method: 'GET' });
                    if (resp.ok) {
                      setApiBaseUrl(raw);
                      alert('Conexión exitosa con el servidor. URL guardada.');
                    } else {
                      const text = await resp.text().catch(() => '');
                      alert(`El servidor respondió con estado ${resp.status}. Verifica la URL y que el backend esté en ejecución. ${text}`);
                    }
                  } catch (err: any) {
                    console.error('Error comprobando servidor', err);
                    alert('No se pudo conectar al servidor. Verifica la IP/puerto, la red y que el backend esté corriendo.');
                  }
                }}>Guardar Conexión</Button>
              </div>
            </div>
          </div>

          {/* Configuración DB */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Configuración de Base de Datos</h2>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6">
                <label className="text-xs text-gray-500">Servidor / IP</label>
                <Input value={dbHost} onChange={(e) => setDbHost((e.target as HTMLInputElement).value)} />
              </div>
              <div className="col-span-6">
                <label className="text-xs text-gray-500">Puerto</label>
                <Input value={dbPort} onChange={(e) => setDbPort((e.target as HTMLInputElement).value)} />
              </div>

              <div className="col-span-6">
                <label className="text-xs text-gray-500">Base de Datos</label>
                <Input value={dbName} onChange={(e) => setDbName((e.target as HTMLInputElement).value)} />
              </div>
              <div className="col-span-6">
                <label className="text-xs text-gray-500">Usuario</label>
                <Input value={dbUser} onChange={(e) => setDbUser((e.target as HTMLInputElement).value)} />
              </div>

              <div className="col-span-12">
                <label className="text-xs text-gray-500">Contraseña</label>
                <Input type="password" value={dbPass} onChange={(e) => setDbPass((e.target as HTMLInputElement).value)} />
              </div>

              <div className="col-span-12 flex items-center gap-3">
                <Button variant="outline" onClick={() => alert('Probando conexión...')}>Probar Conexión</Button>
                <Button onClick={() => alert('Guardado')}>Guardar Configuración</Button>
                <Button variant="ghost" onClick={() => alert('Restaurando valores por defecto')}>Restaurar Defaults</Button>
              </div>
            </div>
          </div>

          {/* Configuración del Sistema */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Configuración del Sistema</h2>
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-8 text-sm text-gray-600">Respaldos automáticos</div>
              <div className="col-span-4 text-right">
                <Switch checked={autoBackup} onCheckedChange={(v) => setAutoBackup(Boolean(v))} />
              </div>

              <div className="col-span-8 text-sm text-gray-600">Notificaciones</div>
              <div className="col-span-4 text-right">
                <Switch checked={notifications} onCheckedChange={(v) => setNotifications(Boolean(v))} />
              </div>

              <div className="col-span-8 text-sm text-gray-600">Modo Multiusuario</div>
              <div className="col-span-4 text-right">
                <Switch checked={multiuser} onCheckedChange={(v) => setMultiuser(Boolean(v))} />
              </div>

              <div className="col-span-8 text-sm text-gray-600">Modo Debug</div>
              <div className="col-span-4 text-right">
                <Switch checked={debugMode} onCheckedChange={(v) => setDebugMode(Boolean(v))} />
              </div>

              <div className="col-span-12 mt-3">
                <Button onClick={() => alert('Configuración guardada')}>Guardar Configuración</Button>
              </div>
            </div>
          </div>

          {/* Gestión de Usuarios */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Gestión de Usuarios</h2>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-sm font-medium">Usuario Actual</div>
                  <div className="text-xs text-gray-500">Juan Pérez — Administrador</div>
                </div>
              </div>
              <div className="col-span-6 flex flex-col gap-2">
                <Button variant="outline" onClick={() => alert('Gestionar usuarios')}>Gestionar Usuarios</Button>
                <Button variant="ghost" onClick={() => alert('Configurar roles')}>Configurar Roles</Button>
                <Button variant="secondary" onClick={() => alert('Permisos')}>Permisos del Sistema</Button>
              </div>
            </div>
          </div>

          {/* Gestión de Datos */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Gestión de Datos</h2>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => alert('Exportar datos')}>Exportar Datos</Button>
              <Button variant="outline" onClick={() => alert('Importar datos')}>Importar Datos</Button>
              <Button variant="outline" onClick={() => alert('Crear respaldo')}>Crear Respaldo</Button>
              <Button variant="ghost" onClick={() => alert('Restaurar sistema')}>Restaurar Sistema</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
