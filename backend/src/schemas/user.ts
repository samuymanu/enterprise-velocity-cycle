import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Email inválido').max(100),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'TECHNICIAN', 'CASHIER'])
});

export const updateUserSchema = createUserSchema.partial();
