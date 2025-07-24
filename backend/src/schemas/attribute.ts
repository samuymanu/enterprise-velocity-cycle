import { z } from 'zod';

export const createAttributeSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio'),
  type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'LIST', 'DATE']),
  unit: z.string().optional().nullable(),
  helpText: z.string().optional().nullable(),
  isGlobal: z.boolean().optional(),
  dependsOn: z.string().optional().nullable(),
  minValue: z.number().optional().nullable(),
  maxValue: z.number().optional().nullable(),
  regex: z.string().optional().nullable(),
  options: z.array(z.string()).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateAttributeSchema = createAttributeSchema.partial();

export const assignAttributeToCategoriesSchema = z.object({
  categoryIds: z.array(z.string().min(1)).min(1, 'Debes seleccionar al menos una categoría'),
  isRequired: z.boolean().optional(),
});
