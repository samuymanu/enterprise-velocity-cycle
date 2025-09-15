// components/CurrencySettings.tsx
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { useCurrency } from '../utils/currencyUtils';
import { useToast } from '../hooks/use-toast';

export const CurrencySettings: React.FC = () => {
  const { exchangeRate, lastUpdated, setExchangeRate } = useCurrency();
  const [newRate, setNewRate] = useState(exchangeRate.toString());
  const toast = useToast();

  const handleSaveRate = () => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      toast.toast({
        title: 'Error',
        description: 'Por favor ingrese una tasa de cambio válida',
        variant: 'destructive'
      });
      return;
    }

    setExchangeRate(rate);
    toast.toast({
      title: 'Tasa actualizada',
      description: `Nueva tasa de cambio: 1 USD = ${rate} Bs.S`,
    });
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Configuración de Moneda</h3>

      <div className="space-y-4">
        <div>
          <Label htmlFor="exchange-rate">Tasa de cambio (1 USD = X Bs.S)</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="exchange-rate"
              type="number"
              step="0.01"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="45.50"
              className="flex-1"
            />
            <Button onClick={handleSaveRate}>
              Actualizar
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Tasa actual: <strong>1 USD = {exchangeRate} Bs.S</strong></p>
          <p>Última actualización: {lastUpdated.toLocaleString()}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 <strong>Nota:</strong> La tasa de cambio se guarda automáticamente en el navegador
            y se aplica a todos los precios mostrados en la aplicación.
          </p>
        </div>
      </div>
    </Card>
  );
};