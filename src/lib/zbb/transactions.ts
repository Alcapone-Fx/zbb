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
 * Source leg: negative (money leaves). Destination leg: positive (money arrives).
 */
export function transferLegAmounts(userAmount: number): {
  sourceLegAmount: number
  destLegAmount: number
} {
  const abs = Math.abs(userAmount)
  return { sourceLegAmount: -abs, destLegAmount: abs }
}

/**
 * Returns the amount for the CC mirror adjustment transaction.
 * Always positive — represents the budget item for the future CC payment.
 */
export function ccMirrorAmount(expenseAmount: number): number {
  return Math.abs(expenseAmount)
}
