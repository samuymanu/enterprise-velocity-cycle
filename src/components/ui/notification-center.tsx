import React, { useState } from 'react';
import { useNotifications } from '@/stores/notificationStore';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  Trash2,
  CheckCheck,
  Filter,
  Download,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// Componente para mostrar una notificación individual
const NotificationItem: React.FC<{
  notification: any;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ notification, onMarkAsRead, onRemove }) => {
  const { id, type, title, message, action, isRead, timestamp, category } = notification;

  // Iconos por tipo
  const icons = {
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    info: <Info className="h-4 w-4 text-blue-500" />
  };

  // Formatear timestamp
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `hace ${minutes}m`;
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${days}d`;
  };

  return (
    <div
      className={cn(
        "flex items-start space-x-3 p-4 hover:bg-gray-50 transition-colors",
        !isRead && "bg-blue-50 border-l-4 border-l-blue-500"
      )}
    >
      {/* Icono y estado */}
      <div className="flex-shrink-0 flex flex-col items-center space-y-1">
        {icons[type]}
        {!isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className={cn(
                "text-sm",
                !isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"
              )}>
                {title}
              </h4>
              {category && (
                <Badge variant="secondary" className="text-xs">
                  {category}
                </Badge>
              )}
            </div>
            
            {message && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {message}
              </p>
            )}
            
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {formatTime(new Date(timestamp))}
              </span>
              
              <div className="flex items-center space-x-1">
                {!isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkAsRead(id)}
                    className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    Marcar como leída
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(id)}
                  className="h-auto p-1 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Acción */}
            {action && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={action.onClick}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Botón del centro de notificaciones en el header
export const NotificationButton: React.FC = () => {
  const { unreadCount, isOpen, toggleCenter } = useNotifications();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleCenter}
      className="relative"
      aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} sin leer)` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

// Centro de notificaciones completo
export const NotificationCenter: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    isOpen, 
    toggleCenter,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    getByCategory,
    exportNotifications
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'api' | 'inventory' | 'user' | 'system'>('all');

  // Filtrar notificaciones
  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications;
    
    switch (filter) {
      case 'unread':
        filtered = notifications.filter(n => !n.isRead);
        break;
      case 'api':
      case 'inventory':
      case 'user':
      case 'system':
        filtered = getByCategory(filter);
        break;
      default:
        break;
    }
    
    return filtered;
  }, [notifications, filter, getByCategory]);

  // Manejar exportación
  const handleExport = () => {
    const data = exportNotifications();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notificaciones_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={isOpen} onOpenChange={toggleCenter}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Centro de Notificaciones</span>
            {unreadCount > 0 && (
              <Badge variant="secondary">
                {unreadCount} sin leer
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Gestiona todas tus notificaciones del sistema
          </SheetDescription>
        </SheetHeader>

        {/* Controles */}
        <div className="flex items-center justify-between py-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {filter === 'all' ? 'Todas' : 
                 filter === 'unread' ? 'Sin leer' :
                 filter === 'api' ? 'API' :
                 filter === 'inventory' ? 'Inventario' :
                 filter === 'user' ? 'Usuario' : 'Sistema'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilter('all')}>
                Todas las notificaciones
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('unread')}>
                Sin leer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilter('api')}>
                API
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('inventory')}>
                Inventario
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('user')}>
                Usuario
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('system')}>
                Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={markAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Marcar todas como leídas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar notificaciones
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={clearNotifications}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar todas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Separator />

        {/* Lista de notificaciones */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Bell className="h-8 w-8 mb-2" />
              <p className="text-sm">
                {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onRemove={removeNotification}
                  />
                  {index < filteredNotifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;
