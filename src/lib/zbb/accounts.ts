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
 * Used only for the liquidity line under "Disponible para ahorrar/invertir"
 * (`/accounts`): "of the money you have free, this much is reachable from your
 * primary account today". Primary balance + this = cash you can actually move,
 * since whatever the other on-budget accounts owe has to be paid out of it.
 *
 * It is deliberately NOT part of any budget total. Until 2026-08-02 the KPI
 * itself was built on `primaryBalance + sumOnBudgetDebt(...)` as a base against
 * the *global* reserved sum — a mix of scopes that under-reported by every
 * peso of on-budget cash held outside the primary account. The headline is now
 * the global figure; see docs/CONVENTIONS.md 2026-08-02.
 *
 * Only negative signed balances count: a positive credit card balance is an
 * overpayment parked on the card, not cash available in the primary account.
 * Positive balances of other cash accounts are surfaced separately (as "the
 * rest is in X and Y"), never folded into this number.
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
