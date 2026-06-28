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
