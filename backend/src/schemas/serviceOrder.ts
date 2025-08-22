import { z } from 'zod';

export const createServiceOrderSchema = z.object({
  customerId: z.string().uuid('ID de cliente inválido'),
  description: z.string().min(1),
  status: z.enum(['RECEIVED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED']).default('RECEIVED'),
  items: z.array(z.object({
    productId: z.string().uuid('ID de producto inválido'),
    quantity: z.number().int().min(1)
  })).optional(),
  total: z.number().min(0).optional(),
  date: z.string().optional()
});

export const updateServiceOrderSchema = createServiceOrderSchema.partial();
