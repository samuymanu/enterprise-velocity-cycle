// services/specialPaymentsService.ts
import { apiService } from '@/lib/api';
import { ApartadoData, CreditoData, SpecialPaymentResult } from '@/types/specialPayments';

export class SpecialPaymentsService {
  // Registrar un nuevo apartado en la base de datos
  static async createApartado(apartadoData: ApartadoData): Promise<SpecialPaymentResult> {
    try {
      console.log('📦 SpecialPaymentsService - Creating apartado:', apartadoData);

      // Usar el endpoint real del backend
      const response = await apiService.credits.create(apartadoData);
      console.log('📥 SpecialPaymentsService - Response from backend:', response);

      if (response.success) {
        return {
          success: true,
          paymentData: response.layaway || response.data,
          apartadoId: response.layaway?.id || response.data?.id,
          message: 'Apartado registrado exitosamente'
        };
      } else {
        throw new Error(response.error || 'Error al crear apartado');
      }
    } catch (error) {
      console.error('❌ Error creating apartado:', error);
      return {
        success: false,
        paymentData: apartadoData,
        message: 'Error al registrar apartado'
      };
    }
  }

  // Registrar un nuevo crédito en la base de datos
  static async createCredito(creditoData: CreditoData): Promise<SpecialPaymentResult> {
    try {
      console.log('💳 Creating credito:', creditoData);

      // TODO: Implementar endpoint en el backend
      // const response = await apiService.creditos.create(creditoData);

      // Simulación de respuesta hasta que se implemente el backend
      const mockResponse = {
        id: `credito_${Date.now()}`,
        ...creditoData,
        createdAt: new Date(),
        status: creditoData.initialPayment === 0 ? 'unpaid' : 'partial'
      };

      return {
        success: true,
        paymentData: mockResponse,
        creditoId: mockResponse.id,
        message: 'Crédito registrado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error creating credito:', error);
      return {
        success: false,
        paymentData: creditoData,
        message: 'Error al registrar crédito'
      };
    }
  }

  // Validar reglas de negocio para apartados
  static validateApartadoRules(initial: number, total: number, dueDate: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (initial < 10) {
      errors.push('Pago inicial mínimo $10');
    }

    if (total < initial) {
      errors.push('El total no puede ser menor al inicial');
    }

    const dueDateObj = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDateObj < today) {
      errors.push('La fecha de vencimiento no puede ser en el pasado');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validar reglas de negocio para créditos
  static validateCreditoRules(amount: number, total: number, dueDate: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (amount < 0) {
      errors.push('El monto no puede ser negativo');
    }

    if (amount > total) {
      errors.push('El pago no puede ser mayor al total');
    }

    const dueDateObj = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDateObj < today) {
      errors.push('La fecha de vencimiento no puede ser en el pasado');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
