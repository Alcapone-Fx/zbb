import { describe, it, expect } from 'vitest'
import {
  daysInMonth,
  groceryCalc,
  countWeekends,
  weekendPlannerCalc,
  monthsRemaining,
  sinkingFundCalc,
  waterfallAllocate,
  simulateGroupYear,
  advanceMonths,
  emergencyFundTier,
  avgRecentActivity,
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

describe('avgRecentActivity', () => {
  it('averages the last 3 complete months, excluding the current partial one', () => {
    const months = [
      { activity: -100 },
      { activity: -200 },
      { activity: -300 },
      { activity: -9999 }, // current month, partial — must be excluded
    ]
    expect(avgRecentActivity(months)).toBeCloseTo(200, 5)
  })

  it('uses absolute value of activity (expenses are negative)', () => {
    const months = [{ activity: -50 }, { activity: -50 }]
    expect(avgRecentActivity(months)).toBe(50)
  })

  it('returns null when there is no history', () => {
    expect(avgRecentActivity([])).toBeNull()
    expect(avgRecentActivity([{ activity: -100 }])).toBeNull() // only the current month exists
  })

  it('uses fewer than 3 months when that is all there is', () => {
    const months = [{ activity: -100 }, { activity: -50 }, { activity: -9999 }]
    expect(avgRecentActivity(months)).toBe(75)
  })

  it('can include the current month when explicitly asked', () => {
    const months = [{ activity: -100 }, { activity: -200 }]
    expect(avgRecentActivity(months, false)).toBe(150)
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
  it('collapses this calendar month and next calendar month to 1', () => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 15)
    const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-15`
    expect(monthsRemaining(thisMonth)).toBe(1)
    expect(monthsRemaining(nextMonth)).toBe(1)
  })
  it('gives 2 for the month after next', () => {
    const now = new Date()
    const target = new Date(now.getFullYear(), now.getMonth() + 2, 15)
    const targetStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-15`
    expect(monthsRemaining(targetStr)).toBe(2)
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

describe('waterfallAllocate', () => {
  it('gives the earliest deadline priority, leftover goes to the next', () => {
    const funds = [
      { id: 'a', target_amount: 70, target_date: '2026-09-01' },
      { id: 'b', target_amount: 30, target_date: '2026-08-01' },
    ]
    const result = waterfallAllocate(funds, 50)
    expect(result.b).toBe(30)
    expect(result.a).toBe(20)
  })

  it('fully covers all funds when balance exceeds the total', () => {
    const funds = [
      { id: 'a', target_amount: 70, target_date: '2026-09-01' },
      { id: 'b', target_amount: 30, target_date: '2026-08-01' },
    ]
    const result = waterfallAllocate(funds, 1000)
    expect(result.a).toBe(70)
    expect(result.b).toBe(30)
  })

  it('allocates nothing when balance is zero', () => {
    const funds = [{ id: 'a', target_amount: 70, target_date: '2026-09-01' }]
    const result = waterfallAllocate(funds, 0)
    expect(result.a).toBe(0)
  })

  it('sorts by target_date regardless of input order', () => {
    const funds = [
      { id: 'later', target_amount: 100, target_date: '2027-01-01' },
      { id: 'sooner', target_amount: 100, target_date: '2026-08-01' },
    ]
    const result = waterfallAllocate(funds, 100)
    expect(result.sooner).toBe(100)
    expect(result.later).toBe(0)
  })
})

function monthsFromNow(offset: number): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 15)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`
}

describe('simulateGroupYear', () => {
  it('reconciles total suggested contributions with the funding gap', () => {
    const funds = [
      { id: 'a', name: 'A', target_amount: 100, target_date: monthsFromNow(0), recurrence: 'one_time' as const, recurrence_months: null },
      { id: 'b', name: 'B', target_amount: 200, target_date: monthsFromNow(5), recurrence: 'one_time' as const, recurrence_months: null },
      { id: 'c', name: 'C', target_amount: 300, target_date: monthsFromNow(11), recurrence: 'one_time' as const, recurrence_months: null },
    ]
    const result = simulateGroupYear(funds, 0)
    const totalSuggested = result.reduce((s, m) => s + m.suggested, 0)
    expect(totalSuggested).toBeCloseTo(600, 1)
  })

  it('ends the year at ~0 balance when every fund is paid within the window', () => {
    const funds = [
      { id: 'a', name: 'A', target_amount: 100, target_date: monthsFromNow(0), recurrence: 'one_time' as const, recurrence_months: null },
      { id: 'b', name: 'B', target_amount: 200, target_date: monthsFromNow(5), recurrence: 'one_time' as const, recurrence_months: null },
    ]
    const result = simulateGroupYear(funds, 0)
    expect(result[result.length - 1].endBalance).toBeCloseTo(0, 1)
  })

  it('pays off a one_time fund due this month and drops it from later months', () => {
    const funds = [{ id: 'a', name: 'A', target_amount: 100, target_date: monthsFromNow(0), recurrence: 'one_time' as const, recurrence_months: null }]
    const result = simulateGroupYear(funds, 0)
    expect(result[0].paidOut).toBe(100)
    expect(result[0].dueFundNames).toEqual(['A'])
    expect(result[1].dueFundNames).toEqual([])
    expect(result[1].suggested).toBe(0)
  })

  it('credits an existing balance before asking for new contributions', () => {
    const funds = [{ id: 'a', name: 'A', target_amount: 100, target_date: monthsFromNow(0), recurrence: 'one_time' as const, recurrence_months: null }]
    const result = simulateGroupYear(funds, 100)
    expect(result[0].suggested).toBe(0)
    expect(result[0].paidOut).toBe(100)
    expect(result[0].endBalance).toBe(0)
  })

  it('brings a recurring fund back within the window at its next cycle', () => {
    // Due this month, recurs every 6 months — should reappear at month index 6.
    const funds = [{ id: 'a', name: 'A', target_amount: 100, target_date: monthsFromNow(0), recurrence: 'annual' as const, recurrence_months: 6 }]
    const result = simulateGroupYear(funds, 0)
    expect(result[0].dueFundNames).toEqual(['A']) // month 0: due, paid
    expect(result[6].dueFundNames).toEqual(['A']) // month 6: due again
    expect(result[6].paidOut).toBe(100)
  })

  it('does not bring back a recurring fund whose next cycle falls outside the window', () => {
    // Due this month, recurs every 12 months — next cycle is month 12, outside a 12-month window (indices 0-11).
    const funds = [{ id: 'a', name: 'A', target_amount: 100, target_date: monthsFromNow(0), recurrence: 'annual' as const, recurrence_months: 12 }]
    const result = simulateGroupYear(funds, 0)
    expect(result[0].dueFundNames).toEqual(['A'])
    for (let i = 1; i < result.length; i++) {
      expect(result[i].dueFundNames).toEqual([])
    }
  })

  it('a one_time fund never reappears even with the same due date pattern', () => {
    const funds = [{ id: 'a', name: 'A', target_amount: 100, target_date: monthsFromNow(0), recurrence: 'one_time' as const, recurrence_months: 6 }]
    const result = simulateGroupYear(funds, 0)
    expect(result[0].dueFundNames).toEqual(['A'])
    expect(result[6].dueFundNames).toEqual([])
  })
})

describe('advanceMonths', () => {
  it('advances by exactly 12 months (annual, unchanged behavior)', () => {
    expect(advanceMonths('2026-08-15', 12)).toBe('2027-08-15')
  })
  it('advances by 6 months (semestral)', () => {
    expect(advanceMonths('2026-08-15', 6)).toBe('2027-02-15')
  })
  it('advances by 24 months (every 2 years)', () => {
    expect(advanceMonths('2026-08-15', 24)).toBe('2028-08-15')
  })
  it('advances by 60 months (every 5 years)', () => {
    expect(advanceMonths('2026-08-15', 60)).toBe('2031-08-15')
  })
  it('clamps Feb 29 to Feb 28 when landing on a non-leap year', () => {
    expect(advanceMonths('2024-02-29', 12)).toBe('2025-02-28')
  })
  it('clamps day-of-month overflow when landing on a shorter month', () => {
    expect(advanceMonths('2026-01-31', 1)).toBe('2026-02-28')
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
