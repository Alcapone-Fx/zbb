export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function groceryCalc(dailyRate: number, year: number, month: number): number {
  return dailyRate * daysInMonth(year, month)
}

/** Counts the number of full weekends (Sat-Sun pairs) as Saturday count in the month. */
export function countWeekends(year: number, month: number): number {
  const days = daysInMonth(year, month)
  let saturdays = 0
  for (let d = 1; d <= days; d++) {
    if (new Date(year, month - 1, d).getDay() === 6) saturdays++
  }
  return saturdays
}

export function weekendPlannerCalc(
  available: number,
  fixedExpenses: number,
  weekendCount: number
): number {
  if (weekendCount === 0) return 0
  return Math.max(0, (available - fixedExpenses) / weekendCount)
}

/** Returns months from today until targetDate (YYYY-MM-DD). Minimum 1. */
export function monthsRemaining(targetDate: string): number {
  const now = new Date()
  const [y, m] = targetDate.split('-').map(Number)
  const months = (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1))
  return Math.max(1, months)
}

export function sinkingFundCalc(
  targetAmount: number,
  currentBalance: number,
  remaining: number
): number {
  const needed = targetAmount - currentBalance
  if (needed <= 0) return 0
  return needed / remaining
}

export interface EmergencyFundTierInfo {
  tier: 0 | 1 | 2 | 3
  coveredMonths: number
  color: 'red' | 'yellow' | 'light-green' | 'green'
}

export function emergencyFundTier(balance: number, minExpense: number): EmergencyFundTierInfo {
  if (minExpense <= 0) return { tier: 0, coveredMonths: 0, color: 'red' }
  const coveredMonths = balance / minExpense
  if (coveredMonths < 1) return { tier: 0, coveredMonths, color: 'red' }
  if (coveredMonths < 3) return { tier: 1, coveredMonths, color: 'yellow' }
  if (coveredMonths < 6) return { tier: 2, coveredMonths, color: 'light-green' }
  return { tier: 3, coveredMonths, color: 'green' }
}
