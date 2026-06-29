import { z } from 'zod'

export type ScheduledTransactionFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface ScheduledTransaction {
  id: string
  user_id: string
  account_id: string
  account_name: string
  category_id: string | null
  category_name: string | null
  amount: number  // signed: negative = expense, positive = income
  payee: string | null
  memo: string | null
  frequency: ScheduledTransactionFrequency
  start_date: string
  end_date: string | null
  next_due_date: string
  is_active: boolean
}

export const createScheduledTransactionSchema = z.object({
  account_id: z.string().uuid('Cuenta inválida'),
  category_id: z.string().uuid().nullable().optional(),
  type: z.enum(['expense', 'income']),
  amount: z.number().positive('El monto debe ser mayor que cero').multipleOf(0.01, 'Máximo 2 decimales'),
  payee: z.string().max(255).nullable().optional(),
  memo: z.string().max(1000).nullable().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export const updateScheduledTransactionSchema = z.object({
  account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  type: z.enum(['expense', 'income']).optional(),
  amount: z.number().positive().multipleOf(0.01).optional(),
  payee: z.string().max(255).nullable().optional(),
  memo: z.string().max(1000).nullable().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  is_active: z.boolean().optional(),
})

export const confirmScheduledTransactionSchema = z.object({
  amount: z.number().positive().multipleOf(0.01).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export type CreateScheduledTransactionInput = z.infer<typeof createScheduledTransactionSchema>
export type UpdateScheduledTransactionInput = z.infer<typeof updateScheduledTransactionSchema>
export type ConfirmScheduledTransactionInput = z.infer<typeof confirmScheduledTransactionSchema>

export const FREQUENCY_LABELS: Record<ScheduledTransactionFrequency, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
}
