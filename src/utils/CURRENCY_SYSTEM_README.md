// README - Sistema de Monedas
// ===========================

/*
SISTEMA DE CONVERSIÓN DE MONEDAS
=================================

Este sistema permite mostrar precios tanto en Bolívares Soberanos (Bs.S) como en Dólares Americanos (USD)
usando una tasa de cambio configurable.

COMPONENTES PRINCIPALES:
=======================

1. CurrencyManager (utils/currencyUtils.ts)
   - Gestiona la tasa de cambio
   - Guarda configuración en localStorage
   - Proporciona métodos de conversión

2. useCurrency Hook (utils/currencyUtils.ts)
   - Hook personalizado para acceder a funciones de moneda
   - Se usa en componentes que necesitan conversión

3. CurrencyDisplay Component (components/CurrencyDisplay.tsx)
   - Componente para mostrar montos con conversión automática
   - Props:
     - amount: número - Monto en Bs.S
     - showBoth: boolean - Mostrar ambas monedas (default: true)
     - primaryCurrency: 'BS' | 'USD' - Moneda principal (default: 'BS')
     - className: string - Clases CSS adicionales
     - size: 'sm' | 'md' | 'lg' - Tamaño del texto

4. CurrencySettings Component (components/CurrencySettings.tsx)
   - Interfaz para configurar la tasa de cambio
   - Guarda cambios automáticamente

USO EN COMPONENTES:
==================

// Importar el hook
import { useCurrency } from '../utils/currencyUtils';

// Usar en componente funcional
const { formatBs, formatUsd, bsToUsd, usdToBs } = useCurrency();

// Importar componente de display
import { CurrencyDisplay } from '../components/CurrencyDisplay';

// Usar en JSX
<CurrencyDisplay amount={1000} primaryCurrency="USD" />

CONFIGURACIÓN:
=============

La tasa de cambio por defecto es 45.50 Bs.S por USD.
Se puede cambiar desde:
1. Componente CurrencySettings
2. Llamando setExchangeRate() desde useCurrency hook
3. Directamente desde CurrencyManager.getInstance().setExchangeRate()

EJEMPLOS DE USO:
===============

// Mostrar precio en USD primero
<CurrencyDisplay amount={1000} primaryCurrency="USD" />

// Mostrar solo en Bs.S
<CurrencyDisplay amount={1000} showBoth={false} />

// Usar hook para conversiones manuales
const { bsToUsd, formatUsd } = useCurrency();
const usdAmount = bsToUsd(1000);
console.log(formatUsd(usdAmount)); // "$22.05"

NOTAS IMPORTANTES:
=================

- Los montos siempre se pasan en Bs.S al componente
- La conversión se hace automáticamente usando la tasa configurada
- Los cambios en la tasa se guardan automáticamente en localStorage
- El sistema funciona sin conexión a internet
*/