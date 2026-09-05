import { z } from 'zod';

export const createFinancialEventSchema = z.object({
  description: z.string().min(1),
  type: z.enum(['income', 'expense', 'transfer', 'investment', 'redemption', 'adjustment']),
  status: z.enum(['draft', 'planned', 'confirmed', 'paid', 'reconciled', 'archived']).default('planned'),
  date: z.string().min(10),
  competence: z.string().min(7).optional(),
  amount: z.number().finite().refine((value) => value !== 0, 'O valor não pode ser zero.'),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  notes: z.string().optional()
});

export const updateFinancialEventSchema = createFinancialEventSchema.partial();
