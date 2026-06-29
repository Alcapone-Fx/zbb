import { describe, it, expect } from 'vitest'
import {
  computeDisponibles,
  computeDineroAAsignar,
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

describe('computeDineroAAsignar', () => {
  it('basic formula', () => {
    const result = computeDineroAAsignar({
      incomeThisMonth: 3000,
      incomeLastMonthNextFlag: 500,
      totalAllocatedThisMonth: 2000,
      negativeRolloverPrevMonth: 0,
    })
    expect(result).toBe(1500) // 3000 + 500 - 2000 + 0
  })

  it('negative rollover reduces available', () => {
    const result = computeDineroAAsignar({
      incomeThisMonth: 3000,
      incomeLastMonthNextFlag: 0,
      totalAllocatedThisMonth: 2000,
      negativeRolloverPrevMonth: -200, // two categories overspent
    })
    expect(result).toBe(800) // 3000 + 0 - 2000 + (-200)
  })

  it('fully allocated leaves zero', () => {
    const result = computeDineroAAsignar({
      incomeThisMonth: 2000,
      incomeLastMonthNextFlag: 0,
      totalAllocatedThisMonth: 2000,
      negativeRolloverPrevMonth: 0,
    })
    expect(result).toBe(0)
  })

  it('over-allocated goes negative', () => {
    const result = computeDineroAAsignar({
      incomeThisMonth: 1000,
      incomeLastMonthNextFlag: 0,
      totalAllocatedThisMonth: 1200,
      negativeRolloverPrevMonth: 0,
    })
    expect(result).toBe(-200)
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
