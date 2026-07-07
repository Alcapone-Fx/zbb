import type { AccountWithBalance } from '@/types/account'

export function buildCreditCardCategoryName(accountName: string): string {
  return `Pago · ${accountName}`
}

/**
 * Net worth = sum of all non-archived account balances,
 * with liability balances SUBTRACTED (stored as positive "amount owed").
 * All other account types use signed balances (negative = you owe, positive = you have).
 */
export function computeNetWorth(accounts: AccountWithBalance[]): number {
  return accounts
    .filter((a) => !a.is_archived)
    .reduce((sum, a) => {
      if (a.type === 'liability') {
        return sum - a.balance
      }
      return sum + a.balance
    }, 0)
}

export interface BalanceTransaction {
  account_id: string
  category_id: string | null
  amount: number
}

/**
 * Sums transaction amounts per account_id, excluding transactions tagged with
 * a CC-payment "mirror" category (categories.linked_account_id set). Those
 * mirrors exist purely to track "Pago · X" budget activity, always share the
 * SAME account_id as the real expense they mirror, and have the opposite
 * sign — left in, they'd cancel the real expense out and the account's
 * balance would never reflect actual credit card debt.
 */
export function sumBalancesByAccount(
  transactions: BalanceTransaction[],
  ccMirrorCategoryIds: Set<string>
): Record<string, number> {
  const balanceMap: Record<string, number> = {}
  for (const t of transactions) {
    if (t.category_id && ccMirrorCategoryIds.has(t.category_id)) continue
    balanceMap[t.account_id] = (balanceMap[t.account_id] ?? 0) + Number(t.amount)
  }
  return balanceMap
}
