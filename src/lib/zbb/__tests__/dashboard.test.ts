import { describe, it, expect } from 'vitest'
import { computeIdealVsReal, computePeriodDateRange } from '../dashboard'

describe('computeIdealVsReal', () => {
  it('returns real_pct rounded to 2 decimal places', () => {
    const result = computeIdealVsReal(
      [{ group_id: 'g1', group_name: 'Vivienda', ideal_percentage: 30, spending: 1000 }],
      3000
    )
    expect(result[0].real_pct).toBe(33.33)
  })

  it('returns 0% real_pct when income is zero', () => {
    const result = computeIdealVsReal(
      [{ group_id: 'g1', group_name: 'Vivienda', ideal_percentage: 30, spending: 500 }],
      0
    )
    expect(result[0].real_pct).toBe(0)
  })

  it('maps ideal_percentage correctly', () => {
    const result = computeIdealVsReal(
      [{ group_id: 'g1', group_name: 'Comida', ideal_percentage: 15, spending: 300 }],
      2000
    )
    expect(result[0].ideal_pct).toBe(15)
    expect(result[0].real_amount).toBe(300)
  })

  it('handles multiple groups independently', () => {
    const groups = [
      { group_id: 'g1', group_name: 'A', ideal_percentage: 20, spending: 200 },
      { group_id: 'g2', group_name: 'B', ideal_percentage: 40, spending: 600 },
    ]
    const result = computeIdealVsReal(groups, 1000)
    expect(result[0].real_pct).toBe(20)
    expect(result[1].real_pct).toBe(60)
  })

  it('returns real_amount equal to spending input', () => {
    const result = computeIdealVsReal(
      [{ group_id: 'g1', group_name: 'X', ideal_percentage: 10, spending: 123.45 }],
      1000
    )
    expect(result[0].real_amount).toBe(123.45)
  })
})

describe('computePeriodDateRange', () => {
  const now = new Date('2026-06-15')

  it('current_month returns correct range', () => {
    const r = computePeriodDateRange('current_month', now)
    expect(r.from).toBe('2026-06-01')
    expect(r.to).toBe('2026-06-30')
  })

  it('prev_month returns correct range', () => {
    const r = computePeriodDateRange('prev_month', now)
    expect(r.from).toBe('2026-05-01')
    expect(r.to).toBe('2026-05-31')
  })

  it('quarter returns 3-month window', () => {
    const r = computePeriodDateRange('quarter', now)
    expect(r.from).toBe('2026-04-01')
    expect(r.to).toBe('2026-06-30')
  })

  it('year returns Jan 1 to end of current month', () => {
    const r = computePeriodDateRange('year', now)
    expect(r.from).toBe('2026-01-01')
    expect(r.to).toBe('2026-06-30')
  })

  it('prev_month crosses year boundary correctly', () => {
    const jan = new Date('2026-01-10')
    const r = computePeriodDateRange('prev_month', jan)
    expect(r.from).toBe('2025-12-01')
    expect(r.to).toBe('2025-12-31')
  })
})
