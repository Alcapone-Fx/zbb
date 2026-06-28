import { z } from 'zod'

export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'cash'
  | 'investment'
  | 'liability'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  is_tracking_only: boolean
  is_archived: boolean
  starting_balance: number
  created_at: string
}

export interface AccountWithBalance extends Omit<Account, 'user_id'> {
  balance: number
}

export interface AccountsResponse {
  on_budget: AccountWithBalance[]
  off_budget: AccountWithBalance[]
  net_worth: number
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Cuenta Corriente',
  savings: 'Cuenta de Ahorro',
  credit_card: 'Tarjeta de Crédito',
  cash: 'Efectivo',
  investment: 'Inversiones',
  liability: 'Deuda / Préstamo',
}

export const TRACKING_ONLY_DEFAULTS: Record<AccountType, boolean> = {
  checking: false,
  savings: false,
  credit_card: false,
  cash: false,
  investment: true,
  liability: true,
}

export const createAccountSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres'),
  type: z.enum([
    'checking',
    'savings',
    'credit_card',
    'cash',
    'investment',
    'liability',
  ]),
  is_tracking_only: z.boolean().default(false),
  starting_balance: z.number().default(0),
})

export const updateAccountSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('rename'),
    name: z.string().min(1, 'El nombre es requerido').max(100),
  }),
  z.object({ action: z.literal('archive') }),
])

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
