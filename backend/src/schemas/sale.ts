import { z } from 'zod';

export const createSaleSchema = z.object({
  customerId: z.string().uuid('ID de cliente inválido'),
  items: z.array(z.object({
    productId: z.string().uuid('ID de producto inválido'),
    quantity: z.number().int().min(1),
    price: z.number().min(0)
  })).min(1, 'Debe haber al menos un producto'),
  total: z.number().min(0),
  paymentMethod: z.string().min(1),
  date: z.string().optional()
});

export const updateSaleSchema = createSaleSchema.partial();
