import { describe, it, expect, vi, afterEach } from 'vitest'
import { todayLocalDateString } from '../date'

describe('todayLocalDateString', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns YYYY-MM-DD format', () => {
    expect(todayLocalDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('uses local date getters, not UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 5, 23, 30)) // local: 2026-07-05 23:30
    expect(todayLocalDateString()).toBe('2026-07-05')
  })

  it('pads single-digit month and day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0)) // local: 2026-01-05
    expect(todayLocalDateString()).toBe('2026-01-05')
  })
})
