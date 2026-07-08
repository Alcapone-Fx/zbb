export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function groceryCalc(dailyRate: number, year: number, month: number): number {
  return dailyRate * daysInMonth(year, month)
}

/**
 * Average of the last 3 *complete* months' absolute activity, used to suggest
 * a starting value from real history. Excludes the current (in-progress, and
 * therefore partial) month by default — including it would understate the
 * average early in the month. Returns null when there's no history yet.
 */
export function avgRecentActivity(
  months: { activity: number }[],
  excludeCurrentMonth = true
): number | null {
  const relevant = excludeCurrentMonth ? months.slice(0, -1) : months
  const last3 = relevant.slice(-3)
  if (last3.length === 0) return null
  return last3.reduce((sum, m) => sum + Math.abs(m.activity), 0) / last3.length
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

/**
 * Calendar-month gap between (fromYear, fromMonth) and (targetYear, targetMonth),
 * both 1-indexed. Minimum 1 — this month and next calendar month both collapse to 1.
 */
function monthsBetween(
  fromYear: number,
  fromMonth: number,
  targetYear: number,
  targetMonth: number
): number {
  const months = (targetYear - fromYear) * 12 + (targetMonth - fromMonth)
  return Math.max(1, months)
}

/** Returns months from today until targetDate (YYYY-MM-DD). Minimum 1. */
export function monthsRemaining(targetDate: string): number {
  const now = new Date()
  const [y, m] = targetDate.split('-').map(Number)
  return monthsBetween(now.getFullYear(), now.getMonth() + 1, y, m)
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

/** Advances a YYYY-MM-DD date by `months`, clamping day-of-month overflow (e.g. Feb 29 → Feb 28). */
export function advanceMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const totalMonths = y * 12 + (m - 1) + months
  const newYear = Math.floor(totalMonths / 12)
  const newMonth = (totalMonths % 12) + 1
  const daysInNewMonth = new Date(newYear, newMonth, 0).getDate()
  const clampedDay = Math.min(d, daysInNewMonth)
  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
}

export interface WaterfallFund {
  id: string
  target_amount: number
  target_date: string
}

/**
 * Splits a shared saved balance across funds, giving priority to whichever
 * target_date comes first (the soonest deadline claims savings before later ones).
 */
export function waterfallAllocate(
  funds: WaterfallFund[],
  available: number
): Record<string, number> {
  const sorted = [...funds].sort((a, b) => a.target_date.localeCompare(b.target_date))
  let remaining = available
  const allocations: Record<string, number> = {}
  for (const f of sorted) {
    const alloc = Math.min(remaining, f.target_amount)
    allocations[f.id] = alloc
    remaining -= alloc
  }
  return allocations
}

export interface YearSimFund {
  id: string
  name: string
  target_amount: number
  target_date: string
  recurrence: 'one_time' | 'annual'
  recurrence_months: number | null
}

export interface YearSimMonth {
  label: string
  startBalance: number
  suggested: number
  paidOut: number
  endBalance: number
  dueFundNames: string[]
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/**
 * Projects how a group's suggested monthly contribution and account balance
 * would evolve over the next `months` calendar months, assuming the user
 * deposits exactly the suggested amount each month and pays off funds
 * exactly on their target_date. Reuses waterfallAllocate/sinkingFundCalc —
 * the same functions driving the live per-fund/per-group display — so this
 * projection never drifts from the real app logic.
 */
export function simulateGroupYear(
  funds: YearSimFund[],
  startBalance: number,
  months = 12
): YearSimMonth[] {
  const now = new Date()
  let curYear = now.getFullYear()
  let curMonth = now.getMonth() + 1
  let balance = startBalance
  let active = funds.map((f) => {
    const [ty, tm] = f.target_date.split('-').map(Number)
    return { ...f, ty, tm }
  })

  const results: YearSimMonth[] = []

  for (let i = 0; i < months; i++) {
    const waterfallInput: WaterfallFund[] = active.map((f) => ({
      id: f.id,
      target_amount: f.target_amount,
      target_date: f.target_date,
    }))
    const allocations = waterfallAllocate(waterfallInput, balance)

    let suggested = 0
    for (const f of active) {
      const remaining = monthsBetween(curYear, curMonth, f.ty, f.tm)
      suggested += sinkingFundCalc(f.target_amount, allocations[f.id] ?? 0, remaining)
    }

    const startBalanceThisMonth = balance
    balance += suggested

    const due = active.filter((f) => f.ty === curYear && f.tm === curMonth)
    const paidOut = due.reduce((sum, f) => sum + f.target_amount, 0)
    balance -= paidOut

    results.push({
      label: `${MONTH_LABELS[curMonth - 1]}-${String(curYear).slice(2)}`,
      startBalance: startBalanceThisMonth,
      suggested,
      paidOut,
      endBalance: balance,
      dueFundNames: due.map((f) => f.name),
    })

    // Recurring funds advance to their next cycle instead of disappearing —
    // a fund due this month with recurrence_months=6 should reappear 6
    // months later if that still falls within the projected window.
    const dueIds = new Set(due.map((f) => f.id))
    active = active.reduce<typeof active>((acc, f) => {
      if (!dueIds.has(f.id)) {
        acc.push(f)
        return acc
      }
      if (f.recurrence === 'annual') {
        const newDate = advanceMonths(f.target_date, f.recurrence_months ?? 12)
        const [ty, tm] = newDate.split('-').map(Number)
        acc.push({ ...f, target_date: newDate, ty, tm })
      }
      return acc
    }, [])

    curMonth++
    if (curMonth > 12) {
      curMonth = 1
      curYear++
    }
  }

  return results
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
