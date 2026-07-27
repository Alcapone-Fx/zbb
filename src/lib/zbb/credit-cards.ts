import type { BalanceTransaction } from './accounts'

export interface CcTransaction extends BalanceTransaction {
  date: string
}

export interface CcPaymentCategory {
  id: string
  linked_account_id: string
}

/**
 * Per-month activity for the credit-card "Pago · X" mirror categories:
 * `month -> categoryId -> activity`.
 *
 * A card purchase doesn't spend cash, it creates a debt, so the budget has to
 * move the money rather than just remove it: the purchased category's
 * Disponible drops (its own transaction does that) and the card's payment
 * category rises by the same amount — money now owed to the card. Paying the
 * card reverses that side.
 *
 * Both directions fall out of one rule: the mirror category's activity is the
 * NEGATED net change of the card's balance over the month. A card balance is
 * negative when money is owed, so spending (balance down) raises the mirror and
 * a payment (balance up) lowers it.
 *
 * INVARIANT — with nothing manually assigned to it, a mirror category's
 * cumulative Disponible equals the linked card's outstanding debt. Every
 * transaction that moves the card's balance must therefore be counted here, on
 * exactly the same terms as `sumBalancesByAccount` counts it toward that
 * balance. Restricting this to expense/transfer rows (as it once was) silently
 * broke the invariant for three reachable cases:
 *
 *   - `opening_balance` — a card added with debt already on it. The debt was
 *     invisible here, so paying it drove the mirror category NEGATIVE by the
 *     full payment and left it there permanently.
 *   - `income` — a refund or cashback posted to the card. It reduces the debt,
 *     but the mirror kept reserving money for a payment no longer owed.
 *   - `adjustment` — a reconciliation shortfall on the card. Same drift, in
 *     whichever direction the adjustment went.
 *
 * The one exclusion is the legacy synthetic mirror row (type 'adjustment'
 * carrying a mirror category, on the card itself) — those were bookkeeping
 * duplicates of a real expense, removed in migration 20260710000001, and
 * `sumBalancesByAccount` skips them for the same reason. Skipping them in both
 * places is what keeps the two sides in lockstep.
 *
 * Debt older than the user's first budget month is folded into that month:
 * it still has to be paid, and no earlier month exists to carry it.
 */
export function computeCcPaymentActivity(
  transactions: CcTransaction[],
  ccCategories: CcPaymentCategory[],
  sortedMonths: string[],
  ccMirrorCategoryIds: Set<string>
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  if (ccCategories.length === 0 || sortedMonths.length === 0) return result

  const earliestMonth = sortedMonths[0]
  const latestMonth = sortedMonths[sortedMonths.length - 1]

  const categoryByAccount = new Map<string, string>()
  for (const cat of ccCategories) categoryByAccount.set(cat.linked_account_id, cat.id)

  for (const tx of transactions) {
    const categoryId = categoryByAccount.get(tx.account_id)
    if (!categoryId) continue
    if (tx.type === 'adjustment' && tx.category_id && ccMirrorCategoryIds.has(tx.category_id)) {
      continue
    }

    const txMonth = tx.date.slice(0, 7)
    if (txMonth > latestMonth) continue
    const month = txMonth < earliestMonth ? earliestMonth : txMonth

    if (!result[month]) result[month] = {}
    result[month][categoryId] = (result[month][categoryId] ?? 0) - Number(tx.amount)
  }

  return result
}
