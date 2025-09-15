// utils/currencyUtils.ts
import { useExchangeRates } from '../hooks/useExchangeRates';

export interface CurrencyConfig {
  usdToBs: number;
  lastUpdated: Date;
}

// Tasa de cambio por defecto (puede ser actualizada desde configuración)
const DEFAULT_EXCHANGE_RATE = 45.50; // 1 USD = 45.50 Bs.S

class CurrencyManager {
  private static instance: CurrencyManager;
  private exchangeRate: number = DEFAULT_EXCHANGE_RATE;
  private lastUpdated: Date = new Date();

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): CurrencyManager {
    if (!CurrencyManager.instance) {
      CurrencyManager.instance = new CurrencyManager();
    }
    return CurrencyManager.instance;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('app:exchangeRate');
      if (stored) {
        const config: CurrencyConfig = JSON.parse(stored);
        this.exchangeRate = config.usdToBs;
        this.lastUpdated = new Date(config.lastUpdated);
      }
    } catch (error) {
      console.warn('Error loading exchange rate from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      const config: CurrencyConfig = {
        usdToBs: this.exchangeRate,
        lastUpdated: this.lastUpdated
      };
      localStorage.setItem('app:exchangeRate', JSON.stringify(config));
    } catch (error) {
      console.warn('Error saving exchange rate to storage:', error);
    }
  }

  getExchangeRate(): number {
    return this.exchangeRate;
  }

  setExchangeRate(rate: number) {
    this.exchangeRate = rate;
    this.lastUpdated = new Date();
    this.saveToStorage();
  }

  getLastUpdated(): Date {
    return this.lastUpdated;
  }

  // Convertir de Bs.S a USD
  bsToUsd(amount: number): number {
    return amount / this.exchangeRate;
  }

  // Convertir de USD a Bs.S
  usdToBs(amount: number): number {
    return amount * this.exchangeRate;
  }

  // Formatear monto en Bs.S
  formatBs(amount: number): string {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2
    }).format(amount);
  }

  // Formatear monto en USD
  formatUsd(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  // Formatear ambos montos
  formatBoth(amountBs: number): { bs: string; usd: string } {
    return {
      bs: this.formatBs(amountBs),
      usd: this.formatUsd(this.bsToUsd(amountBs))
    };
  }
}

export const currencyManager = CurrencyManager.getInstance();

// Hook personalizado para usar la tasa de cambio
export const useCurrency = () => {
  const { rates, updateBcvRate } = useExchangeRates();

  // Usar la tasa BCV como tasa de cambio principal
  const exchangeRate = rates.bcv;
  const lastUpdated = rates.lastUpdated;

  // Debug: mostrar la tasa actual
  console.log('useCurrency - Tasa BCV actual:', exchangeRate, 'Fecha:', lastUpdated);

  return {
    exchangeRate,
    lastUpdated,
    bsToUsd: (amount: number) => {
      const result = amount / exchangeRate;
      console.log(`bsToUsd: ${amount} BS / ${exchangeRate} = ${result} USD`);
      return result;
    },
    usdToBs: (amount: number) => {
      const result = amount * exchangeRate;
      console.log(`usdToBs: ${amount} USD * ${exchangeRate} = ${result} BS`);
      return result;
    },
    formatBs: (amount: number) => new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2
    }).format(amount),
    formatUsd: (amount: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount),
    formatBoth: (amountBs: number) => ({
      bs: new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2
      }).format(amountBs),
      usd: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(amountBs / exchangeRate)
    }),
    setExchangeRate: (rate: number) => updateBcvRate(rate),
    // Información adicional sobre las tasas
    rates: {
      bcv: rates.bcv,
      parallel: rates.parallel,
      lastUpdated: rates.lastUpdated
    }
  };
};