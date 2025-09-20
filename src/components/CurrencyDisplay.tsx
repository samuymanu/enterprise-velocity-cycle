// components/CurrencyDisplay.tsx
import React from 'react';
import { useExchangeRates } from '../hooks/useExchangeRates';

interface CurrencyDisplayProps {
  amount: number; // Monto en USD (precio del inventario) o BS (dependiendo del contexto)
  showBoth?: boolean; // Mostrar ambas monedas o solo la principal
  primaryCurrency?: 'BS' | 'USD'; // Moneda principal: USD para precios de inventario, BS para conversiones
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente para mostrar precios con conversión de monedas
 *
 * Lógica del negocio:
 * - USD: Precio original del producto en inventario
 * - BS: Conversión usando tasa oficial del BCV
 *
 * Por defecto muestra USD primero (precio del inventario) con conversión a BS
 */

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  showBoth = true,
  primaryCurrency = 'USD', // Por defecto muestra USD primero (precio del inventario)
  className = '',
  size = 'md'
}) => {
  const { rates } = useExchangeRates();

  // Debug: mostrar valores de entrada
  console.log('CurrencyDisplay - Props:', { amount, primaryCurrency, showBoth });

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  if (!showBoth) {
    const displayValue = primaryCurrency === 'USD'
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)
      : new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 }).format(amount);
    console.log('CurrencyDisplay - Display único:', displayValue);
    return (
      <span className={`${sizeClasses[size]} font-semibold ${className}`}>
        {displayValue}
      </span>
    );
  }

  // Mostrar moneda principal primero, luego la conversión
  if (primaryCurrency === 'USD') {
    const usdDisplay = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
    const bsDisplay = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 }).format(amount * rates.bcv);
    console.log('CurrencyDisplay - USD primary:', { usdDisplay, bsDisplay, usdToBsAmount: amount * rates.bcv });
    return (
      <div className={`flex flex-col items-end ${className} min-w-0`}>
        <span className={`${sizeClasses[size]} font-bold text-primary leading-tight block`}>
          {usdDisplay}
        </span>
        <span className="text-xs text-muted-foreground leading-tight mt-1 block">
          ≈ {bsDisplay} <span className="text-blue-600 dark:text-blue-400">(BCV)</span>
        </span>
      </div>
    );
  }

  // Mostrar BS primero con conversión a USD (precio original del inventario)
  const bsDisplay = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 }).format(amount);
  const usdDisplay = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount / rates.bcv);
  console.log('CurrencyDisplay - BS primary:', { bsDisplay, usdDisplay, bsToUsdAmount: amount / rates.bcv });
  return (
    <div className={`flex flex-col items-end ${className} min-w-0`}>
      <span className={`${sizeClasses[size]} font-bold text-primary leading-tight block`}>
        {bsDisplay}
      </span>
      <span className="text-xs text-muted-foreground leading-tight mt-1 block">
        ≈ {usdDisplay} <span className="text-green-600 dark:text-green-400">(Inventario)</span>
      </span>
    </div>
  );
};