import * as z from 'zod';

// --- Create Transaction ---

export const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  description: z.string().optional(),
  date: z.coerce.date(),
  receiptUrl: z.url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  categoryId: z.number().int().positive(),
});

// --- Update Transaction ---

export const updateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  type: z.enum(['income', 'expense']).optional(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  receiptUrl: z.url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  categoryId: z.number().int().positive().optional(),
});

// --- Types ---

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
