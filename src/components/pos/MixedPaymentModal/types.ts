export interface CartItem {
  id: string;
  name: string;
  sku?: string;
  brand?: string;
  quantity: number;
  price?: number;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  phone?: string;
  email?: string;
}

export interface PaymentDetails {
  reference?: string;
  wallet?: string;
  customerId?: string;
  totalAmount?: number;
  dueDate?: string;
  remainingAmount?: number;
  holderName?: string;
  holderPhone?: string;
}

export type PaymentMethodType = 'cash-usd' | 'cash-ves' | 'card';

export interface PaymentMethod {
  type: PaymentMethodType;
  amount: number;
  details?: PaymentDetails;
}

export interface PaymentData {
  cartItems: CartItem[];
  total: number;
  payments: PaymentMethod[];
  paymentMethod: string;
  customerId?: string;
}

export interface MixedPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  cartItems: CartItem[];
  onPaymentComplete: (paymentData: PaymentData) => void;
}

export interface PaymentFormState {
  // Traditional payments
  cashUSDAmount: string;
  cashVESAmount: string;
  cardAmount: string;
}

export interface ValidationError {
  field: string;
  message: string;
}
