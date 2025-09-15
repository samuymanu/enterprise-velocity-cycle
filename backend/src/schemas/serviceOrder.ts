import { z } from 'zod';

// Validación personalizada para IDs (acepta tanto UUIDs como CUIDs)
const idSchema = z.string().min(1, 'ID es requerido').refine(
  (id) => {
    // Patrón para UUID v4
    const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    // Patrón para CUID (comienza con 'c' seguido de letras y números)
    const cuidPattern = /^c[a-zA-Z0-9]+$/;
    
    return uuidPattern.test(id) || cuidPattern.test(id);
  },
  {
    message: 'ID debe ser un UUID válido o un CUID válido'
  }
);

export const createServiceOrderSchema = z.object({
  customerId: idSchema,
  description: z.string().min(1),
  status: z.enum(['RECEIVED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED']).default('RECEIVED'),
  items: z.array(z.object({
    productId: idSchema,
    quantity: z.number().int().min(1)
  })).optional(),
  total: z.number().min(0).optional(),
  date: z.string().optional()
});

export const updateServiceOrderSchema = createServiceOrderSchema.partial();
