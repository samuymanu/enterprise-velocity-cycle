import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1, 'El nombre de la marca es requerido').max(50, 'Nombre demasiado largo')
});

export const updateBrandSchema = createBrandSchema.partial();
