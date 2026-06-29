import { describe, it, expect } from 'vitest'
import { calcAdjustmentAmount, isBalanced } from '../reconciliation'

describe('calcAdjustmentAmount', () => {
  it('returns positive when bank has more than app', () => {
    expect(calcAdjustmentAmount(1000, 980)).toBe(20)
  })

  it('returns negative when bank has less than app', () => {
    expect(calcAdjustmentAmount(980, 1000)).toBe(-20)
  })

  it('returns zero when balanced', () => {
    expect(calcAdjustmentAmount(500, 500)).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    expect(calcAdjustmentAmount(100.005, 0)).toBe(100.01)
  })

  it('works with negative app balance (net overdraft)', () => {
    expect(calcAdjustmentAmount(0, -50)).toBe(50)
  })

  it('works with decimal inputs', () => {
    expect(calcAdjustmentAmount(1234.56, 1200)).toBe(34.56)
  })
})

describe('isBalanced', () => {
  it('returns true when amounts match exactly', () => {
    expect(isBalanced(500, 500)).toBe(true)
  })

  it('returns false when there is a difference', () => {
    expect(isBalanced(500, 499.99)).toBe(false)
  })

  it('returns false when bank is less than app', () => {
    expect(isBalanced(999, 1000)).toBe(false)
  })
})
