import { z } from 'zod'

export const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'Formato de mes inválido (YYYY-MM)')

export const upsertAllocationSchema = z.object({
  category_id: z.string().uuid(),
  month: monthSchema,
  assigned_amount: z.number().min(0),
})

export type UpsertAllocationInput = z.infer<typeof upsertAllocationSchema>

export interface BudgetCategoryRow {
  id: string
  name: string
  is_system: boolean
  display_order: number
  assigned: number
  activity: number    // signed sum of tx amounts (negative = net spending)
  disponible: number  // assigned + rollover + activity
}

export interface BudgetGroupRow {
  id: string
  name: string
  is_system: boolean
  ideal_percentage: number | null
  display_order: number
  categories: BudgetCategoryRow[]
}

export interface BudgetMonthData {
  month: string
  dineroAAsignar: number
  primaryAccountAvailable: number | null
  groups: BudgetGroupRow[]
}

export interface TrendMonth {
  month: string
  assigned: number
  activity: number
}

export interface TrendsData {
  categoryId: string
  categoryName: string
  months: TrendMonth[]
  avgActivity: number   // avg of last 3 months (absolute activity)
  peakMonth: string | null
}
