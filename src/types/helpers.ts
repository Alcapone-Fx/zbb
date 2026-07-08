import { z } from 'zod'

// ── Sinking Fund Groups ────────────────────────────────────────────────────

export interface SinkingFundGroup {
  id: string
  user_id: string
  name: string
  category_id: string | null
  category_name: string | null
  source_account_id: string | null
  source_account_name: string | null
  display_order: number
}

export const createSinkingFundGroupSchema = z.object({
  name: z.string().min(1).max(100),
  category_id: z.string().uuid().nullable().optional(),
  source_account_id: z.string().uuid().nullable().optional(),
})
export const updateSinkingFundGroupSchema = createSinkingFundGroupSchema.partial()
export type CreateSinkingFundGroupInput = z.infer<typeof createSinkingFundGroupSchema>
export type UpdateSinkingFundGroupInput = z.infer<typeof updateSinkingFundGroupSchema>

// ── Sinking Funds ──────────────────────────────────────────────────────────

export interface SinkingFund {
  id: string
  user_id: string
  group_id: string | null
  category_id: string | null
  category_name: string | null
  name: string
  target_amount: number
  target_date: string  // YYYY-MM-DD
  recurrence: 'one_time' | 'annual'
  recurrence_months: number | null
  is_paid: boolean
  last_paid_amount: number | null
  last_paid_date: string | null
  notes: string | null
}

export const createSinkingFundSchema = z.object({
  group_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(100),
  target_amount: z.number().positive(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  recurrence: z.enum(['one_time', 'annual']).default('one_time'),
  recurrence_months: z.number().int().positive().max(120).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const updateSinkingFundSchema = createSinkingFundSchema.partial().extend({
  is_paid: z.boolean().optional(),
})

export type CreateSinkingFundInput = z.infer<typeof createSinkingFundSchema>
export type UpdateSinkingFundInput = z.infer<typeof updateSinkingFundSchema>

export const paySchema = z.object({
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  record_transaction: z.boolean().default(true),
})

// ── Wishlist ───────────────────────────────────────────────────────────────

export type WishlistPriority = 'high' | 'medium' | 'low'

export interface WishlistItem {
  id: string
  user_id: string
  name: string
  estimated_cost: number | null
  priority: WishlistPriority | null
  notes: string | null
  created_at: string
  converted_to_fund_id: string | null
}

export const createWishlistItemSchema = z.object({
  name: z.string().min(1).max(100),
  estimated_cost: z.number().positive().nullable().optional(),
  priority: z.enum(['high', 'medium', 'low']).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const updateWishlistItemSchema = createWishlistItemSchema.partial().extend({
  converted_to_fund_id: z.string().uuid().nullable().optional(),
})

export type CreateWishlistItemInput = z.infer<typeof createWishlistItemSchema>
export type UpdateWishlistItemInput = z.infer<typeof updateWishlistItemSchema>

// ── Emergency Fund ─────────────────────────────────────────────────────────

export interface EmergencyFundAccount {
  id: string
  name: string
  type: string
  balance: number  // starting_balance + sum of transactions
}

export interface EmergencyFundData {
  total_balance: number
  min_expense: number | null
  accounts: EmergencyFundAccount[]
}

// ── User Settings ──────────────────────────────────────────────────────────

export type RecurringBudgetPattern = 'daily' | 'weekend'

export interface UserSettings {
  emergency_fund_min_expense: number | null
  grocery_category_id: string | null
  recurring_budget_category_id: string | null
  recurring_budget_pattern: RecurringBudgetPattern | null
}

export const updateUserSettingsSchema = z.object({
  emergency_fund_min_expense: z.number().positive().nullable().optional(),
  grocery_category_id: z.string().uuid().nullable().optional(),
  recurring_budget_category_id: z.string().uuid().nullable().optional(),
  recurring_budget_pattern: z.enum(['daily', 'weekend']).nullable().optional(),
})

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>
