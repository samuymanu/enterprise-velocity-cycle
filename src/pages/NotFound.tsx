import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useNotify } from "@/stores/notificationStore";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotify();

  useEffect(() => {
    // Registrar el error 404 en el sistema de notificaciones
    notify.error(
      `Ruta no encontrada: ${location.pathname}`,
      `Se intentó acceder a una página que no existe: ${location.pathname}`,
      {
        category: 'system',
        action: {
          label: 'Ir al inicio',
          onClick: () => navigate('/')
        }
      }
    );

    // También mantener el log en consola para desarrollo
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname, notify, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Página no encontrada
          </h2>
          <p className="text-gray-600 mb-6">
            La página que buscas no existe o ha sido movida.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-700">
              <strong>Ruta solicitada:</strong> {location.pathname}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Ir al inicio
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver atrás
          </Button>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>¿Necesitas ayuda? El error ha sido registrado automáticamente.</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
