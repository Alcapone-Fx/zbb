import { describe, it, expect } from 'vitest'
import { buildCreditCardCategoryName, computeNetWorth, sumBalancesByAccount } from '@/lib/zbb/accounts'
import type { AccountWithBalance } from '@/types/account'

function makeAccount(overrides: Partial<AccountWithBalance>): AccountWithBalance {
  return {
    id: 'uuid-1',
    name: 'Test',
    type: 'checking',
    is_tracking_only: false,
    is_emergency_fund: false,
    is_primary: false,
    is_archived: false,
    starting_balance: 0,
    created_at: '2026-01-01T00:00:00Z',
    balance: 0,
    ...overrides,
  }
}

describe('buildCreditCardCategoryName', () => {
  it('prepends "Pago · " to the account name', () => {
    expect(buildCreditCardCategoryName('Visa Gold')).toBe('Pago · Visa Gold')
  })

  it('handles names with special characters', () => {
    expect(buildCreditCardCategoryName('Mastercard® Platino')).toBe(
      'Pago · Mastercard® Platino'
    )
  })

  it('handles empty string (edge case)', () => {
    expect(buildCreditCardCategoryName('')).toBe('Pago · ')
  })
})

describe('computeNetWorth', () => {
  it('sums on-budget account balances', () => {
    const accounts = [
      makeAccount({ type: 'checking', balance: 5000 }),
      makeAccount({ type: 'savings', balance: 3000 }),
    ]
    expect(computeNetWorth(accounts)).toBe(8000)
  })

  it('subtracts liability account balances (stored as positive debt)', () => {
    const accounts = [
      makeAccount({ type: 'checking', balance: 10000 }),
      makeAccount({ type: 'liability', balance: 5000 }),
    ]
    expect(computeNetWorth(accounts)).toBe(5000)
  })

  it('includes credit card negative balances normally', () => {
    const accounts = [
      makeAccount({ type: 'checking', balance: 2000 }),
      makeAccount({ type: 'credit_card', balance: -300 }),
    ]
    expect(computeNetWorth(accounts)).toBe(1700)
  })

  it('excludes archived accounts', () => {
    const accounts = [
      makeAccount({ type: 'checking', balance: 1000 }),
      makeAccount({ type: 'savings', balance: 500, is_archived: true }),
    ]
    expect(computeNetWorth(accounts)).toBe(1000)
  })

  it('returns 0 for empty account list', () => {
    expect(computeNetWorth([])).toBe(0)
  })

  it('handles mixed scenario: checking + CC + liability + investment', () => {
    const accounts = [
      makeAccount({ type: 'checking', balance: 5000 }),
      makeAccount({ type: 'credit_card', balance: -800 }),
      makeAccount({ type: 'liability', balance: 200000 }),
      makeAccount({ type: 'investment', balance: 15000, is_tracking_only: true }),
    ]
    // 5000 + (-800) - 200000 + 15000 = -180800
    expect(computeNetWorth(accounts)).toBe(-180800)
  })

  it('excludes archived liability accounts', () => {
    const accounts = [
      makeAccount({ type: 'checking', balance: 5000 }),
      makeAccount({ type: 'liability', balance: 1000, is_archived: true }),
    ]
    expect(computeNetWorth(accounts)).toBe(5000)
  })
})

describe('sumBalancesByAccount', () => {
  it('sums plain transactions per account', () => {
    const txs = [
      { account_id: 'a', category_id: null, amount: -50 },
      { account_id: 'a', category_id: null, amount: 100 },
      { account_id: 'b', category_id: null, amount: 20 },
    ]
    expect(sumBalancesByAccount(txs, new Set())).toEqual({ a: 50, b: 20 })
  })

  it('excludes transactions tagged with a CC-mirror category', () => {
    const txs = [
      { account_id: 'card', category_id: 'groceries', amount: -50 }, // real expense
      { account_id: 'card', category_id: 'cc-payment-cat', amount: 50 }, // mirror
    ]
    expect(sumBalancesByAccount(txs, new Set(['cc-payment-cat']))).toEqual({ card: -50 })
  })

  it('does not exclude reconciliation adjustments (different category)', () => {
    const txs = [
      { account_id: 'checking', category_id: 'misc', amount: -12.5 },
    ]
    expect(sumBalancesByAccount(txs, new Set(['cc-payment-cat']))).toEqual({ checking: -12.5 })
  })

  it('handles null category_id safely', () => {
    const txs = [{ account_id: 'a', category_id: null, amount: 10 }]
    expect(sumBalancesByAccount(txs, new Set(['x']))).toEqual({ a: 10 })
  })

  it('returns an empty map for no transactions', () => {
    expect(sumBalancesByAccount([], new Set())).toEqual({})
  })
})
