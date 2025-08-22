import React from 'react';
import { useToasts } from '@/stores/notificationStore';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Componente individual para cada toast
const ToastItem: React.FC<{
  toast: any;
  onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
  const { id, type, title, message, action, dismissible = true } = toast;

  // Iconos por tipo
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />
  };

  // Estilos por tipo
  const typeStyles = {
    success: 'border-green-200 bg-green-50 text-green-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900'
  };

  return (
    <div
      className={cn(
        "relative flex w-full max-w-md items-start space-x-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out",
        typeStyles[type],
        "animate-in slide-in-from-right duration-300"
      )}
      role="alert"
    >
      {/* Icono */}
      <div className="flex-shrink-0">
        {icons[type]}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium">{title}</h4>
            {message && (
              <p className="mt-1 text-sm opacity-90">{message}</p>
            )}
          </div>

          {/* Botón de cerrar */}
          {dismissible && (
            <button
              onClick={() => onRemove(id)}
              className="ml-2 inline-flex rounded-md p-1.5 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Acción adicional */}
        {action && (
          <div className="mt-3">
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
  );
};

// Componente principal de toasts
export const NotificationToasts: React.FC = () => {
  const { toasts, removeToast } = useToasts();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-label="Notificaciones"
      className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
};

export default NotificationToasts;
