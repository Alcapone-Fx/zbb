import { describe, it, expect } from 'vitest'
import {
  computeDisponibles,
  sumReservedDisponible,
  computeReadyToAssign,
  getPrevMonth,
  monthEnd,
} from '../budget'

describe('computeDisponibles', () => {
  const catA = 'cat-a'
  const catB = 'cat-b'

  it('single month, no prior rollover', () => {
    const result = computeDisponibles(
      ['2026-01'],
      { '2026-01': { [catA]: 500 } },
      { '2026-01': { [catA]: -200 } },
      [catA]
    )
    expect(result['2026-01'][catA]).toBe(300) // 500 + 0 + (-200)
  })

  it('rollover carries forward to next month', () => {
    const result = computeDisponibles(
      ['2026-01', '2026-02'],
      {
        '2026-01': { [catA]: 500 },
        '2026-02': { [catA]: 200 },
      },
      {
        '2026-01': { [catA]: -200 },
        '2026-02': { [catA]: -100 },
      },
      [catA]
    )
    // Jan: 500 + 0 + (-200) = 300
    expect(result['2026-01'][catA]).toBe(300)
    // Feb: 200 + 300 + (-100) = 400
    expect(result['2026-02'][catA]).toBe(400)
  })

  it('negative rollover cascades', () => {
    const result = computeDisponibles(
      ['2026-01', '2026-02', '2026-03'],
      {
        '2026-01': { [catA]: 100 },
        '2026-02': { [catA]: 50 },
        '2026-03': { [catA]: 200 },
      },
      {
        '2026-01': { [catA]: -300 }, // overspent by 200
        '2026-02': { [catA]: -80 },
        '2026-03': { [catA]: -50 },
      },
      [catA]
    )
    // Jan: 100 + 0 + (-300) = -200
    expect(result['2026-01'][catA]).toBe(-200)
    // Feb: 50 + (-200) + (-80) = -230
    expect(result['2026-02'][catA]).toBe(-230)
    // Mar: 200 + (-230) + (-50) = -80
    expect(result['2026-03'][catA]).toBe(-80)
  })

  it('multiple categories are independent', () => {
    const result = computeDisponibles(
      ['2026-01', '2026-02'],
      {
        '2026-01': { [catA]: 500, [catB]: 300 },
        '2026-02': { [catA]: 200, [catB]: 100 },
      },
      {
        '2026-01': { [catA]: -100, [catB]: -300 },
        '2026-02': { [catA]: -50, [catB]: -50 },
      },
      [catA, catB]
    )
    // Jan A: 500 + 0 + (-100) = 400
    expect(result['2026-01'][catA]).toBe(400)
    // Jan B: 300 + 0 + (-300) = 0
    expect(result['2026-01'][catB]).toBe(0)
    // Feb A: 200 + 400 + (-50) = 550
    expect(result['2026-02'][catA]).toBe(550)
    // Feb B: 100 + 0 + (-50) = 50
    expect(result['2026-02'][catB]).toBe(50)
  })

  it('missing allocation or activity defaults to 0', () => {
    const result = computeDisponibles(
      ['2026-01'],
      {},
      {},
      [catA]
    )
    expect(result['2026-01'][catA]).toBe(0)
  })

  it('returns empty object for empty month list', () => {
    const result = computeDisponibles([], {}, {}, [catA])
    expect(result).toEqual({})
  })
})

describe('sumReservedDisponible', () => {
  it('sums positive disponible across categories', () => {
    const result = sumReservedDisponible(
      { a: 300, b: 150 },
      ['a', 'b'],
      new Set()
    )
    expect(result).toBe(450)
  })

  it('excludes negative disponible (already reflected in the balance, not reserved)', () => {
    const result = sumReservedDisponible(
      { a: 300, b: -100 },
      ['a', 'b'],
      new Set()
    )
    expect(result).toBe(300)
  })

  it('excludes CC mirror categories even when positive', () => {
    // A "Pago · X" category tracks amount owed on a card, not cash sitting
    // in an on-budget account — its cash effect already lives in the card
    // account's own (negative) balance. Including it here would double
    // count the same debt.
    const result = sumReservedDisponible(
      { groceries: 300, 'pago-visa': 50 },
      ['groceries', 'pago-visa'],
      new Set(['pago-visa'])
    )
    expect(result).toBe(300)
  })

  it('ignores categories missing from the disponibles map', () => {
    const result = sumReservedDisponible({ a: 300 }, ['a', 'b'], new Set())
    expect(result).toBe(300)
  })

  it('returns 0 for no categories', () => {
    expect(sumReservedDisponible({}, [], new Set())).toBe(0)
  })
})

describe('computeReadyToAssign', () => {
  it('balance minus reserved money', () => {
    expect(computeReadyToAssign(5000, 3200)).toBe(1800)
  })

  it('an old opening balance never assigned still counts (cumulative by construction)', () => {
    // Money that entered an account weeks ago, never assigned to a
    // category, is simply part of the balance — no special handling needed,
    // unlike the old month-scoped income-flow formula.
    expect(computeReadyToAssign(2000, 0)).toBe(2000)
  })

  it('goes negative when more is reserved than the account actually holds', () => {
    expect(computeReadyToAssign(500, 800)).toBe(-300)
  })

  it('zero balance, zero reserved', () => {
    expect(computeReadyToAssign(0, 0)).toBe(0)
  })
})

describe('getPrevMonth', () => {
  it('regular month', () => {
    expect(getPrevMonth('2026-06')).toBe('2026-05')
  })
  it('crosses year boundary', () => {
    expect(getPrevMonth('2026-01')).toBe('2025-12')
  })
})

describe('monthEnd', () => {
  it('30-day month', () => {
    expect(monthEnd('2026-06')).toBe('2026-06-30')
  })
  it('31-day month', () => {
    expect(monthEnd('2026-01')).toBe('2026-01-31')
  })
  it('February non-leap year', () => {
    expect(monthEnd('2026-02')).toBe('2026-02-28')
  })
  it('February leap year', () => {
    expect(monthEnd('2024-02')).toBe('2024-02-29')
  })
})
