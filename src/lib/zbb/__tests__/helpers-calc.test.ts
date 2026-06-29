import { describe, it, expect } from 'vitest'
import {
  daysInMonth,
  groceryCalc,
  countWeekends,
  weekendPlannerCalc,
  monthsRemaining,
  sinkingFundCalc,
  emergencyFundTier,
} from '../helpers-calc'

describe('daysInMonth', () => {
  it('returns 31 for January', () => expect(daysInMonth(2025, 1)).toBe(31))
  it('returns 28 for February in non-leap year', () => expect(daysInMonth(2025, 2)).toBe(28))
  it('returns 29 for February in leap year', () => expect(daysInMonth(2024, 2)).toBe(29))
  it('returns 30 for April', () => expect(daysInMonth(2025, 4)).toBe(30))
  it('returns 31 for December', () => expect(daysInMonth(2025, 12)).toBe(31))
})

describe('groceryCalc', () => {
  it('multiplies daily rate by days in month', () => {
    expect(groceryCalc(10, 2025, 1)).toBe(310)
  })
  it('handles February in leap year', () => {
    expect(groceryCalc(10, 2024, 2)).toBe(290)
  })
  it('handles February in non-leap year', () => {
    expect(groceryCalc(10, 2025, 2)).toBe(280)
  })
})

describe('countWeekends', () => {
  it('June 2026 has 4 Saturdays', () => {
    // Saturdays: 6, 13, 20, 27
    expect(countWeekends(2026, 6)).toBe(4)
  })
  it('August 2026 has 5 Saturdays', () => {
    // Saturdays: 1, 8, 15, 22, 29
    expect(countWeekends(2026, 8)).toBe(5)
  })
  it('February 2025 has 4 Saturdays', () => {
    // Saturdays: 1, 8, 15, 22
    expect(countWeekends(2025, 2)).toBe(4)
  })
})

describe('weekendPlannerCalc', () => {
  it('divides remainder evenly by weekends', () => {
    expect(weekendPlannerCalc(1000, 400, 4)).toBe(150)
  })
  it('returns 0 when expenses exceed available', () => {
    expect(weekendPlannerCalc(400, 500, 4)).toBe(0)
  })
  it('returns 0 when no weekends', () => {
    expect(weekendPlannerCalc(1000, 0, 0)).toBe(0)
  })
  it('handles zero fixed expenses', () => {
    expect(weekendPlannerCalc(1000, 0, 4)).toBe(250)
  })
})

describe('monthsRemaining', () => {
  it('returns at least 1', () => {
    const past = '2020-01-01'
    expect(monthsRemaining(past)).toBe(1)
  })
  it('computes future months correctly', () => {
    const future = '2030-06-01'
    const result = monthsRemaining(future)
    expect(result).toBeGreaterThan(12)
  })
})

describe('sinkingFundCalc', () => {
  it('returns correct monthly contribution', () => {
    expect(sinkingFundCalc(1200, 200, 10)).toBe(100)
  })
  it('returns 0 when target already reached', () => {
    expect(sinkingFundCalc(1000, 1200, 5)).toBe(0)
  })
  it('returns 0 when target exactly reached', () => {
    expect(sinkingFundCalc(1000, 1000, 3)).toBe(0)
  })
  it('divides full target when balance is zero', () => {
    expect(sinkingFundCalc(500, 0, 5)).toBe(100)
  })
})

describe('emergencyFundTier', () => {
  it('tier 0 when less than 1 month covered', () => {
    const r = emergencyFundTier(500, 1000)
    expect(r.tier).toBe(0)
    expect(r.color).toBe('red')
    expect(r.coveredMonths).toBe(0.5)
  })
  it('tier 1 between 1 and 3 months', () => {
    const r = emergencyFundTier(2000, 1000)
    expect(r.tier).toBe(1)
    expect(r.color).toBe('yellow')
  })
  it('tier 2 between 3 and 6 months', () => {
    const r = emergencyFundTier(4500, 1000)
    expect(r.tier).toBe(2)
    expect(r.color).toBe('light-green')
  })
  it('tier 3 at 6 or more months', () => {
    const r = emergencyFundTier(8000, 1000)
    expect(r.tier).toBe(3)
    expect(r.color).toBe('green')
  })
  it('returns red when minExpense is 0', () => {
    const r = emergencyFundTier(5000, 0)
    expect(r.tier).toBe(0)
    expect(r.color).toBe('red')
  })
  it('tier 1 exactly at 1 month boundary', () => {
    const r = emergencyFundTier(1000, 1000)
    expect(r.tier).toBe(1)
    expect(r.color).toBe('yellow')
  })
  it('tier 2 exactly at 3 month boundary', () => {
    const r = emergencyFundTier(3000, 1000)
    expect(r.tier).toBe(2)
    expect(r.color).toBe('light-green')
  })
  it('tier 3 exactly at 6 month boundary', () => {
    const r = emergencyFundTier(6000, 1000)
    expect(r.tier).toBe(3)
    expect(r.color).toBe('green')
  })
})
