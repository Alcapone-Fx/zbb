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

/**
 * Sum of reserved (positive Disponible) money in ordinary categories only —
 * excludes sinking funds and CC "Pago · X" categories.
 *
 * Used only for the liquidity line under "Disponible para ahorrar/invertir"
 * (`/accounts`), alongside `sumSinkingFundShortfall`: unlike the global
 * `dineroAAsignar` (deliberately never scoped to one account — see
 * docs/CONVENTIONS.md 2026-08-02), this feeds a qualifier — "how much of it
 * can I move out of my primary account today". There is no account
 * attribution for an ordinary category (`budget_allocations` has no
 * `account_id`), so its reserved money is assumed to sit wherever the user's
 * operating cash already is — the primary account. `is_system` excludes
 * "Pago · X" categories the same way `ccMirrorCategoryIds` does for the
 * global sum — every `is_system` category today is a CC mirror.
 */
export function sumReservedExcludingSinkingFunds(
  categories: { disponible: number; is_reserve_fund: boolean; is_system: boolean }[]
): number {
  return categories.reduce((sum, c) => {
    if (c.is_system || c.is_reserve_fund) return sum
    return c.disponible > 0 ? sum + c.disponible : sum
  }, 0)
}

/**
 * Money reserved for sinking-fund categories that hasn't actually reached its
 * destination account yet, summed across every sinking-fund source account.
 *
 * Assigning money to a sinking-fund category only records intent
 * (`budget_allocations.assigned_amount`) — it does not move cash. Unlike an
 * ordinary category, a sinking fund DOES carry account attribution
 * (`sinking_fund_groups.source_account_id`), so the portion of its Disponible
 * already covered by that account's real balance is verifiably elsewhere and
 * must NOT reduce primary-account liquidity — only counting it once (via the
 * account's own balance, already excluded by `sumOnBudgetDebt`/whatever else
 * nets non-primary balances out) would double-subtract it. Only the shortfall
 * (assigned more than has actually arrived) still needs to come from
 * wherever the user's operating cash is, presumed the primary account, same
 * as an ordinary category. See docs/CONVENTIONS.md 2026-08-25.
 *
 * Reserved money is summed BY ACCOUNT, not by category, before comparing
 * against that account's balance — two sinking funds sharing one destination
 * account must not each get "credit" for the same dollars sitting there. A
 * sinking-fund category with no resolvable group/account (shouldn't happen in
 * practice) is skipped here; callers that want a safe fallback should also
 * run it through `sumReservedExcludingSinkingFunds` with `is_reserve_fund`
 * left true only for categories actually covered by a group.
 */
export function sumSinkingFundShortfall(
  categories: { id: string; disponible: number }[],
  sinkingFundGroups: { category_id: string | null; source_account_id: string | null }[],
  accountBalanceById: Record<string, number>
): number {
  const disponibleByCategory = new Map(categories.map((c) => [c.id, c.disponible]))
  const reservedByAccount = new Map<string, number>()

  for (const group of sinkingFundGroups) {
    if (!group.category_id || !group.source_account_id) continue
    const disponible = disponibleByCategory.get(group.category_id)
    if (disponible === undefined || disponible <= 0) continue
    reservedByAccount.set(
      group.source_account_id,
      (reservedByAccount.get(group.source_account_id) ?? 0) + disponible
    )
  }

  let shortfall = 0
  for (const [accountId, reserved] of reservedByAccount) {
    const balance = accountBalanceById[accountId] ?? 0
    shortfall += Math.max(0, reserved - balance)
  }
  return shortfall
}

/** Returns the YYYY-MM of the month before a given YYYY-MM. */
export function getPrevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Every month from `from` through `to` inclusive, as YYYY-MM. Returns [] when
 * `from` is after `to`.
 *
 * The rollover chain must be walked over a CONTIGUOUS range, not just the
 * months that happen to have a `budget_months` row. A row is only created when
 * the user opens a month or assigns money in it, so skipping a month leaves a
 * gap — and computeDisponibles never visits it, silently dropping that month's
 * activity from every category's Disponible.
 */
export function monthRange(from: string, to: string): string[] {
  const [fromYear, fromMonth] = from.split('-').map(Number)
  const [toYear, toMonth] = to.split('-').map(Number)
  const months: string[] = []
  let year = fromYear
  let month = fromMonth

  while (year < toYear || (year === toYear && month <= toMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return months
}

/** Returns the last date of a YYYY-MM month as YYYY-MM-DD. */
export function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${month}-${String(lastDay).padStart(2, '0')}`
}
