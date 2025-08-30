import { PaymentMethodType } from './types';
import { CreditCard, DollarSign } from 'lucide-react';

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  const safeAmount = Number(amount) || 0;
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(safeAmount);
};

export const formatAmountWithCode = (amount: number, code: string): string => {
  return `${code} ${amount.toFixed(2)}`;
};

export const getPaymentIcon = (type: PaymentMethodType) => {
  const iconMap = {
    'cash-usd': DollarSign,
    'cash-ves': DollarSign,
    'card': CreditCard,
  };

  return iconMap[type] || DollarSign;
};

export const getPaymentLabel = (type: PaymentMethodType): string => {
  const labelMap = {
    'cash-usd': 'Efectivo USD',
    'cash-ves': 'Efectivo Bs.S',
    'card': 'Tarjeta',
  };

  return labelMap[type] || type;
};

export const getPaymentColor = (type: PaymentMethodType): string => {
  const colorMap = {
    'cash-usd': 'bg-green-100 text-green-800 border-green-200',
    'cash-ves': 'bg-blue-100 text-blue-800 border-blue-200',
    'card': 'bg-purple-100 text-purple-800 border-purple-200',
  };

  return colorMap[type] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const validateAmount = (amount: string, min = 0): { isValid: boolean; error?: string } => {
  const numAmount = parseFloat(amount);

  if (!amount.trim()) {
    return { isValid: false, error: 'Monto requerido' };
  }

  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Monto inválido' };
  }

  if (numAmount <= min) {
    return { isValid: false, error: `Monto debe ser mayor a ${min}` };
  }

  return { isValid: true };
};

export const validateReference = (reference: string): { isValid: boolean; error?: string } => {
  if (!reference.trim()) {
    return { isValid: false, error: 'Referencia requerida' };
  }

  if (reference.length < 3) {
    return { isValid: false, error: 'Referencia muy corta' };
  }

  return { isValid: true };
};

export const validateDate = (date: string): { isValid: boolean; error?: string } => {
  if (!date) {
    return { isValid: false, error: 'Fecha requerida' };
  }

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return { isValid: false, error: 'Fecha no puede ser en el pasado' };
  }

  return { isValid: true };
};
