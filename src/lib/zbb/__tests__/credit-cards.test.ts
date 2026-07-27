import { describe, it, expect } from 'vitest'
import { computeCcPaymentActivity } from '../credit-cards'
import type { CcTransaction } from '../credit-cards'
import { computeDisponibles, monthRange } from '../budget'
import { sumBalancesByAccount } from '../accounts'

const CARD = 'acct-visa'
const CHECKING = 'acct-checking'
const PAGO_VISA = 'cat-pago-visa'
const SUPER = 'cat-super'

const ccCategories = [{ id: PAGO_VISA, linked_account_id: CARD }]
const mirrorIds = new Set([PAGO_VISA])

function tx(partial: Partial<CcTransaction> & { amount: number; date: string }): CcTransaction {
  return {
    account_id: CARD,
    category_id: null,
    type: 'expense',
    ...partial,
  }
}

describe('computeCcPaymentActivity', () => {
  const months = ['2026-06', '2026-07']

  it('a card purchase raises the payment category by what is now owed', () => {
    const result = computeCcPaymentActivity(
      [tx({ amount: -419.9, date: '2026-07-05', category_id: SUPER })],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-07'][PAGO_VISA]).toBe(419.9)
  })

  it('paying the card lowers it again — settled in full nets to zero', () => {
    const result = computeCcPaymentActivity(
      [
        tx({ amount: -419.9, date: '2026-07-05', category_id: SUPER }),
        tx({ amount: 419.9, date: '2026-07-20', type: 'transfer' }),
      ],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-07'][PAGO_VISA]).toBe(0)
  })

  it('a partial payment leaves exactly the remaining debt', () => {
    const result = computeCcPaymentActivity(
      [
        tx({ amount: -500, date: '2026-07-05', category_id: SUPER }),
        tx({ amount: 200, date: '2026-07-20', type: 'transfer' }),
      ],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-07'][PAGO_VISA]).toBe(300)
  })

  it('debt the card was created with counts as owed', () => {
    // Regression: opening_balance used to be skipped, so this debt produced no
    // payment obligation at all.
    const result = computeCcPaymentActivity(
      [tx({ amount: -132.1, date: '2026-06-01', type: 'opening_balance' })],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-06'][PAGO_VISA]).toBe(132.1)
  })

  it('paying off a card that was created with debt does not go negative', () => {
    // The bug this replaces: the debt was invisible but the payment was not,
    // so "Pago · Visa" ended at -132.10 and carried that red forward forever.
    const result = computeCcPaymentActivity(
      [
        tx({ amount: -132.1, date: '2026-06-01', type: 'opening_balance' }),
        tx({ amount: 132.1, date: '2026-07-10', type: 'transfer' }),
      ],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-06'][PAGO_VISA]).toBe(132.1)
    expect(result['2026-07'][PAGO_VISA]).toBe(-132.1)
  })

  it('debt older than the first budget month folds into that month', () => {
    const result = computeCcPaymentActivity(
      [tx({ amount: -300, date: '2025-02-14', type: 'opening_balance' })],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-06'][PAGO_VISA]).toBe(300)
  })

  it('a refund posted to the card reduces what is owed', () => {
    const result = computeCcPaymentActivity(
      [
        tx({ amount: -200, date: '2026-07-05', category_id: SUPER }),
        tx({ amount: 50, date: '2026-07-08', type: 'income', category_id: SUPER }),
      ],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-07'][PAGO_VISA]).toBe(150)
  })

  it('a reconciliation shortfall on the card counts as new debt', () => {
    const result = computeCcPaymentActivity(
      [tx({ amount: -30, date: '2026-07-28', type: 'adjustment', category_id: SUPER })],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-07'][PAGO_VISA]).toBe(30)
  })

  it('ignores the legacy synthetic mirror rows, exactly as the balance does', () => {
    const rows: CcTransaction[] = [
      tx({ amount: -100, date: '2026-07-05', category_id: SUPER }),
      // Bookkeeping duplicate on the card itself (migration 20260710000001).
      tx({ amount: 100, date: '2026-07-05', type: 'adjustment', category_id: PAGO_VISA }),
    ]
    const result = computeCcPaymentActivity(rows, ccCategories, months, mirrorIds)
    expect(result['2026-07'][PAGO_VISA]).toBe(100)
    // Same row is skipped on the balance side — that lockstep is the point.
    expect(sumBalancesByAccount(rows, mirrorIds)[CARD]).toBe(-100)
  })

  it('a real payment transfer tagged "Pago · Visa" still counts', () => {
    // Only type='adjustment' mirrors are excluded. The genuine transfer leg
    // that pays the card carries the same category by design.
    const result = computeCcPaymentActivity(
      [tx({ amount: 250, date: '2026-07-20', type: 'transfer', category_id: PAGO_VISA })],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-07'][PAGO_VISA]).toBe(-250)
  })

  it('ignores transactions on accounts that are not credit cards', () => {
    const result = computeCcPaymentActivity(
      [tx({ account_id: CHECKING, amount: -419.9, date: '2026-07-05', category_id: SUPER })],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-07']).toBeUndefined()
  })

  it('keeps each card on its own payment category', () => {
    const result = computeCcPaymentActivity(
      [
        tx({ amount: -100, date: '2026-07-05', category_id: SUPER }),
        tx({ account_id: 'acct-amex', amount: -60, date: '2026-07-06', category_id: SUPER }),
      ],
      [...ccCategories, { id: 'cat-pago-amex', linked_account_id: 'acct-amex' }],
      months,
      new Set([PAGO_VISA, 'cat-pago-amex'])
    )
    expect(result['2026-07'][PAGO_VISA]).toBe(100)
    expect(result['2026-07']['cat-pago-amex']).toBe(60)
  })

  it('ignores anything after the month being viewed', () => {
    const result = computeCcPaymentActivity(
      [tx({ amount: -80, date: '2026-08-03', category_id: SUPER })],
      ccCategories,
      months,
      mirrorIds
    )
    expect(result['2026-08']).toBeUndefined()
    expect(result['2026-07']).toBeUndefined()
  })

  it('returns nothing without cards or without months', () => {
    const rows = [tx({ amount: -80, date: '2026-07-03', category_id: SUPER })]
    expect(computeCcPaymentActivity(rows, [], months, mirrorIds)).toEqual({})
    expect(computeCcPaymentActivity(rows, ccCategories, [], mirrorIds)).toEqual({})
  })
})

describe('"Pago · X" Disponible tracks the real card debt', () => {
  // The invariant the whole mechanism rests on: with nothing assigned to it by
  // hand, the payment category's Disponible equals what the card actually owes.
  function check(rows: CcTransaction[], months: string[]) {
    const activity = computeCcPaymentActivity(rows, ccCategories, months, mirrorIds)
    const disponibles = computeDisponibles(months, {}, activity, [PAGO_VISA])
    // `0 - x` rather than `-x`: negating a zero balance yields -0, which
    // toBe(0) rejects.
    const debt = 0 - (sumBalancesByAccount(rows, mirrorIds)[CARD] ?? 0)
    return {
      disponible: disponibles[months[months.length - 1]][PAGO_VISA],
      debt,
    }
  }

  it('holds after spending, a refund, a reconciliation and a partial payment', () => {
    const months = monthRange('2026-05', '2026-07')
    const { disponible, debt } = check(
      [
        tx({ amount: -400, date: '2026-05-02', type: 'opening_balance' }),
        tx({ amount: -120, date: '2026-05-18', category_id: SUPER }),
        tx({ amount: 35, date: '2026-06-04', type: 'income', category_id: SUPER }),
        tx({ amount: -15, date: '2026-06-28', type: 'adjustment', category_id: SUPER }),
        tx({ amount: 300, date: '2026-07-10', type: 'transfer', category_id: PAGO_VISA }),
      ],
      months
    )
    expect(debt).toBe(200)
    expect(disponible).toBe(200)
  })

  it('holds at zero once the card is paid off in full', () => {
    const months = monthRange('2026-06', '2026-07')
    const { disponible, debt } = check(
      [
        tx({ amount: -132.1, date: '2026-06-01', type: 'opening_balance' }),
        tx({ amount: -419.9, date: '2026-07-05', category_id: SUPER }),
        tx({ amount: 552, date: '2026-07-25', type: 'transfer', category_id: PAGO_VISA }),
      ],
      months
    )
    expect(debt).toBe(0)
    // toBeCloseTo, not toBe: chaining rollover month over month accumulates
    // float error (here ~3e-14), far below the cent the UI renders.
    expect(disponible).toBeCloseTo(0, 8)
  })
})
