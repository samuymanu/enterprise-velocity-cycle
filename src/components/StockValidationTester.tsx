import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Componente de prueba para validar la funcionalidad de stock en tiempo real
 * Se puede agregar temporalmente al POS para testing
 */
export function StockValidationTester() {
  const [testResults, setTestResults] = React.useState<string[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runStockTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    addLog('🧪 Iniciando pruebas de validación de stock...');

    try {
      // Importar dinámicamente las funciones de prueba
      const { testStockValidation, simulateProductSelection } = await import('@/test-stock-validation');

      // Ejecutar pruebas principales
      await testStockValidation();

      // Simular selección de producto
      const products = (window as any).useInventoryStore?.getState?.().products || [];
      if (products.length > 0) {
        const testProduct = products[0];
        addLog(`🛒 Probando selección de producto: ${testProduct.name}`);
        await simulateProductSelection(testProduct.id, 1);
      }

      addLog('✅ Todas las pruebas completadas');

    } catch (error) {
      addLog(`❌ Error en pruebas: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Tester de Validación de Stock
        </CardTitle>
        <CardDescription>
          Herramienta para probar la funcionalidad de validación de stock en tiempo real
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={runStockTests}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? 'Ejecutando pruebas...' : 'Ejecutar Pruebas de Stock'}
          </Button>
          <Button
            onClick={clearLogs}
            variant="outline"
          >
            Limpiar Logs
          </Button>
        </div>

        <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-gray-500 italic">
              Los resultados de las pruebas aparecerán aquí...
            </div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="mb-1">
                {result}
              </div>
            ))
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>Instrucciones:</strong></div>
          <div>• Las pruebas verifican la carga del inventory store</div>
          <div>• Valida la obtención de productos por ID</div>
          <div>• Simula selección de productos con validación de stock</div>
          <div>• Muestra resumen de productos con stock bajo</div>
        </div>
      </CardContent>
    </Card>
  );
}