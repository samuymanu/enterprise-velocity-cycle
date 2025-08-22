import { z } from 'zod';

export const createCustomerSchema = z.object({
  email: z.string().email('Email inválido').max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().min(7).max(20).optional(),
  address: z.string().max(200).optional(),
  isActive: z.boolean().optional()
});

export const updateCustomerSchema = createCustomerSchema.partial();
