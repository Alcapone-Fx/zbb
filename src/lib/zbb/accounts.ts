import type { AccountWithBalance } from '@/types/account'

export function buildCreditCardCategoryName(accountName: string): string {
  return `Pago · ${accountName}`
}

/**
 * Signed balance for aggregation: `liability` accounts store a positive
 * "amount owed" — the opposite convention from every other type (negative =
 * you owe) — so they must be subtracted rather than added when summing into
 * a total.
 */
export function signedAccountBalance(a: { type: AccountWithBalance['type']; balance: number }): number {
  return a.type === 'liability' ? -a.balance : a.balance
}

/**
 * Net worth = sum of all non-archived account balances,
 * with liability balances SUBTRACTED (stored as positive "amount owed").
 * All other account types use signed balances (negative = you owe, positive = you have).
 */
export function computeNetWorth(accounts: AccountWithBalance[]): number {
  return accounts
    .filter((a) => !a.is_archived)
    .reduce((sum, a) => sum + signedAccountBalance(a), 0)
}

/**
 * Debt held in on-budget accounts other than `excludeAccountId`, as a
 * NEGATIVE number (0 when there is none).
 *
 * Only used by "Disponible para ahorrar/invertir", whose base is the primary
 * account's balance alone. The global "Dinero a Asignar" needs nothing like
 * this: its base (`totalOnBudgetBalance`) already nets every credit card's
 * negative balance, which is exactly why `sumReservedDisponible` drops the
 * "Pago · X" mirror categories. A primary-only base sees none of that debt,
 * so with the same subtrahend an unpaid card expense would *raise* the
 * figure — the expense lowers its category's Disponible (less money reserved)
 * without touching the primary account's cash. The card still has to be paid
 * out of that cash, so net the debt back in.
 *
 * Only negative signed balances count: a positive credit card balance is an
 * overpayment parked on the card, not cash available in the primary account.
 */
export function sumOnBudgetDebt(
  accounts: { id: string; type: AccountWithBalance['type']; balance: number }[],
  excludeAccountId: string | null
): number {
  return accounts.reduce((sum, a) => {
    if (a.id === excludeAccountId) return sum
    const signed = signedAccountBalance(a)
    return signed < 0 ? sum + signed : sum
  }, 0)
}

export interface BalanceTransaction {
  account_id: string
  category_id: string | null
  amount: number
  type: string
}

/**
 * Sums transaction amounts per account_id, excluding the synthetic CC-payment
 * "mirror" rows (type = 'adjustment', tagged with a category whose
 * categories.linked_account_id is set). Those mirrors always share the SAME
 * account_id as the real expense they mirror and have the opposite sign —
 * left in, they'd cancel the real expense out and the account's balance
 * would never reflect actual credit card debt.
 *
 * The `type === 'adjustment'` check is required, not just the category match:
 * a real transfer that pays off a credit card is deliberately categorized
 * under that same "Pago · X" category (see QuickAddFormBody's auto-assigned
 * ccPaymentCategory), and excluding it by category alone would silently drop
 * a legitimate debit/credit from its account's balance.
 */
export function sumBalancesByAccount(
  transactions: BalanceTransaction[],
  ccMirrorCategoryIds: Set<string>
): Record<string, number> {
  const balanceMap: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type === 'adjustment' && t.category_id && ccMirrorCategoryIds.has(t.category_id)) continue
    balanceMap[t.account_id] = (balanceMap[t.account_id] ?? 0) + Number(t.amount)
  }
  return balanceMap
}
