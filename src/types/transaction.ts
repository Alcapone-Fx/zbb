import { z } from 'zod'

export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'adjustment'
  | 'opening_balance'

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  amount: number
  date: string
  type: TransactionType
  payee: string | null
  memo: string | null
  tags: string[]
  is_cleared: boolean
  is_reconciled: boolean
  transfer_pair_id: string | null
  scheduled_transaction_id: string | null
  next_month: boolean
  created_at: string
}

export interface TransactionWithDetails {
  id: string
  account_id: string
  account_name: string
  category_id: string | null
  category_name: string | null
  category_group_name: string | null
  amount: number
  date: string
  type: TransactionType
  payee: string | null
  memo: string | null
  tags: string[]
  is_cleared: boolean
  is_reconciled: boolean
  transfer_pair_id: string | null
  next_month: boolean
  created_at: string
}

export const createTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  type: z.enum(['expense', 'income', 'transfer']),
  account_id: z.string().uuid('Cuenta inválida'),
  amount: z
    .number()
    .positive('El monto debe ser mayor que cero')
    .multipleOf(0.01, 'Máximo 2 decimales'),
  category_id: z.string().uuid().nullable().optional(),
  payee: z.string().max(255).nullable().optional(),
  memo: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().max(50)).default([]),
  next_month: z.boolean().default(false),
  transfer_to_account_id: z.string().uuid().optional(),
})

export const updateTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').optional(),
  amount: z
    .number()
    .positive('El monto debe ser mayor que cero')
    .multipleOf(0.01)
    .optional(),
  category_id: z.string().uuid().nullable().optional(),
  payee: z.string().max(255).nullable().optional(),
  memo: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().max(50)).optional(),
  next_month: z.boolean().optional(),
})

export const transactionFiltersSchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z
    .enum(['expense', 'income', 'transfer', 'adjustment', 'opening_balance'])
    .optional(),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  tag: z.string().max(50).optional(),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  adjustment: 'Ajuste',
  opening_balance: 'Saldo Inicial',
}
