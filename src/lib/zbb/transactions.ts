import type { AccountType } from '@/types/account'

/**
 * Returns the signed amount to store in the DB for a given user-entered positive amount.
 * Expenses are negative (money leaves); income is positive (money arrives).
 */
export function applyAmountSign(
  amount: number,
  type: 'expense' | 'income'
): number {
  return type === 'expense' ? -Math.abs(amount) : Math.abs(amount)
}

/**
 * Returns leg amounts for a transfer.
 * Normal accounts: source leg negative (money leaves), destination leg
 * positive (money arrives). `liability` accounts store balance as positive
 * "amount owed" — the opposite convention from every other account type
 * (negative = you owe) — so a leg touching a liability account gets its
 * sign inverted: receiving a payment there reduces what's owed (negative),
 * and money leaving it (e.g. drawing more debt) increases what's owed
 * (positive).
 */
/**
 * Whether a transfer between these two accounts should carry a budget category.
 *
 * Money only enters or leaves the budget when EXACTLY ONE side is on-budget:
 *   - on-budget → off-budget: the money left the budget, which is real spending
 *   - off-budget → on-budget: money arriving, categorized so it lands somewhere
 *   - both on-budget:  the money only changed location; the budget is untouched
 *   - both off-budget: outside the budget entirely
 *
 * Categorizing a both-on-budget transfer is what produced phantom spending.
 * Only the source leg carries the category (the destination leg is inserted
 * with category_id null), so the category's activity drops by the full amount
 * with nothing offsetting it. That overstates the category's spending AND
 * inflates "Dinero a Asignar": the account balances net to zero while
 * reservedDisponible falls, and dineroAAsignar is their difference.
 *
 * The one legitimate exception is a credit-card payment, whose "Pago · X"
 * mirror category is assigned deliberately. Mirror categories are excluded from
 * the generic activity sum in /api/budget/month, so they create no phantom
 * activity — callers must preserve that case explicitly.
 */
export function transferNeedsCategory(
  sourceTrackingOnly: boolean,
  destTrackingOnly: boolean
): boolean {
  return sourceTrackingOnly !== destTrackingOnly
}

export function transferLegAmounts(
  userAmount: number,
  sourceType: AccountType,
  destType: AccountType
): {
  sourceLegAmount: number
  destLegAmount: number
} {
  const abs = Math.abs(userAmount)
  return {
    sourceLegAmount: sourceType === 'liability' ? abs : -abs,
    destLegAmount: destType === 'liability' ? -abs : abs,
  }
}
