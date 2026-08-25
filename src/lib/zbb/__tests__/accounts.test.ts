import { describe, it, expect } from 'vitest'
import { signedAccountBalance, sumOnBudgetSurplus } from '../accounts'
import { computeReadyToAssign } from '../budget'
import type { AccountWithBalance } from '@/types/account'

describe('sumOnBudgetSurplus', () => {
  const primary = { id: 'checking', type: 'checking' as const, balance: 110 }

  it('returns a secondary cash account balance as a positive number', () => {
    const result = sumOnBudgetSurplus(
      [primary, { id: 'savings', type: 'savings', balance: 200 }],
      'checking'
    )
    expect(result).toBe(200)
  })

  it('never counts the excluded (primary) account, even when positive', () => {
    const result = sumOnBudgetSurplus(
      [{ id: 'checking', type: 'checking', balance: 40 }],
      'checking'
    )
    expect(result).toBe(0)
  })

  it('ignores negative balances — a card in debt is not cash held elsewhere', () => {
    const result = sumOnBudgetSurplus(
      [primary, { id: 'visa', type: 'credit_card', balance: -25 }],
      'checking'
    )
    expect(result).toBe(0)
  })

  it('adds up several accounts', () => {
    const result = sumOnBudgetSurplus(
      [
        primary,
        { id: 'savings', type: 'savings', balance: 200 },
        { id: 'cash', type: 'cash', balance: 35 },
      ],
      'checking'
    )
    expect(result).toBe(235)
  })

  it('liability accounts store a positive amount owed and never count as surplus', () => {
    const result = sumOnBudgetSurplus(
      [primary, { id: 'loan', type: 'liability', balance: 300 }],
      'checking'
    )
    expect(result).toBe(0)
  })

  it('no primary marked yet — nothing is excluded', () => {
    const result = sumOnBudgetSurplus(
      [{ id: 'savings', type: 'savings', balance: 200 }],
      null
    )
    expect(result).toBe(200)
  })

  it('returns 0 for no accounts', () => {
    expect(sumOnBudgetSurplus([], 'checking')).toBe(0)
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
    // Kept as the counter-example: same data, discarded formula. Debt-only
    // sum inlined here (not `sumOnBudgetSurplus`, its opposite) since no
    // production code needs this discarded shape any more.
    const debtOutsidePrimary = accounts.reduce((sum, a) => {
      if (a.id === 'nomina') return sum
      const signed = signedAccountBalance(a)
      return signed < 0 ? sum + signed : sum
    }, 0)
    const old = computeReadyToAssign(721.79 + debtOutsidePrimary, 982.66)
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

describe('liquidity line — how much of the headline is reachable from the primary account', () => {
  const accounts: TestAccount[] = [
    { id: 'nomina', type: 'checking', balance: 721.79 },
    { id: 'prevision', type: 'savings', balance: 308.6 },
    { id: 'visa', type: 'credit_card', balance: -100 },
  ]

  // liquidCash = dineroAAsignar − sumOnBudgetSurplus(...) — see
  // docs/CONVENTIONS.md 2026-08-25 for the algebraic derivation from
  // `primaryBalance + (debt owed elsewhere) − reservedDisponible`.
  function liquidCash(accts: TestAccount[], reserved: number, primaryId: string): number {
    return availableToSave(accts, reserved) - sumOnBudgetSurplus(accts, primaryId)
  }

  it('equals the primary balance net of what the other accounts owe, when nothing is reserved', () => {
    expect(liquidCash(accounts, 0, 'nomina')).toBeCloseTo(621.79, 2)
  })

  it('covers the headline exactly when no cash sits outside the primary account', () => {
    const single: TestAccount[] = [{ id: 'nomina', type: 'checking', balance: 200 }]
    expect(liquidCash(single, 50, 'nomina')).toBeCloseTo(availableToSave(single, 50), 2)
  })

  it('falls short of the headline when free money sits in another on-budget account', () => {
    const headline = availableToSave(accounts, 0)
    const liquid = liquidCash(accounts, 0, 'nomina')
    expect(headline).toBeCloseTo(930.39, 2)
    expect(liquid).toBeLessThan(headline)
  })

  it('nets out a reserved bill that has not physically left the primary account yet', () => {
    // User-reported (2026-08-25): assigning money to a category — sinking
    // fund or ordinary bill alike — is bookkeeping, not a transfer. The cash
    // stays put until an actual transaction moves it, so 200 reserved here
    // must reduce what's liquid in "nomina" exactly like it reduces the
    // headline — no exception for sinking-fund categories.
    const before = liquidCash(accounts, 0, 'nomina')
    const after = liquidCash(accounts, 200, 'nomina')
    expect(after).toBeCloseTo(before - 200, 2)
  })
})
