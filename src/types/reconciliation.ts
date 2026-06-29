import { z } from 'zod'

export interface ReconciliationRecord {
  id: string
  user_id: string
  account_id: string
  date: string
  bank_balance: number
  app_balance: number
  adjustment_amount: number
  adjustment_transaction_id: string | null
  created_at: string
}

export const createReconciliationSchema = z.object({
  account_id: z.string().uuid('Cuenta inválida'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  bank_balance: z.number().finite('Saldo bancario inválido'),
  category_id: z.string().uuid('Categoría inválida').nullable().optional(),
})

export type CreateReconciliationInput = z.infer<typeof createReconciliationSchema>
