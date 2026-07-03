import { z } from 'zod'

export const DASHBOARD_PERIODS = ['current_month', 'prev_month', 'quarter', 'year'] as const
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]

export const dashboardPeriodSchema = z
  .enum(DASHBOARD_PERIODS)
  .default('current_month')

export interface GroupBreakdownRow {
  group_id: string
  group_name: string
  amount: number
  pct: number
}

export interface IdealVsRealRow {
  group_id: string
  group_name: string
  ideal_pct: number
  real_pct: number
  real_amount: number
}

export interface DashboardData {
  period: DashboardPeriod
  net_income: number
  total_expense: number
  expense_pct: number
  savings: number
  savings_pct: number
  net_worth: number
  group_breakdown: GroupBreakdownRow[]
  ideal_vs_real: IdealVsRealRow[]
}
