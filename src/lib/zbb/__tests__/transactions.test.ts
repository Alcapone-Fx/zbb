import { describe, it, expect } from 'vitest'
import {
  applyAmountSign,
  transferLegAmounts,
  ccMirrorAmount,
} from '../transactions'

describe('applyAmountSign', () => {
  it('expense returns negative amount', () => {
    expect(applyAmountSign(50, 'expense')).toBe(-50)
  })
  it('income returns positive amount', () => {
    expect(applyAmountSign(80, 'income')).toBe(80)
  })
  it('expense already negative input normalises to negative', () => {
    expect(applyAmountSign(-30, 'expense')).toBe(-30)
  })
  it('income with negative input normalises to positive', () => {
    expect(applyAmountSign(-20, 'income')).toBe(20)
  })
})

describe('transferLegAmounts', () => {
  it('normal accounts: source is negative, destination is positive', () => {
    const { sourceLegAmount, destLegAmount } = transferLegAmounts(100, 'checking', 'savings')
    expect(sourceLegAmount).toBe(-100)
    expect(destLegAmount).toBe(100)
  })
  it('handles already-negative user input', () => {
    const { sourceLegAmount, destLegAmount } = transferLegAmounts(-75, 'checking', 'savings')
    expect(sourceLegAmount).toBe(-75)
    expect(destLegAmount).toBe(75)
  })
  it('decimal amounts preserved', () => {
    const { sourceLegAmount, destLegAmount } = transferLegAmounts(1234.56, 'checking', 'savings')
    expect(sourceLegAmount).toBe(-1234.56)
    expect(destLegAmount).toBe(1234.56)
  })
  it('paying down a liability: destination leg is negative (reduces amount owed)', () => {
    const { sourceLegAmount, destLegAmount } = transferLegAmounts(500, 'savings', 'liability')
    expect(sourceLegAmount).toBe(-500)
    expect(destLegAmount).toBe(-500)
  })
  it('drawing from a liability: source leg is positive (increases amount owed)', () => {
    const { sourceLegAmount, destLegAmount } = transferLegAmounts(500, 'liability', 'checking')
    expect(sourceLegAmount).toBe(500)
    expect(destLegAmount).toBe(500)
  })
  it('transfer between two liabilities: source (drawn from) goes up, destination (paid down) goes down', () => {
    const { sourceLegAmount, destLegAmount } = transferLegAmounts(200, 'liability', 'liability')
    expect(sourceLegAmount).toBe(200)
    expect(destLegAmount).toBe(-200)
  })
})

describe('ccMirrorAmount', () => {
  it('returns positive for a negative expense stored amount', () => {
    expect(ccMirrorAmount(-50)).toBe(50)
  })
  it('returns positive unchanged for positive input', () => {
    expect(ccMirrorAmount(30)).toBe(30)
  })
  it('works with zero', () => {
    expect(ccMirrorAmount(0)).toBe(0)
  })
})
