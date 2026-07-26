import { describe, it, expect } from 'vitest'
import { sumOnBudgetDebt } from '../accounts'
import { computeReadyToAssign } from '../budget'

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

describe('"Disponible para ahorrar/invertir" — unpaid card spending', () => {
  // User-reported bug: a $10 card expense pushed the KPI from 100 to 110.
  // The expense lowers its category's Disponible (10 less reserved) without
  // touching the primary account's cash, and reservedDisponible deliberately
  // excludes the "Pago · X" mirror category — so with a primary-only base the
  // debt vanished and the figure went UP by exactly what was owed.
  const accounts = [
    { id: 'checking', type: 'checking' as const, balance: 110 },
    { id: 'visa', type: 'credit_card' as const, balance: -10 },
  ]

  function available(primaryBalance: number, reserved: number): number {
    return computeReadyToAssign(
      primaryBalance + sumOnBudgetDebt(accounts, 'checking'),
      reserved
    )
  }

  it('subtracts what is owed on the card', () => {
    // 110 cash, 10 owed, nothing left reserved in envelopes → 100, not 110.
    expect(available(110, 0)).toBe(100)
  })

  it('subtracts card debt and reserved envelopes together', () => {
    // Assigned 30 to Comida, 10 of it spent on the card → 20 still reserved.
    // 110 − 10 owed − 20 reserved = 80.
    expect(available(110, 20)).toBe(80)
  })

  it('paying the card off from the primary account leaves the figure unchanged', () => {
    // Cash drops to 100, card back to 0 — the money was already committed.
    const paid = [
      { id: 'checking', type: 'checking' as const, balance: 100 },
      { id: 'visa', type: 'credit_card' as const, balance: 0 },
    ]
    expect(computeReadyToAssign(100 + sumOnBudgetDebt(paid, 'checking'), 20)).toBe(80)
  })
})
