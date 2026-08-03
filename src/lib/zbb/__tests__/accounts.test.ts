import { describe, it, expect } from 'vitest'
import { signedAccountBalance, sumOnBudgetDebt } from '../accounts'
import { computeReadyToAssign } from '../budget'
import type { AccountWithBalance } from '@/types/account'

describe('sumOnBudgetDebt', () => {
  const primary = { id: 'checking', type: 'checking' as const, balance: 110 }

  it('returns the card debt as a negative number', () => {
    const result = sumOnBudgetDebt(
      [primary, { id: 'visa', type: 'credit_card', balance: -10 }],
      'checking'
    )
    expect(result).toBe(-10)
  })

  it('never counts the excluded (primary) account, even when overdrawn', () => {
    const result = sumOnBudgetDebt(
      [{ id: 'checking', type: 'checking', balance: -40 }],
      'checking'
    )
    expect(result).toBe(0)
  })

  it('ignores positive balances — an overpaid card is not cash in the primary account', () => {
    const result = sumOnBudgetDebt(
      [primary, { id: 'visa', type: 'credit_card', balance: 25 }],
      'checking'
    )
    expect(result).toBe(0)
  })

  it('adds up several cards', () => {
    const result = sumOnBudgetDebt(
      [
        primary,
        { id: 'visa', type: 'credit_card', balance: -10 },
        { id: 'amex', type: 'credit_card', balance: -35 },
      ],
      'checking'
    )
    expect(result).toBe(-45)
  })

  it('liability accounts store a positive amount owed and still count as debt', () => {
    const result = sumOnBudgetDebt(
      [primary, { id: 'loan', type: 'liability', balance: 300 }],
      'checking'
    )
    expect(result).toBe(-300)
  })

  it('counts an overdrawn secondary cash account', () => {
    const result = sumOnBudgetDebt(
      [primary, { id: 'checking-2', type: 'checking', balance: -5 }],
      'checking'
    )
    expect(result).toBe(-5)
  })

  it('no primary marked yet — nothing is excluded', () => {
    const result = sumOnBudgetDebt(
      [{ id: 'visa', type: 'credit_card', balance: -10 }],
      null
    )
    expect(result).toBe(-10)
  })

  it('returns 0 for no accounts', () => {
    expect(sumOnBudgetDebt([], 'checking')).toBe(0)
  })
})

type TestAccount = { id: string; type: AccountWithBalance['type']; balance: number }

/** Mirrors `totalOnBudgetBalance` in `GET /api/budget/month`. */
function totalOnBudget(accounts: TestAccount[]): number {
  return accounts.reduce((sum, a) => sum + signedAccountBalance(a), 0)
}

/**
 * The headline of "Disponible para ahorrar/invertir" (`/accounts`) is
 * `dineroAAsignar` verbatim — every on-budget balance minus everything still
 * reserved in categories. Both scopes are global; mixing them is what broke.
 */
function availableToSave(accounts: TestAccount[], reserved: number): number {
  return computeReadyToAssign(totalOnBudget(accounts), reserved)
}

describe('"Disponible para ahorrar/invertir" — unpaid card spending', () => {
  // User-reported bug (2026-07-26): a $10 card expense pushed the KPI from
  // 100 to 110. The expense lowers its category's Disponible (10 less
  // reserved) without touching cash, and reservedDisponible deliberately
  // excludes the "Pago · X" mirror category. A global base cannot reproduce
  // it — the card's negative balance is already inside totalOnBudgetBalance,
  // which is the very reason the mirror categories are dropped.
  const accounts: TestAccount[] = [
    { id: 'checking', type: 'checking', balance: 110 },
    { id: 'visa', type: 'credit_card', balance: -10 },
  ]

  it('nets what is owed on the card', () => {
    // 110 cash, 10 owed, nothing reserved in envelopes → 100, not 110.
    expect(availableToSave(accounts, 0)).toBe(100)
  })

  it('nets card debt and reserved envelopes together', () => {
    // Assigned 30 to Comida, 10 of it spent on the card → 20 still reserved.
    expect(availableToSave(accounts, 20)).toBe(80)
  })

  it('paying the card off from the primary account leaves the figure unchanged', () => {
    // Cash drops to 100, card back to 0 — the money was already committed.
    const paid: TestAccount[] = [
      { id: 'checking', type: 'checking', balance: 100 },
      { id: 'visa', type: 'credit_card', balance: 0 },
    ]
    expect(availableToSave(paid, 20)).toBe(80)
  })
})

describe('"Disponible para ahorrar/invertir" — cash outside the primary account', () => {
  // User-reported bug (2026-08-02): the KPI read −260.87 with 721.79 in the
  // primary account and 982.66 reserved. Its base was the primary balance
  // alone while the subtrahend covered every on-budget category — so the
  // 308.60 held in the user's previsión/anual accounts was subtracted (via
  // the categories it funds) without ever being added. Structurally
  // impossible now: base and subtrahend share one scope.
  const accounts: TestAccount[] = [
    { id: 'nomina', type: 'checking', balance: 721.79 },
    { id: 'prevision', type: 'savings', balance: 200 },
    { id: 'anual', type: 'savings', balance: 108.6 },
  ]

  it('counts on-budget cash held outside the primary account', () => {
    expect(availableToSave(accounts, 982.66)).toBeCloseTo(47.73, 2)
  })

  it('the old primary-only base is what produced the negative reading', () => {
    // Kept as the counter-example: same data, discarded formula.
    const old = computeReadyToAssign(721.79 + sumOnBudgetDebt(accounts, 'nomina'), 982.66)
    expect(old).toBeCloseTo(-260.87, 2)
  })

  it('moving money between two on-budget accounts does not move the figure', () => {
    const moved: TestAccount[] = [
      { id: 'nomina', type: 'checking', balance: 421.79 },
      { id: 'prevision', type: 'savings', balance: 500 },
      { id: 'anual', type: 'savings', balance: 108.6 },
    ]
    expect(availableToSave(moved, 982.66)).toBeCloseTo(availableToSave(accounts, 982.66), 2)
  })

  it('over-assigning is still allowed to go negative', () => {
    // A real alarm, unlike the phantom one above: more reserved than held.
    expect(availableToSave(accounts, 1200)).toBeCloseTo(-169.61, 2)
  })
})

describe('liquidity line — how much of it is reachable from the primary account', () => {
  const accounts: TestAccount[] = [
    { id: 'nomina', type: 'checking', balance: 721.79 },
    { id: 'prevision', type: 'savings', balance: 308.6 },
    { id: 'visa', type: 'credit_card', balance: -100 },
  ]

  it('is the primary balance net of what the other accounts owe', () => {
    expect(721.79 + sumOnBudgetDebt(accounts, 'nomina')).toBeCloseTo(621.79, 2)
  })

  it('covers the headline whenever the primary account holds enough', () => {
    const headline = availableToSave(accounts, 900)
    const liquid = 721.79 + sumOnBudgetDebt(accounts, 'nomina')
    expect(headline).toBeCloseTo(30.39, 2)
    expect(liquid).toBeGreaterThanOrEqual(headline)
  })

  it('falls short when the free money sits in the other account', () => {
    const headline = availableToSave(accounts, 0)
    const liquid = 721.79 + sumOnBudgetDebt(accounts, 'nomina')
    expect(headline).toBeCloseTo(930.39, 2)
    expect(liquid).toBeLessThan(headline)
  })
})
