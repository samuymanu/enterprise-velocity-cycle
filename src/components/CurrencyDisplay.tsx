// components/CurrencyDisplay.tsx
import React from 'react';
import { useCurrency } from '../utils/currencyUtils';

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
  const { formatBs, formatUsd, bsToUsd, usdToBs } = useCurrency();

  // Debug: mostrar valores de entrada
  console.log('CurrencyDisplay - Props:', { amount, primaryCurrency, showBoth });

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  if (!showBoth) {
    const displayValue = primaryCurrency === 'USD' ? formatUsd(amount) : formatBs(amount);
    console.log('CurrencyDisplay - Display único:', displayValue);
    return (
      <span className={`${sizeClasses[size]} font-semibold ${className}`}>
        {displayValue}
      </span>
    );
  }

  // Mostrar moneda principal primero, luego la conversión
  if (primaryCurrency === 'USD') {
    const usdDisplay = formatUsd(amount);
    const bsDisplay = formatBs(usdToBs(amount)); // Convertir USD a BS usando la tasa
    console.log('CurrencyDisplay - USD primary:', { usdDisplay, bsDisplay, usdToBsAmount: usdToBs(amount) });
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
  const bsDisplay = formatBs(amount);
  const usdDisplay = formatUsd(bsToUsd(amount)); // Convertir BS a USD usando la tasa
  console.log('CurrencyDisplay - BS primary:', { bsDisplay, usdDisplay, bsToUsdAmount: bsToUsd(amount) });
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