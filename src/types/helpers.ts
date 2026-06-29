import { z } from 'zod'

// ── Sinking Funds ──────────────────────────────────────────────────────────

export interface SinkingFund {
  id: string
  user_id: string
  category_id: string
  category_name: string
  name: string
  target_amount: number
  target_date: string  // YYYY-MM-DD
  notes: string | null
}

export const createSinkingFundSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  target_amount: z.number().positive(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  notes: z.string().max(500).nullable().optional(),
})

export const updateSinkingFundSchema = createSinkingFundSchema.partial()

export type CreateSinkingFundInput = z.infer<typeof createSinkingFundSchema>
export type UpdateSinkingFundInput = z.infer<typeof updateSinkingFundSchema>

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
}

export const createWishlistItemSchema = z.object({
  name: z.string().min(1).max(100),
  estimated_cost: z.number().positive().nullable().optional(),
  priority: z.enum(['high', 'medium', 'low']).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const updateWishlistItemSchema = createWishlistItemSchema.partial()

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

export const updateUserSettingsSchema = z.object({
  emergency_fund_min_expense: z.number().positive().nullable().optional(),
})

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>
