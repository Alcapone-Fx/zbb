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
