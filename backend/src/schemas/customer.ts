import { z } from 'zod';

export const createCustomerSchema = z.object({
  documentType: z.enum(['CI', 'PASSPORT', 'RIF']).default('CI'),
  documentNumber: z.string().min(1, 'Número de documento es requerido').max(20),
  firstName: z.string().min(1, 'Nombre es requerido').max(50).optional(),
  lastName: z.string().min(1, 'Apellido es requerido').max(50).optional(),
  companyName: z.string().max(100).optional(),
  customerType: z.enum(['INDIVIDUAL', 'COMPANY']).default('INDIVIDUAL'),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email('Email inválido').max(100).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  country: z.string().max(50).default('Venezuela'),
  isActive: z.boolean().default(true),
  notes: z.string().optional()
});

export const updateCustomerSchema = createCustomerSchema.partial();
