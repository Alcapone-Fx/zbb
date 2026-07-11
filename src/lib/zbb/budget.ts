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
 * Sum of "reserved" money across categories — money assigned/rolled into an
 * envelope that hasn't been spent yet (POSITIVE Disponible only). Negative
 * Disponible (overspending) is not subtracted again here: the overspend
 * already reduced the real account balance, so it's reflected on the other
 * side of computeReadyToAssign instead.
 *
 * CC "Pago · X" mirror categories are always excluded, even though they're
 * ordinary categories otherwise. Their Disponible tracks "amount owed on
 * the card, not yet paid" — synthetic bookkeeping, not cash sitting in an
 * on-budget account. The cash effect of the debt is already captured by the
 * linked credit card account's own (negative) balance; including the mirror
 * category here would double-subtract the same debt.
 */
export function sumReservedDisponible(
  disponibles: Record<string, number>,
  categoryIds: string[],
  ccMirrorCategoryIds: Set<string>
): number {
  let sum = 0
  for (const catId of categoryIds) {
    if (ccMirrorCategoryIds.has(catId)) continue
    const d = disponibles[catId] ?? 0
    if (d > 0) sum += d
  }
  return sum
}

/**
 * "Dinero a Asignar" — cumulative, balance-based: total on-budget cash minus
 * what's still reserved in envelopes. Naturally cumulative (a live balance
 * snapshot, not a monthly income/allocation flow), so money that entered the
 * budget in any past month — e.g. an account's opening balance — is never
 * "lost": it stays visible here until it's actually assigned to a category.
 */
export function computeReadyToAssign(totalBalance: number, reservedDisponible: number): number {
  return totalBalance - reservedDisponible
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
