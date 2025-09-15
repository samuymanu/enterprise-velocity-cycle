// types/specialPayments.ts
export interface ApartadoData {
  customerId: string;
  totalAmount: number;
  initialPayment: number;
  remainingAmount: number;
  dueDate: string;
  paymentMethod: 'zelle' | 'cash-usd';
  status: 'active' | 'completed' | 'cancelled';
  cartItems: any[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreditoData {
  customerId: string;
  totalAmount: number;
  initialPayment: number;
  remainingAmount: number;
  dueDate: string;
  status: 'unpaid' | 'partial' | 'paid';
  cartItems: any[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentValidationResult {
  isValid: boolean;
  message: string;
  errors: string[];
}

export interface SpecialPaymentResult {
  success: boolean;
  paymentData: any;
  apartadoId?: string;
  creditoId?: string;
  message: string;
}
