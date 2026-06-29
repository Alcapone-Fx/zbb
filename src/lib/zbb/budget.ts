/**
 * Computes Disponible for each category across a chain of months.
 *
 * Disponible(M, C) = allocated(M, C) + rollover(M−1, C) + activity(M, C)
 *
 * activity is the signed sum of transaction amounts from the DB:
 *   negative = net spending (expenses), positive = net inflows (income, refunds).
 * rollover(M, C) = Disponible(M−1, C); base = 0 before the earliest month.
 */
export function computeDisponibles(
  sortedMonths: string[],
  allocations: Record<string, Record<string, number>>, // month -> catId -> assigned
  activities: Record<string, Record<string, number>>,  // month -> catId -> signed sum
  categoryIds: string[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  const rollover: Record<string, number> = {}

  for (const month of sortedMonths) {
    result[month] = {}
    const monthAllocs = allocations[month] ?? {}
    const monthActivity = activities[month] ?? {}

    for (const catId of categoryIds) {
      const assigned = monthAllocs[catId] ?? 0
      const activity = monthActivity[catId] ?? 0
      const prevRollover = rollover[catId] ?? 0
      result[month][catId] = assigned + prevRollover + activity
    }

    for (const catId of categoryIds) {
      rollover[catId] = result[month][catId]
    }
  }

  return result
}

/**
 * Computes "Dinero a Asignar" — the ready-to-assign balance for month M.
 *
 * = income(M, next_month=false)
 * + income(M−1, next_month=true)
 * − totalAllocated(M)
 * + negativeRolloverPrevMonth   [sum of negative Disponibles from M−1; itself ≤ 0]
 */
export function computeDineroAAsignar(params: {
  incomeThisMonth: number
  incomeLastMonthNextFlag: number
  totalAllocatedThisMonth: number
  negativeRolloverPrevMonth: number
}): number {
  return (
    params.incomeThisMonth +
    params.incomeLastMonthNextFlag -
    params.totalAllocatedThisMonth +
    params.negativeRolloverPrevMonth
  )
}

/** Returns the YYYY-MM of the month before a given YYYY-MM. */
export function getPrevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Returns the last date of a YYYY-MM month as YYYY-MM-DD. */
export function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${month}-${String(lastDay).padStart(2, '0')}`
}
