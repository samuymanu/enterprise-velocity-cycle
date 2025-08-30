import { useState, useEffect } from 'react';

export interface ExchangeRates {
  bcv: number;
  parallel: number;
  lastUpdated: string;
}

const DEFAULT_RATES: ExchangeRates = {
  bcv: 36,
  parallel: 36.5,
  lastUpdated: new Date().toISOString()
};

const STORAGE_KEY = 'app:exchangeRates';

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validar que los datos sean correctos
        if (parsed.bcv && parsed.parallel && parsed.lastUpdated) {
          return {
            bcv: Number(parsed.bcv),
            parallel: Number(parsed.parallel),
            lastUpdated: parsed.lastUpdated
          };
        }
      }
    } catch (error) {
      console.warn('Error loading exchange rates from localStorage:', error);
    }
    return DEFAULT_RATES;
  });

  const [isLoading, setIsLoading] = useState(false);

  const updateRates = (newRates: Partial<ExchangeRates>) => {
    const updatedRates = {
      ...rates,
      ...newRates,
      lastUpdated: new Date().toISOString()
    };
    setRates(updatedRates);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRates));
    } catch (error) {
      console.error('Error saving exchange rates to localStorage:', error);
    }
  };

  const updateBcvRate = (bcv: number) => {
    updateRates({ bcv });
  };

  const updateParallelRate = (parallel: number) => {
    updateRates({ parallel });
  };

  const refreshRates = async () => {
    setIsLoading(true);
    try {
      // Obtener tasa BCV oficial
      const bcvResponse = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      let bcvRate = rates.bcv; // mantener valor actual como fallback

      if (bcvResponse.ok) {
        const bcvData = await bcvResponse.json();
        if (bcvData && bcvData.promedio) {
          bcvRate = bcvData.promedio;
        }
      }

      // Obtener tasa paralela
      const parallelResponse = await fetch('https://ve.dolarapi.com/v1/dolares/paralelo');
      let parallelRate = rates.parallel; // mantener valor actual como fallback

      if (parallelResponse.ok) {
        const parallelData = await parallelResponse.json();
        if (parallelData && parallelData.promedio) {
          parallelRate = parallelData.promedio;
        }
      }

      // Actualizar ambas tasas
      updateRates({
        bcv: bcvRate,
        parallel: parallelRate,
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.warn('Error fetching exchange rates from external API:', error);
      // Fallback: solo actualizar la fecha de última actualización
      updateRates({ lastUpdated: new Date().toISOString() });
    } finally {
      setIsLoading(false);
    }
  };

  const getBcvRate = () => rates.bcv;

  return {
    rates,
    isLoading,
    updateRates,
    updateBcvRate,
    updateParallelRate,
    refreshRates,
    getBcvRate
  };
}
